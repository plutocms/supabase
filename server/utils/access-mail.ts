import type { H3Event } from 'h3'
import type { serverSupabaseClient } from '#supabase/server'
import type { ServiceClient } from './service-client'
import { mapAccessError } from './access-errors'
import { INVITE_ACCEPT_PATH } from './access-invite'
import { emailInvalidError, isEmailInvalidError } from './sign-in-link'

type UserClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

/** The link types that the accept-invite page can verify. */
export type AcceptLinkType = 'invite' | 'magiclink' | 'signup'

const ACCEPT_LINK_TYPES: readonly string[] = ['invite', 'magiclink', 'signup']

function inviteFailed() {
  return createPlutoError({
    statusCode: 502,
    message: 'The invite email could not be sent.',
    key: 'supabase.access.errors.inviteFailed',
  })
}

/** Finds the id of the account with this email, or null. */
export async function findUserIdByEmail(
  client: UserClient,
  email: string
): Promise<string | null> {
  const { data, error } = await client.rpc('find_user_id_by_email', {
    p_email: email,
  })

  if (error) {
    throw mapAccessError(error)
  }

  return data ?? null
}

/** Adds roles to a user. It keeps the roles the user has. */
export async function addRoles(
  client: UserClient,
  target: string,
  roleKeys: string[]
): Promise<void> {
  const { error } = await client.rpc('add_user_roles', {
    target,
    role_keys: roleKeys,
  })

  if (error) {
    throw mapAccessError(error)
  }
}

/**
 * The URL that the user opens to accept an invite. The accept-invite page
 * reads `token_hash` and `type`, then calls `verifyOtp`.
 */
export function acceptInviteUrl(
  origin: string,
  hashedToken: string,
  type: AcceptLinkType
): string {
  const url = new URL(INVITE_ACCEPT_PATH, origin)

  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)

  return url.href
}

interface GenerateLinkParams {
  email: string
  type: 'invite' | 'magiclink'
  redirectTo: string
  origin: string
  displayName?: string
}

type GeneratedLink =
  { kind: 'link'; userId: string; link: string } | { kind: 'exists' }

/**
 * Makes a one-time link with the service role key. GoTrue sends no email and
 * skips the email rate limit. An `invite` link creates the user when the
 * email has no account.
 *
 * GoTrue says which type the link has (`verification_type`). The link uses
 * that type when the accept-invite page knows it, else the asked type.
 */
export async function generateAcceptLink(
  service: ServiceClient,
  params: GenerateLinkParams
): Promise<GeneratedLink> {
  const options = { redirectTo: params.redirectTo }
  const { data, error } =
    params.type === 'invite'
      ? await service.auth.admin.generateLink({
          type: 'invite',
          email: params.email,
          options: {
            ...options,
            data: params.displayName
              ? { display_name: params.displayName }
              : {},
          },
        })
      : await service.auth.admin.generateLink({
          type: 'magiclink',
          email: params.email,
          options,
        })

  if (error) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') {
      return { kind: 'exists' }
    }

    if (isEmailInvalidError(error)) {
      throw emailInvalidError()
    }

    console.error('invite: generateLink failed:', error.message)

    throw inviteFailed()
  }

  const hashedToken = data?.properties?.hashed_token
  const userId = data?.user?.id

  if (!hashedToken || !userId) {
    console.error('invite: generateLink returned no token')

    throw inviteFailed()
  }

  const verification = String(data.properties.verification_type ?? '')
  const type = ACCEPT_LINK_TYPES.includes(verification)
    ? (verification as AcceptLinkType)
    : params.type

  return {
    kind: 'link',
    userId,
    link: acceptInviteUrl(params.origin, hashedToken, type),
  }
}

interface ProvisionParams {
  client: UserClient
  service: ServiceClient
  email: string
  roleKeys: string[]
  displayName?: string
  redirectTo: string
  origin: string
  /** Make a link for an email that has an account. Default: true. */
  linkForExisting?: boolean
}

export interface ProvisionResult {
  userId: string
  /** Null when the account existed and `linkForExisting` is false. */
  link: string | null
  /** True when this call made the account. False when it had one. */
  created: boolean
}

/** The error of a route that needs the service role key. */
export function serviceKeyRequiredError() {
  return createPlutoError({
    statusCode: 503,
    message: 'Set NUXT_SUPABASE_SECRET_KEY on the server to make invite links.',
    key: 'supabase.access.errors.serviceKeyRequired',
  })
}

/**
 * Grants the roles and makes a sign-in link, with no email. It needs the
 * service role key.
 *
 * - An email with an account (confirmed or not): the roles are added, and the
 *   link is a `magiclink`. The account is never deleted.
 * - A new email: the `invite` link creates the user, then the roles are set.
 *   If the roles fail, the new user is deleted.
 * - The account appears after the lookup (a race): the roles are added.
 */
