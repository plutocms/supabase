// Pure helpers of the Users and Roles pages. This file does not use Nuxt
// auto-imports, so plain Vitest can import it.
import type { AccessRole, AccessUser } from '../../shared/types/access'

/** The role key of the administrator. It cannot be edited or removed. */
export const ADMIN_ROLE_KEY = 'admin'

/** The role key pattern of the access API. */
export const ROLE_KEY_PATTERN = /^[a-z0-9_]+$/

/** The longest role key the API accepts. */
export const ROLE_KEY_MAX = 50

/**
 * Makes a role key from a label: lower case, a-z and 0-9, words joined by an
 * underscore, accents removed. Returns an empty string when nothing is left.
 */
export function slugifyRoleKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, ROLE_KEY_MAX)
    .replace(/_+$/g, '')
}

export function isValidRoleKey(key: string): boolean {
  return (
    key.length > 0 && key.length <= ROLE_KEY_MAX && ROLE_KEY_PATTERN.test(key)
  )
}

/** `invited` until the user accepts the invite, then `active`. */
export function userStatus(
  user: Pick<AccessUser, 'email_confirmed_at'>
): 'active' | 'invited' {
  return user.email_confirmed_at ? 'active' : 'invited'
}

/**
 * True when the user is an administrator. The `admin` role or the profile flag
 * counts, the same as `public.is_admin()`.
 */
export function isAdminUser(
  user: Pick<AccessUser, 'is_admin' | 'roles'>
): boolean {
  return user.is_admin || user.roles.includes(ADMIN_ROLE_KEY)
}

/** The name to show for a user: the display name, the username, else the email. */
export function userDisplayName(
  user: Pick<AccessUser, 'display_name' | 'username' | 'email'>
): string {
  return (
    user.display_name?.trim() ||
    user.username?.trim() ||
    user.email?.trim() ||
    ''
  )
}

/** Looks a role label up by key. A key with no role stays as it is. */
export function roleLabelOf(roles: AccessRole[], key: string): string {
  return roles.find((role) => role.key === key)?.label ?? key
}

/** The two lists hold the same keys, in any order. */
export function sameKeys(a: string[], b: string[]): boolean {
  const left = [...a].toSorted()
  const right = [...b].toSorted()

  return (
    left.length === right.length &&
    left.every((key, index) => key === right[index])
  )
}

/**
 * The error `i18n` key that the server sent (`createPlutoError`), or
 * undefined. An `ofetch` error holds the body in `data`.
 */
export function errorKeyOf(error: unknown): string | undefined {
  const body = (
    error as { data?: { data?: { i18n?: { key?: unknown } } } } | null
  )?.data
  const key = body?.data?.i18n?.key

  return typeof key === 'string' ? key : undefined
}

/**
 * The keys of the invite errors that come from the mailer. The invite modal
 * shows the cause, and offers a link to copy or the email setup.
 */
export const INVITE_MAIL_ERROR_KEYS = [
  'supabase.access.errors.emailNotAuthorized',
  'supabase.access.errors.emailRateLimited',
  'supabase.access.errors.emailInvalid',
] as const

export function isInviteMailError(error: unknown): boolean {
  const key = errorKeyOf(error)

  return (
    key !== undefined &&
    (INVITE_MAIL_ERROR_KEYS as readonly string[]).includes(key)
  )
}

/** The name of a language in that language, for example `Português (Brasil)`. */
export function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code)

    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code
  } catch {
    return code
  }
}
