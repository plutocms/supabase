import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../../utils/access-errors'
import {
  inviteBodySchema,
  inviteRedirectUrl,
  isEmailExistsError,
} from '../../../../../utils/access-invite'
import {
  addRoles,
  assertInviteLocale,
  findUserIdByEmail,
  inviterNameOf,
  plutoMailReady,
  provisionAccess,
  sendInviteMail,
} from '../../../../../utils/access-mail'
import { requireAdminRole } from '../../../../../utils/admin-role-guard'
import { enforceInviteRateLimit } from '../../../../../utils/rate-limit'
import { optionalServiceClient } from '../../../../../utils/service-client'
import {
  emailInvalidError,
  emailNotAuthorizedError,
  emailRateLimitError,
  isEmailInvalidError,
  isEmailNotAuthorizedError,
  isEmailRateLimitError,
  sendSignInLink,
  signInLinkError,
} from '../../../../../utils/sign-in-link'
import { parseBody } from '../../../../../utils/validate'

/**
 * Invites a user by email and grants the roles.
 *
 * - An email that has an account (confirmed or not): the roles are added.
 *   No email is sent. The account is never deleted.
 * - A new email, with the service role key and Pluto mail set up: GoTrue
 *   makes the user and a one-time link (no email). The roles are set at
 *   once. Pluto mail sends the invite email. If the send fails, the user
 *   and the roles stay, and the answer holds the link (`emailSent: false`).
 * - A new email, with the service role key and no Pluto mail: GoTrue creates
 *   the user and sends the invite email. The roles are set at once. If the roles fail,
 *   the new user is deleted.
 * - A new email, without the key: a sign-in link with the anon key creates
 *   the user and sends the email (the sign-up or magic link template). The
 *   roles are set at once. If the roles fail, the account stays with no
 *   role (the same as a sign-up), because only the key can delete a user.
 *
 * The role writes use the session of the caller (`auth.uid()` is the
 * admin). Only the invite call uses the service role key.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireAdminRole(event)

  enforceInviteRateLimit(caller.sub)

  const { email, roleKeys, displayName, locale } = await parseBody(
    event,
    inviteBodySchema
  )

  assertInviteLocale(event, locale)

  const service = optionalServiceClient(event)
  const client = await serverSupabaseClient<Database>(event)
  const { origin } = getRequestURL(event)
  const redirectTo = inviteRedirectUrl(origin)

  // The key and a working mail driver: Pluto sends the email, not Supabase.
  if (service && (await plutoMailReady())) {
    const result = await provisionAccess({
      client,
      service,
      email,
      roleKeys,
      displayName,
      redirectTo,
      origin,
      linkForExisting: false,
    })

    // An account that exists only gets the roles, and no email.
    if (!result.created || !result.link) {
      return { status: 'granted' as const }
    }

    const sent = await sendInviteMail({
      client,
      to: email,
      link: result.link,
      userId: result.userId,
      roleKeys,
      inviterName: inviterNameOf(caller),
      locale,
    })

    return sent
      ? { status: 'invited' as const, emailSent: true }
      : { status: 'invited' as const, emailSent: false, link: result.link }
  }

  // Look the email up first. An account that exists (confirmed or not) gets
  // the roles added, and no email. The undo below must never delete it: an
  // unconfirmed account can be a customer who did not confirm yet.
  const existingId = await findUserIdByEmail(client, email)

  if (existingId) {
    await addRoles(client, existingId, roleKeys)
    return { status: 'granted' as const }
  }

  if (!service) {
    const { error: linkError } = await sendSignInLink(event, email, {
      redirectTo,
      displayName,
      createUser: true,
    })

    if (linkError) {
      throw signInLinkError(linkError)
    }

    const linkedId = await findUserIdByEmail(client, email)

    if (!linkedId) {
      console.error(
        'invite: the sign-in link was sent, but no account has this email'
      )

      throw createPlutoError({
        statusCode: 502,
        message: 'The invite email could not be sent.',
        key: 'supabase.access.errors.inviteFailed',
      })
    }

    // An account can appear between the lookup and the link (a race). Adding
    // keeps its roles; for a new account it is the same as setting them.
    await addRoles(client, linkedId, roleKeys)
    return { status: 'invited' as const }
  }

  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: displayName ? { display_name: displayName } : {},
  })

  if (error) {
    if (isEmailNotAuthorizedError(error)) {
      throw emailNotAuthorizedError()
    }

    if (isEmailRateLimitError(error)) {
      throw emailRateLimitError()
    }

    if (isEmailInvalidError(error)) {
      throw emailInvalidError()
    }

    if (!isEmailExistsError(error)) {
      console.error('invite: inviteUserByEmail failed:', error.message)

      throw createPlutoError({
        statusCode: 502,
        message: 'The invite email could not be sent.',
        key: 'supabase.access.errors.inviteFailed',
      })
    }

    // The account appeared after the lookup above (a race). Add the roles.
    const racedId = await findUserIdByEmail(client, email)

    if (!racedId) {
      throw createPlutoError({
        statusCode: 502,
        message: 'The invite email could not be sent.',
        key: 'supabase.access.errors.inviteFailed',
      })
    }

    await addRoles(client, racedId, roleKeys)
    return { status: 'granted' as const }
  }

  // The lookup found no account, so GoTrue created this one now. Only this
  // new account may be deleted when the role write fails.
  const newId = data.user.id
  const { error: setError } = await client.rpc('set_user_roles', {
    target: newId,
    role_keys: roleKeys,
  })

  if (setError) {
    // Undo the invite, so a failed role write leaves no staff-less account.
    const { error: undoError } = await service.auth.admin.deleteUser(newId)

    if (undoError) {
      console.error('invite: could not delete the new user:', undoError.message)
    }

    throw mapAccessError(setError)
  }

  return { status: 'invited' as const }
})
