import { z } from 'zod'

/** The page where an invited user sets a password. */
export const INVITE_ACCEPT_PATH = '/admin/accept-invite'

/** Role and capability keys: lower-case letters, digits and an underscore. */
export const ROLE_KEY_PATTERN = /^[a-z0-9_]+$/

export const inviteBodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  roleKeys: z.array(z.string().regex(ROLE_KEY_PATTERN)).min(1).max(20),
  displayName: z.string().trim().max(200).optional(),
  /** The language of the invite email. Checked against the admin languages. */
  locale: z.string().trim().min(1).max(35).optional(),
})

/** The body of the resend route. It is optional. */
export const resendBodySchema = z
  .object({
    locale: z.string().trim().min(1).max(35).optional(),
  })
  .nullish()

export const rolesBodySchema = z.object({
  roleKeys: z.array(z.string().regex(ROLE_KEY_PATTERN)).max(20),
})

export const roleBodySchema = z.object({
  label: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  capabilities: z
    .array(z.string().regex(/^[a-z0-9_]+:[a-z0-9_]+$/))
    .min(1)
    .max(200),
})

export const createRoleBodySchema = roleBodySchema.extend({
  key: z.string().regex(ROLE_KEY_PATTERN).max(50),
})

/** The link target of the invite email, on the origin of this request. */
export function inviteRedirectUrl(origin: string): string {
  return new URL(INVITE_ACCEPT_PATH, origin).href
}

/** True when GoTrue says that an account with this email already exists. */
export function isEmailExistsError(
  error: { code?: string, status?: number } | null | undefined
): boolean {
  return error?.code === 'email_exists' || error?.code === 'user_already_exists'
}

/** Reads a user id from a route param. Throws a 400 when it is not a UUID. */
export function requireUserId(value: unknown): string {
  const parsed = z.uuid().safeParse(value)

  if (!parsed.success) {
    throw createPlutoError({
      statusCode: 400,
      message: 'The user id is not valid.',
      key: 'supabase.access.errors.invalidUserId',
    })
  }

  return parsed.data
}
