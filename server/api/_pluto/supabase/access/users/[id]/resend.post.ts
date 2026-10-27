import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../../../utils/access-errors'
import { inviteRedirectUrl, isEmailExistsError, requireUserId, resendBodySchema } from '../../../../../../utils/access-invite'
import {
  assertInviteLocale,
  generateAcceptLink,
  inviterNameOf,
  plutoMailReady,
  sendInviteMail,
} from '../../../../../../utils/access-mail'
import { requireAdminRole } from '../../../../../../utils/admin-role-guard'
import { enforceInviteRateLimit } from '../../../../../../utils/rate-limit'
import { optionalServiceClient } from '../../../../../../utils/service-client'
import {
  emailInvalidError,
  emailNotAuthorizedError,
  emailRateLimitError,
  isEmailInvalidError,
  isEmailNotAuthorizedError,
  isEmailRateLimitError,
  sendSignInLink,
  signInLinkError,
} from '../../../../../../utils/sign-in-link'
import { parseBody } from '../../../../../../utils/validate'

function notFound() {
  return createPlutoError({
    statusCode: 404,
    message: 'This user does not exist.',
    key: 'supabase.access.errors.userNotFound',
  })
}

function alreadyAccepted() {
  return createPlutoError({
    statusCode: 409,
    message: 'This user already accepted the invite.',
    key: 'supabase.access.errors.alreadyAccepted',
  })
}

/**
 * Sends the invite email again. It works only for a user who has not
 * accepted the invite yet (`email_confirmed_at` is empty).
 *
 * With the service role key and Pluto mail set up, GoTrue makes a one-time
 * link and Pluto mail sends the email. If the send fails, the answer holds
 * the link (`emailSent: false`). With the key and no Pluto mail, GoTrue
 * sends the invite email. Without the key it
 * reads the user from `list_staff_users` (an invited user has a role) and
 * sends a sign-in link that never creates an account.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireAdminRole(event)

  enforceInviteRateLimit(caller.sub)

  const id = requireUserId(event.context.params?.id)
  const locale = (await parseBody(event, resendBodySchema))?.locale

  assertInviteLocale(event, locale)

  const { origin } = getRequestURL(event)
  const redirectTo = inviteRedirectUrl(origin)
  const service = optionalServiceClient(event)

  if (!service) {
    const client = await serverSupabaseClient<Database>(event)
    const { data: staff, error } = await client.rpc('list_staff_users')

    if (error) {
      throw mapAccessError(error)
    }

    const target = staff?.find((row) => row.id === id)

    if (!target?.email) {
      throw notFound()
    }

    if (target.email_confirmed_at) {
      throw alreadyAccepted()
    }

    const { error: linkError } = await sendSignInLink(event, target.email, {
      redirectTo,
      createUser: false,
    })

    if (linkError) {
      throw signInLinkError(linkError)
    }

    return { status: 'sent' as const }
  }

  const { data, error } = await service.auth.admin.getUserById(id)

  if (error || !data.user) {
    throw notFound()
  }

  const { email, email_confirmed_at: confirmedAt } = data.user

  if (confirmedAt || !email) {
    throw alreadyAccepted()
  }

  if (await plutoMailReady()) {
    const client = await serverSupabaseClient<Database>(event)
    const made = await generateAcceptLink(service, {
      email,
      type: 'invite',
      redirectTo,
      origin,
    })

    // A pending user cannot be "already registered" for an invite. It means
    // the user accepted the invite in the meantime.
    if (made.kind !== 'link') {
      throw alreadyAccepted()
    }

    const { data: staff } = await client.rpc('list_staff_users')
    const roleKeys = Array.isArray(staff) ? (staff.find((row) => row.id === id)?.roles ?? []) : []
    const sent = await sendInviteMail({
      client,
      to: email,
      link: made.link,
      userId: id,
      roleKeys,
      inviterName: inviterNameOf(caller),
      locale,
    })

    return sent
      ? { status: 'sent' as const, emailSent: true }
      : { status: 'sent' as const, emailSent: false, link: made.link }
  }

  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (inviteError) {
    if (isEmailExistsError(inviteError)) {
      throw alreadyAccepted()
    }

    if (isEmailNotAuthorizedError(inviteError)) {
      throw emailNotAuthorizedError()
    }

    if (isEmailRateLimitError(inviteError)) {
      throw emailRateLimitError()
    }

    if (isEmailInvalidError(inviteError)) {
      throw emailInvalidError()
    }

    console.error('resend: inviteUserByEmail failed:', inviteError.message)

    throw createPlutoError({
      statusCode: 502,
      message: 'The invite email could not be sent.',
      key: 'supabase.access.errors.inviteFailed',
    })
  }

  return { status: 'sent' as const }
})
