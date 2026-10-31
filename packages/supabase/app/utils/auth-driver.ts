// Pure helpers of the supabase auth driver. This file does not use Nuxt
// auto-imports, so plain Vitest can import it. The `PlutoAuth*` types are
// global types of the pluto layer.
/**
 * The fields of a Supabase user that the driver reads. It fits the JWT claims
 * (`sub`, `email`, `user_metadata`) and a `User` object (`id`).
 */
export interface SupabaseIdentity {
  sub?: string
  id?: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

/**
 * Maps a Supabase user to the user of the admin shell. The name follows the
 * order of the old navbar: display_name, full_name, name. In the JWT claims,
 * the user id is `sub`. Returns null when there is no id.
 */
export function mapSupabaseUser(
  source: SupabaseIdentity | null | undefined
): PlutoAuthUser | null {
  const id = text(source?.sub) ?? text(source?.id)

  if (!source || !id) {
    return null
  }

  const meta = source.user_metadata ?? {}

  return {
    id,
    name: text(meta.display_name) ?? text(meta.full_name) ?? text(meta.name),
    username: text(meta.username),
    email: text(source.email),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  }
}

/**
 * The admin paths that a signed-out visitor may open, with what happens to a
 * signed-in user. `/admin/login` is always public in core.
 *
 * - `signup` and `forgot-password` send a signed-in user to the admin home.
 * - `confirm` and `update-password` stay open: a recovery or confirm link
 *   signs the user in, and the page must still show.
 * - `accept-invite` stays open: an invite link signs the user in, and the page
 *   must still show the password form.
 * - `setup` stays open for the auth guard. The setup guard
 *   (`guard` in `pluto-extension.ts`) blocks it when the setup is done.
 */
export const SUPABASE_PUBLIC_PATHS: PlutoAuthPublicPath[] = [
  { path: '/admin/signup', signedIn: 'redirect' },
  { path: '/admin/forgot-password', signedIn: 'redirect' },
  { path: '/admin/confirm', signedIn: 'allow' },
  { path: '/admin/update-password', signedIn: 'allow' },
  { path: '/admin/accept-invite', signedIn: 'allow' },
  { path: '/admin/setup', signedIn: 'allow' },
]

/** The page that opens after a sign-in with no (safe) redirect. */
export const SUPABASE_SIGN_IN_FALLBACK = '/admin/home'

/** The setup state that the setup guard reads from `/api/_pluto/supabase/setup`. */
export type SetupState = 'pending' | 'done' | 'unknown'

/**
 * Reads the answer of `/api/_pluto/supabase/setup`. A failed call, or a
 * response with no `is_first_setup` flag, is `unknown`.
 */
export function setupStateFromResponse(data: unknown): SetupState {
  const response = data as
    { success?: boolean; is_first_setup?: boolean } | null | undefined

  if (!response?.success) {
    return 'unknown'
  }

  return response.is_first_setup ? 'pending' : 'done'
}

/**
 * Decides the setup redirect for an admin path. It gives a path to open, or
 * undefined to go on.
 *
 * - `pending` and `unknown` (the state cannot be read): only the setup page
 *   is open. Every other admin path goes to `/admin/setup`.
 * - `done`: the setup page is closed, and goes to the sign-in page.
 *
 * Keep the `done` redirect, even after layer migrations move to
 * /admin/migrations. The setup page prompts an unauthenticated visitor for a
 * raw database connection string, and it is safe only because it is
 * unreachable once setup is done. Reopening it for a routine layer addition
 * would let an anonymous visitor submit a connection string to the server.
 */
export function setupRedirect(
  path: string,
  state: SetupState
): string | undefined {
  if (state === 'done') {
    return path === '/admin/setup' ? '/admin/login' : undefined
  }

  return path === '/admin/setup' ? undefined : '/admin/setup'
}
