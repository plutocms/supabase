// Pure helper of the accept-invite page. This file does not use Nuxt
// auto-imports, so plain Vitest can import it.

/** The link types that the page can verify. */
export type InviteOtpType = 'invite' | 'magiclink' | 'signup'

const OTP_TYPES: readonly string[] = ['invite', 'magiclink', 'signup']

/**
 * What an invite link holds.
 *
 * - `otp`: `?token_hash=...&type=invite`. It comes from the custom invite
 *   email template, or from the link that the admin copies or Pluto mail
 *   sends. The type is `invite`, or `magiclink` for an account that
 *   exists (`signup` for an account that did not confirm). The page calls
 *   `verifyOtp` with that type.
 * - `session`: `#access_token=...&refresh_token=...`. It comes from the
 *   default invite email (the implicit flow). The page calls `setSession`.
 * - `error`: `#error_code=otp_expired`. GoTrue could not accept the link.
 * - `none`: the link holds nothing. The page then looks for a session.
 */
export type InviteLink =
  | { kind: 'otp', tokenHash: string, type: InviteOtpType }
  | { kind: 'session', accessToken: string, refreshToken: string }
  | { kind: 'error', code: string, description?: string }
  | { kind: 'none' }

type QueryValue = string | null | undefined | Array<string | null>

function first(value: QueryValue): string | undefined {
  const item = Array.isArray(value) ? value[0] : value

  return typeof item === 'string' && item !== '' ? item : undefined
}

/**
 * Reads an invite link. `query` is the route query. `hash` is the URL hash,
 * with or without the leading `#`. The query wins over the hash.
 */
export function parseInviteLink(
  query: Record<string, QueryValue> | null | undefined,
  hash: string | null | undefined
): InviteLink {
  const fragment = new URLSearchParams((hash ?? '').replace(/^#/, ''))
  const q = query ?? {}

  const tokenHash = first(q.token_hash)
  const type = first(q.type)
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    return { kind: 'otp', tokenHash, type: type as InviteOtpType }
  }

  const accessToken = fragment.get('access_token')
  const refreshToken = fragment.get('refresh_token')
  if (accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken }
  }

  const code = fragment.get('error_code') ?? first(q.error_code)
  if (code) {
    return {
      kind: 'error',
      code,
      description:
        fragment.get('error_description') ?? first(q.error_description),
    }
  }

  return { kind: 'none' }
}