export async function provisionAccess(
  params: ProvisionParams
): Promise<ProvisionResult> {
  const { client, service, email, roleKeys } = params
  const link = (type: 'invite' | 'magiclink') =>
    generateAcceptLink(service, { ...params, type })

  async function forExisting(userId: string): Promise<ProvisionResult> {
    await addRoles(client, userId, roleKeys)

    if (params.linkForExisting === false) {
      return { userId, link: null, created: false }
    }

    // A magic link signs in AS that account. A confirmed account has its own
    // password and needs no link, so the admin never gets one: this keeps an
    // admin from taking over a customer's or another admin's account. Only an
    // account that never confirmed (a pending invite, or a sign-up with no
    // confirmation) gets a link, because it cannot sign in without one.
    const { data: found, error: lookupError } =
      await service.auth.admin.getUserById(userId)

    if (lookupError || !found.user) {
      console.error('invite: getUserById failed for an existing account')

      throw inviteFailed()
    }

    if (found.user.email_confirmed_at) {
      return { userId, link: null, created: false }
    }

    const made = await link('magiclink')

    if (made.kind !== 'link') {
      throw inviteFailed()
    }

    return { userId, link: made.link, created: false }
  }

  const existingId = await findUserIdByEmail(client, email)

  if (existingId) {
    return forExisting(existingId)
  }

  const made = await link('invite')

  if (made.kind === 'exists') {
    const racedId = await findUserIdByEmail(client, email)

    if (!racedId) {
      throw inviteFailed()
    }

    return forExisting(racedId)
  }

  // The lookup found no account, so this call made it. Only this new account
  // may be deleted when the role write fails.
  const { error: setError } = await client.rpc('set_user_roles', {
    target: made.userId,
    role_keys: roleKeys,
  })

  if (setError) {
    const { error: undoError } = await service.auth.admin.deleteUser(
      made.userId
    )

    if (undoError) {
      console.error('invite: could not delete the new user:', undoError.message)
    }

    throw mapAccessError(setError)
  }

  return { userId: made.userId, link: made.link, created: true }
}

/** True when Pluto mail can send. A failed check counts as not ready. */
export async function plutoMailReady(): Promise<boolean> {
  try {
    return (await getPlutoMailStatus()).configured === true
  } catch {
    return false
  }
}

/** The site name for the email: the `website_title` setting, else the config name. */
export async function inviteSiteName(client: UserClient): Promise<string> {
  try {
    const { data } = await client
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'website_title')
      .maybeSingle()
    const title = data?.setting_value?.trim()

    if (title) {
      return title
    }
  } catch {
    // The setting is not readable. Use the config name below.
  }

  return String(useRuntimeConfig().public.websiteName ?? 'Pluto')
}

/** The labels of the roles, in the order of the keys. A key with no label stays as it is. */
async function roleLabels(
  client: UserClient,
  roleKeys: string[]
): Promise<string[]> {
  try {
    const { data } = await client.rpc('list_roles')
    const labels = new Map((data ?? []).map((role) => [role.key, role.label]))

    return roleKeys.map((key) => labels.get(key) || key)
  } catch {
    return roleKeys
  }
}

interface InviteMailParams {
  client: UserClient
  to: string
  link: string
  userId: string
  roleKeys: string[]
  inviterName?: string
  locale?: string
}

/**
 * Sends the invite email with Pluto mail. It returns false when the send
 * fails. The caller keeps the user and the roles, and gives the link to the
 * admin. The log holds the error code only: no recipient, link or key.
 */
export async function sendInviteMail(
  params: InviteMailParams
): Promise<boolean> {
  try {
    const [siteName, roles] = await Promise.all([
      inviteSiteName(params.client),
      roleLabels(params.client, params.roleKeys),
    ])
    const email = await renderPlutoEmail(
      'invite',
      { url: params.link, inviterName: params.inviterName, roles },
      { locale: params.locale, siteName }
    )

    await sendPlutoMail({
      to: params.to,
      ...email,
      idempotencyKey: `invite/${params.userId}/${globalThis.crypto.randomUUID()}`,
    })

    return true
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code

    console.error(
      'invite: the Pluto mail send failed:',
      typeof code === 'string' ? code : 'unknown'
    )

    return false
  }
}

/** The name of the admin who invites, for the email. Empty when unknown. */
export function inviterNameOf(user: {
  user_metadata?: Record<string, unknown> | null
}): string | undefined {
  const meta = user.user_metadata ?? {}

  for (const value of [meta.display_name, meta.full_name, meta.name]) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return undefined
}

/**
 * Checks the optional email language against the admin languages. Throws a
 * 400 for a language the admin does not have.
 */
export function assertInviteLocale(
  event: H3Event,
  locale: string | undefined
): void {
  if (locale === undefined) {
    return
  }

  const adminLocales =
    useRuntimeConfig(event).public.plutoI18n?.adminLocales ?? []

  if (!adminLocales.includes(locale)) {
    throw createPlutoError({
      statusCode: 400,
      message: 'This language is not supported.',
      key: 'supabase.errors.localeUnsupported',
    })
  }
}
