// Turns a Supabase auth error into text for the admin. This file does not use
// Nuxt auto-imports, so plain Vitest can import it.

/** The translation key of each Supabase auth error code that the admin knows. */
export const AUTH_ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'supabase.auth.errors.invalid_credentials',
  email_not_confirmed: 'supabase.auth.errors.email_not_confirmed',
  over_request_rate_limit: 'supabase.auth.errors.over_request_rate_limit',
  over_email_send_rate_limit: 'supabase.auth.errors.over_email_send_rate_limit',
  weak_password: 'supabase.auth.errors.weak_password',
  same_password: 'supabase.auth.errors.same_password',
  user_not_found: 'supabase.auth.errors.user_not_found',
  email_exists: 'supabase.auth.errors.email_exists',
  user_already_exists: 'supabase.auth.errors.user_already_exists',
  signup_disabled: 'supabase.auth.errors.signup_disabled',
  email_address_invalid: 'supabase.auth.errors.email_address_invalid',
}

/** The key for errors with no code, no message, or an unknown shape. */
export const AUTH_UNKNOWN_ERROR_KEY = 'supabase.auth.errors.unknown'

/** Returns the translation key of an auth error code, or `undefined`. */
export function authErrorKey(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code

  return typeof code === 'string' && Object.hasOwn(AUTH_ERROR_KEYS, code)
    ? AUTH_ERROR_KEYS[code]
    : undefined
}

/**
 * Returns the text of an auth error. The order is:
 *
 * 1. The translated text of a known `error.code`.
 * 2. The raw `error.message`.
 * 3. The translated unknown-error text.
 */
export function resolveAuthErrorText(
  error: unknown,
  i18n: { t: (key: string) => string, te: (key: string) => boolean }
): string {
  const key = authErrorKey(error)

  if (key && i18n.te(key)) {
    return i18n.t(key)
  }

  const message = (error as { message?: unknown } | null | undefined)?.message

  return typeof message === 'string' && message.trim() !== ''
    ? message
    : i18n.t(AUTH_UNKNOWN_ERROR_KEY)
}
