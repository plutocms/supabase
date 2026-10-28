import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

interface SignInLinkOptions {
  redirectTo: string
  displayName?: string
  /** Create the account when the email has none. */
  createUser: boolean
}

/**
 * Sends a passwordless sign-in link with the anon key. The invite routes use
 * it when the service role key is not set, so an invite needs no setup.
 *
 * - A new client per call, with no session storage, so the admin's own
 *   session is never touched.
 * - The implicit flow: the link comes back with the tokens in the URL hash.
 *   The PKCE flow cannot work here, because its code verifier would stay in
 *   this server-side client. The accept-invite page reads the hash.
 * - With `createUser`, GoTrue creates the account (public sign-up must be
 *   on). The trigger makes the profile from `display_name`.
 */
export async function sendSignInLink(
  event: H3Event,
  email: string,
  options: SignInLinkOptions
) {
  const { url, key } = useRuntimeConfig(event).public.supabase
  const client = createClient(url, key, {
    auth: {
      flowType: 'implicit',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.createUser,
      emailRedirectTo: options.redirectTo,
      data: options.displayName
        ? { display_name: options.displayName }
        : undefined,
    },
  })

  return { error }
}

/**
 * True when Supabase's built-in mailer refuses the address. Without custom
 * SMTP, Supabase sends auth emails only to members of the project's
 * organization.
 */
export function isEmailNotAuthorizedError(
  error: { code?: string } | null | undefined
): boolean {
  return error?.code === 'email_address_not_authorized'
}

export function emailNotAuthorizedError() {
  return createPlutoError({
    statusCode: 400,
    message:
      "Supabase's built-in email sends only to members of your Supabase organization. Set up custom SMTP in Supabase to invite other addresses.",
    key: 'supabase.access.errors.emailNotAuthorized',
  })
}

/**
 * True when Supabase refuses to send more auth emails: one per address each
 * 60 seconds, and a few per hour for the project with the built-in mailer.
 * This is not the in-memory limit of `rate-limit.ts`.
 */
export function isEmailRateLimitError(
  error: { code?: string; status?: number } | null | undefined
): boolean {
  return error?.status === 429 || error?.code === 'over_email_send_rate_limit'
}

export function emailRateLimitError() {
  return createPlutoError({
    statusCode: 429,
    message:
      'Supabase sent too many emails. Wait a minute for the same address, or up to an hour with the built-in mailer. Custom SMTP in Supabase raises this limit.',
    key: 'supabase.access.errors.emailRateLimited',
  })
}

/**
 * True when Supabase refuses the address itself, for example an example or
 * test domain (`example.com`), or an address it cannot deliver to.
 */
export function isEmailInvalidError(
  error: { code?: string } | null | undefined
): boolean {
  return error?.code === 'email_address_invalid'
}

export function emailInvalidError() {
  return createPlutoError({
    statusCode: 400,
    message:
      'Supabase does not accept this email address. Use a real address: Supabase refuses example and test domains.',
    key: 'supabase.access.errors.emailInvalid',
  })
}

/** Maps a GoTrue error of `signInWithOtp` to a Pluto error. */
export function signInLinkError(error: {
  code?: string
  status?: number
  message: string
}) {
  if (isEmailNotAuthorizedError(error)) {
    return emailNotAuthorizedError()
  }

  if (isEmailInvalidError(error)) {
    return emailInvalidError()
  }

  if (isEmailRateLimitError(error)) {
    return emailRateLimitError()
  }

  if (error.code === 'signup_disabled' || error.code === 'otp_disabled') {
    return createPlutoError({
      statusCode: 503,
      message:
        'Public sign-up is off. Set NUXT_SUPABASE_SECRET_KEY on the server to send invites.',
      key: 'supabase.access.errors.signupDisabled',
    })
  }

  console.error('invite: signInWithOtp failed:', error.message)

  return createPlutoError({
    statusCode: 502,
    message: 'The invite email could not be sent.',
    key: 'supabase.access.errors.inviteFailed',
  })
}
