/** A staff user, as `GET /api/access/users` returns it (`list_staff_users`). */
export interface AccessUser {
  id: string
  email: string | null
  display_name: string | null
  username: string | null
  /** The `profiles.is_admin` flag. */
  is_admin: boolean
  /** The role keys of the user. */
  roles: string[]
  invited_at: string | null
  /** Empty until the user accepts the invite. */
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

/** A role, as `GET /api/access/roles` returns it (`list_roles`). */
export interface AccessRole {
  key: string
  label: string
  description: string
  is_builtin: boolean
  capabilities: string[]
  user_count: number
}

/** The answer of `GET /api/access/capabilities`. */
export interface AccessCapabilities {
  /** True when the service role key is set on the server. */
  serviceKey: boolean
  mail: { configured: boolean }
}

/** The answer of `POST /api/access/users/invite`. */
export interface AccessInviteResult {
  status: 'invited' | 'granted'
  /** Present on the Pluto mail path. False when the send failed. */
  emailSent?: boolean
  /** Present when `emailSent` is false. */
  link?: string
}
