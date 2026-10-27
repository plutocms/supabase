import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

// The routes use Nitro auto-imports and `#supabase/server`. None of them
// exist outside a Nuxt build, so each is stubbed here, in the style of
// guards.test.ts.
interface RpcResult {
  data: unknown
  error: { code?: string, message: string } | null
}

// The sign-in link (the invite path without the service key).
let otpCalls: Array<{ url: string, key: string, auth: unknown, args: unknown }>
let otpResult: { error: { code?: string, status?: number, message: string } | null }

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: { auth: unknown }) => ({
    auth: {
      signInWithOtp: async (args: unknown) => {
        otpCalls.push({ url, key, auth: options.auth, args })

        return otpResult
      },
    },
  }),
}))

let user: { sub: string } | null
let rpcResults: Record<string, RpcResult>
// Results used in order before `rpcResults`, for a function called twice.
let rpcQueue: Record<string, RpcResult[]>
let rpcCalls: Array<{ name: string, args: unknown }>
let serviceKeyMissing: boolean
let inviteResult: { data: { user: { id: string } } | null, error: { code?: string, message: string } | null }
let getUserResult: { data: { user: { email: string | null, email_confirmed_at: string | null } | null }, error: null }
let inviteCalls: Array<{ email: string, options: unknown }>
let deleteCalls: string[]
// Pluto mail (a Nitro auto-import of @plutocms/pluto).
let mailConfigured: boolean
let mailSendError: { code: string } | null
let sentMail: Array<Record<string, unknown>>
let renderCalls: Array<{ name: string, data: unknown, options: unknown }>
let websiteTitle: string | null
// What generateLink answers.
let generateCalls: Array<{ type: string, email: string, options: unknown }>
let generateError: { code?: string, message: string } | null
// Errors used in order before `generateError` (null = success).
let generateQueue: Array<{ code?: string, message: string } | null>
let generateVerification: string
let body: unknown
let counter = 0

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => user,
  serverSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: websiteTitle === null ? null : { setting_value: websiteTitle },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })

      return rpcQueue[name]?.shift() ?? rpcResults[name] ?? { data: true, error: null }
    },
  }),
  serverSupabaseServiceRole: () => {
    if (serviceKeyMissing) {
      throw new Error('Missing server key.')
    }

    return {
      auth: {
        admin: {
          inviteUserByEmail: async (email: string, options: unknown) => {
            inviteCalls.push({ email, options })

            return inviteResult
          },
          deleteUser: async (id: string) => {
            deleteCalls.push(id)

            return { error: null }
          },
          getUserById: async () => getUserResult,
          generateLink: async (params: { type: string, email: string, options: unknown }) => {
            generateCalls.push(params)

            const failure = generateQueue.length > 0 ? generateQueue.shift()! : generateError

            if (failure) {
              return { data: null, error: failure }
            }

            return {
              data: {
                user: { id: params.type === 'invite' ? 'new-user' : 'old-user' },
                properties: {
                  hashed_token: 'hash-1',
                  verification_type: generateVerification || params.type,
                },
              },
              error: null,
            }
          },
        },
      },
    }
  },
}))

beforeEach(() => {
  // A new caller for each test, because the rate limiter keeps state.
  user = { sub: `admin-${counter++}` }
  // By default the invite email has no account.
  rpcResults = { find_user_id_by_email: { data: null, error: null } }
  rpcQueue = {}
  rpcCalls = []
  serviceKeyMissing = false
  inviteResult = { data: { user: { id: 'new-user' } }, error: null }
  getUserResult = {
    data: { user: { email: 'pending@example.com', email_confirmed_at: null } },
    error: null,
  }
  inviteCalls = []
  deleteCalls = []
  mailConfigured = false
  mailSendError = null
  sentMail = []
  renderCalls = []
  websiteTitle = null
  generateCalls = []
  generateError = null
  generateQueue = []
  generateVerification = ''
  body = { email: '  Ada@Example.com ', roleKeys: ['editor'], displayName: 'Ada' }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', (input: object) => input)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('getRequestURL', () => new URL('https://site.test/admin/users?x=1'))
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: {
      supabase: { url: 'https://project.supabase.test', key: 'anon-key' },
      plutoI18n: { adminLocales: ['en', 'pt-BR'] },
      websiteName: 'Config Site',
    },
  }))
  vi.stubGlobal('getPlutoMailStatus', async () => ({ configured: mailConfigured }))
  vi.stubGlobal('renderPlutoEmail', async (name: string, data: unknown, options: unknown) => {
    renderCalls.push({ name, data, options })

    return { subject: 'Subject', html: '<p>Hi</p>', text: 'Hi' }
  })
  vi.stubGlobal('sendPlutoMail', async (message: Record<string, unknown>) => {
    if (mailSendError) {
      throw Object.assign(new Error('provider text with a@b.test'), mailSendError)
    }

    sentMail.push(message)

    return { id: 'mail-1', driver: 'resend' }
  })
  otpCalls = []
  otpResult = { error: null }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// The route files call `defineEventHandler` when they load.
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

const { requireAdminRole } = await import('../server/utils/admin-role-guard')
const invite = (await import('../server/api/_pluto/supabase/access/users/invite.post')).default as (e: unknown) => Promise<unknown>
const resend = (await import('../server/api/_pluto/supabase/access/users/[id]/resend.post')).default as (e: unknown) => Promise<unknown>
const putRoles = (await import('../server/api/_pluto/supabase/access/users/[id]/roles.put')).default as (e: unknown) => Promise<unknown>
const delRoles = (await import('../server/api/_pluto/supabase/access/users/[id]/roles.delete')).default as (e: unknown) => Promise<unknown>
const createRole = (await import('../server/api/_pluto/supabase/access/roles.post')).default as (e: unknown) => Promise<unknown>
const inviteLink = (await import('../server/api/_pluto/supabase/access/users/invite-link.post')).default as (e: unknown) => Promise<unknown>
const capabilities = (await import('../server/api/_pluto/supabase/access/capabilities.get')).default as (e: unknown) => Promise<unknown>
const deleteRole = (await import('../server/api/_pluto/supabase/access/roles/[key].delete')).default as (e: unknown) => Promise<unknown>

const ID = '11111111-1111-4111-8111-111111111111'
const event = (params: Record<string, string> = {}) => ({ context: { params } }) as never

describe('requireAdminRole', () => {
  it('returns the user for an admin', async () => {
    const result = await requireAdminRole(event())

    expect(result).toEqual(user)
    expect(rpcCalls).toEqual([{ name: 'is_admin', args: undefined }])
  })

  it('answers 401 for a signed-out caller', async () => {
    user = null

    await expect(requireAdminRole(event())).rejects.toMatchObject({
      statusCode: 401,
      data: { i18n: { key: 'supabase.errors.notLoggedIn' } },
    })
  })

  it('answers 403 for a user who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(requireAdminRole(event())).rejects.toMatchObject({
      statusCode: 403,
      data: { i18n: { key: 'supabase.errors.notAdmin' } },
    })
  })

  it('answers 403 when the rpc fails', async () => {
    rpcResults.is_admin = { data: null, error: { message: 'boom' } }

    await expect(requireAdminRole(event())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('pOST /api/_pluto/supabase/access/users/invite', () => {
  it('makes no service call for a caller who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(invite(event())).rejects.toMatchObject({ statusCode: 403 })
    expect(inviteCalls).toEqual([])
    expect(deleteCalls).toEqual([])
  })

  it('sends a sign-in link with the anon key when the service key is missing', async () => {
    serviceKeyMissing = true
    // No account before the link; the link creates it.
    rpcQueue.find_user_id_by_email = [
      { data: null, error: null },
      { data: 'linked-user', error: null },
    ]

    await expect(invite(event())).resolves.toEqual({ status: 'invited' })

    expect(inviteCalls).toEqual([])
    expect(otpCalls).toEqual([
      {
        url: 'https://project.supabase.test',
        key: 'anon-key',
        auth: {
          flowType: 'implicit',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        args: {
          email: 'ada@example.com',
          options: {
            shouldCreateUser: true,
            emailRedirectTo: 'https://site.test/admin/accept-invite',
            data: { display_name: 'Ada' },
          },
        },
      },
    ])
    expect(rpcCalls.at(-1)).toEqual({
      name: 'add_user_roles',
      args: { target: 'linked-user', role_keys: ['editor'] },
    })
    expect(deleteCalls).toEqual([])
  })

  it('answers 503 without the service key when public sign-up is off', async () => {
    serviceKeyMissing = true
    otpResult = { error: { code: 'signup_disabled', status: 422, message: 'Signups not allowed' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 503,
      data: { i18n: { key: 'supabase.access.errors.signupDisabled' } },
    })
  })

  it('explains the built-in mailer limit without the service key', async () => {
    serviceKeyMissing = true
    otpResult = { error: { code: 'email_address_not_authorized', status: 400, message: 'not authorized' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.access.errors.emailNotAuthorized' } },
    })
  })

  it('explains an address Supabase refuses', async () => {
    serviceKeyMissing = true
    otpResult = { error: { code: 'email_address_invalid', status: 400, message: 'invalid' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.access.errors.emailInvalid' } },
    })
  })

  it('explains the built-in mailer limit with the service key', async () => {
    inviteResult = { data: null, error: { code: 'email_address_not_authorized', message: 'not authorized' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.access.errors.emailNotAuthorized' } },
    })
  })

  it('answers 429 without the service key when Supabase limits the emails', async () => {
    serviceKeyMissing = true
    otpResult = { error: { code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' } }

    // Supabase's limit has its own message, not the in-memory brake's.
    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 429,
      data: { i18n: { key: 'supabase.access.errors.emailRateLimited' } },
    })
  })

  it('answers 429 with the service key when Supabase limits the emails', async () => {
    inviteResult = { data: null, error: { code: 'over_email_send_rate_limit', message: 'rate limit' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 429,
      data: { i18n: { key: 'supabase.access.errors.emailRateLimited' } },
    })
  })

  it('rejects a body with no role', async () => {
    body = { email: 'a@example.com', roleKeys: [] }

    await expect(invite(event())).rejects.toMatchObject({ statusCode: 400 })
    expect(inviteCalls).toEqual([])
  })

  it('invites a new user, sets the roles and sends the redirect', async () => {
    await expect(invite(event())).resolves.toEqual({ status: 'invited' })

    expect(inviteCalls).toEqual([
      {
        email: 'ada@example.com',
        options: {
          redirectTo: 'https://site.test/admin/accept-invite',
          data: { display_name: 'Ada' },
        },
      },
    ])
    expect(rpcCalls.at(-1)).toEqual({
      name: 'set_user_roles',
      args: { target: 'new-user', role_keys: ['editor'] },
    })
    expect(deleteCalls).toEqual([])
  })

  it('grants the roles of an email that has an account, with no invite', async () => {
    // Confirmed or not: an unconfirmed account can be a customer.
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }

    await expect(invite(event())).resolves.toEqual({ status: 'granted' })

    expect(inviteCalls).toEqual([])
    expect(rpcCalls.map((call) => call.name)).toEqual([
      'is_admin',
      'find_user_id_by_email',
      'add_user_roles',
    ])
    expect(rpcCalls.at(-1)?.args).toEqual({
      target: 'old-user',
      role_keys: ['editor'],
    })
    expect(deleteCalls).toEqual([])
  })

  it('never deletes an account that exists when add_user_roles fails', async () => {
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }
    rpcResults.add_user_roles = {
      data: null,
      error: { code: 'P0001', message: 'pluto:unknown_role' },
    }

    await expect(invite(event())).rejects.toMatchObject({ statusCode: 400 })
    expect(inviteCalls).toEqual([])
    expect(deleteCalls).toEqual([])
  })

  it('grants the roles when the account appears after the lookup', async () => {
    rpcQueue.find_user_id_by_email = [
      { data: null, error: null },
      { data: 'raced-user', error: null },
    ]
    inviteResult = {
      data: null,
      error: { code: 'email_exists', message: 'already registered' },
    }

    await expect(invite(event())).resolves.toEqual({ status: 'granted' })
    expect(rpcCalls.at(-1)).toEqual({
      name: 'add_user_roles',
      args: { target: 'raced-user', role_keys: ['editor'] },
    })
    expect(deleteCalls).toEqual([])
  })

  it('answers 502 for another invite error', async () => {
    inviteResult = { data: null, error: { code: 'unexpected_failure', message: 'smtp' } }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 502,
      data: { i18n: { key: 'supabase.access.errors.inviteFailed' } },
    })
  })

  it('deletes the new user when set_user_roles fails', async () => {
    rpcResults.set_user_roles = {
      data: null,
      error: { code: 'P0001', message: 'pluto:unknown_role' },
    }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.access.errors.unknownRole' } },
    })
    expect(deleteCalls).toEqual(['new-user'])
  })

  it('limits a caller to 10 invites', async () => {
    for (let i = 0; i < 10; i++) {
      await invite(event())
    }

    await expect(invite(event())).rejects.toMatchObject({ statusCode: 429 })
  })
})

describe('pOST /api/_pluto/supabase/access/users/[id]/resend', () => {
  it('invites the same email again for a pending user', async () => {
    await expect(resend(event({ id: ID }))).resolves.toEqual({ status: 'sent' })

    expect(inviteCalls[0]).toMatchObject({ email: 'pending@example.com' })
  })

  it('refuses a user who accepted the invite', async () => {
    getUserResult = {
      data: { user: { email: 'a@example.com', email_confirmed_at: '2026-01-01' } },
      error: null,
    }

    await expect(resend(event({ id: ID }))).rejects.toMatchObject({ statusCode: 409 })
    expect(inviteCalls).toEqual([])
  })

  it('refuses an id that is not a UUID', async () => {
    await expect(resend(event({ id: 'nope' }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('sends a sign-in link that creates no account when the service key is missing', async () => {
    serviceKeyMissing = true
    rpcResults.list_staff_users = {
      data: [{ id: ID, email: 'pending@example.com', email_confirmed_at: null }],
      error: null,
    }

    await expect(resend(event({ id: ID }))).resolves.toEqual({ status: 'sent' })
    expect(otpCalls[0]?.args).toEqual({
      email: 'pending@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://site.test/admin/accept-invite',
        data: undefined,
      },
    })
  })

  it('refuses a confirmed user when the service key is missing', async () => {
    serviceKeyMissing = true
    rpcResults.list_staff_users = {
      data: [{ id: ID, email: 'a@example.com', email_confirmed_at: '2026-01-01' }],
      error: null,
    }

    await expect(resend(event({ id: ID }))).rejects.toMatchObject({ statusCode: 409 })
    expect(otpCalls).toEqual([])
  })

  it('makes no service call for a caller who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(resend(event({ id: ID }))).rejects.toMatchObject({ statusCode: 403 })
    expect(inviteCalls).toEqual([])
  })
})

describe('roles routes', () => {
  it('pUT users/[id]/roles replaces the roles', async () => {
    body = { roleKeys: ['editor', 'support'] }

    await putRoles(event({ id: ID }))

    expect(rpcCalls.at(-1)).toEqual({
      name: 'set_user_roles',
      args: { target: ID, role_keys: ['editor', 'support'] },
    })
  })

  it('dELETE users/[id]/roles sets an empty list', async () => {
    await delRoles(event({ id: ID }))

    expect(rpcCalls.at(-1)).toEqual({
      name: 'set_user_roles',
      args: { target: ID, role_keys: [] },
    })
  })

  it('maps the last admin error to 409', async () => {
    rpcResults.set_user_roles = {
      data: null,
      error: { code: 'P0001', message: 'pluto:last_admin' },
    }

    await expect(delRoles(event({ id: ID }))).rejects.toMatchObject({
      statusCode: 409,
      data: { i18n: { key: 'supabase.access.errors.lastAdmin' } },
    })
  })

  it('pOST roles creates a role', async () => {
    body = { key: 'editor', label: 'Editor', capabilities: ['settings:manage'] }

    await expect(createRole(event())).resolves.toEqual({ key: 'editor' })
    expect(rpcCalls.at(-1)).toEqual({
      name: 'create_role',
      args: {
        p_key: 'editor',
        p_label: 'Editor',
        p_description: '',
        p_capabilities: ['settings:manage'],
      },
    })
  })

  it('pOST roles refuses a body with the wildcard capability', async () => {
    body = { key: 'editor', label: 'Editor', capabilities: ['*'] }

    await expect(createRole(event())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('dELETE roles/[key] answers the number of users who lost the role', async () => {
    rpcResults.delete_role = { data: 3, error: null }

    await expect(deleteRole(event({ key: 'editor' }))).resolves.toEqual({
      key: 'editor',
      removedFromUsers: 3,
    })
  })

  it('a role route makes no write for a caller who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(deleteRole(event({ key: 'editor' }))).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(rpcCalls.map((call) => call.name)).toEqual(['is_admin'])
  })
})

describe('pOST /api/_pluto/supabase/access/users/invite with Pluto mail', () => {
  const LINK = 'https://site.test/admin/accept-invite?token_hash=hash-1&type=invite'

  beforeEach(() => {
    mailConfigured = true
    websiteTitle = 'Shop Title'
    rpcResults.list_roles = {
      data: [{ key: 'editor', label: 'Editor' }],
      error: null,
    }
    body = { email: 'ada@example.com', roleKeys: ['editor'], displayName: 'Ada', locale: 'pt-BR' }
    user = { sub: `admin-${counter++}`, user_metadata: { display_name: 'Grace' } } as never
  })

  it('makes the link, sets the roles and sends the Pluto email', async () => {
    await expect(invite(event())).resolves.toEqual({ status: 'invited', emailSent: true })

    // GoTrue sends nothing: generateLink, not inviteUserByEmail.
    expect(inviteCalls).toEqual([])
    expect(generateCalls).toEqual([
      {
        type: 'invite',
        email: 'ada@example.com',
        options: {
          redirectTo: 'https://site.test/admin/accept-invite',
          data: { display_name: 'Ada' },
        },
      },
    ])
    expect(rpcCalls.find((call) => call.name === 'set_user_roles')?.args).toEqual({
      target: 'new-user',
      role_keys: ['editor'],
    })
    expect(renderCalls).toEqual([
      {
        name: 'invite',
        data: { url: LINK, inviterName: 'Grace', roles: ['Editor'] },
        options: { locale: 'pt-BR', siteName: 'Shop Title' },
      },
    ])
    expect(sentMail).toHaveLength(1)
    expect(sentMail[0]).toMatchObject({
      to: 'ada@example.com',
      subject: 'Subject',
      html: '<p>Hi</p>',
      text: 'Hi',
    })
    expect(sentMail[0]!.idempotencyKey).toMatch(/^invite\/new-user\/[\w-]{36}$/)
    expect(otpCalls).toEqual([])
  })

  it('uses the config site name when the setting is empty', async () => {
    websiteTitle = null

    await invite(event())

    expect(renderCalls[0]?.options).toEqual({ locale: 'pt-BR', siteName: 'Config Site' })
  })

  it('keeps the user and the roles, and returns the link, when the send fails', async () => {
    mailSendError = { code: 'test_sender_only' }

    await expect(invite(event())).resolves.toEqual({
      status: 'invited',
      emailSent: false,
      link: LINK,
    })

    expect(deleteCalls).toEqual([])
    expect(rpcCalls.some((call) => call.name === 'set_user_roles')).toBe(true)
    // The log holds the code only.
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ')

    expect(logged).toContain('test_sender_only')
    expect(logged).not.toContain('a@b.test')
    expect(logged).not.toContain('hash-1')
  })

  it('refuses a language that the admin does not have', async () => {
    body = { email: 'ada@example.com', roleKeys: ['editor'], locale: 'xx' }

    await expect(invite(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.errors.localeUnsupported' } },
    })
    expect(generateCalls).toEqual([])
  })

  it('adds the roles of an account that exists, with no link and no email', async () => {
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }

    await expect(invite(event())).resolves.toEqual({ status: 'granted' })

    expect(generateCalls).toEqual([])
    expect(sentMail).toEqual([])
  })

  it('deletes the new user when the roles fail, and sends nothing', async () => {
    rpcResults.set_user_roles = {
      data: null,
      error: { code: 'P0001', message: 'pluto:unknown_role' },
    }

    await expect(invite(event())).rejects.toMatchObject({ statusCode: 400 })
    expect(deleteCalls).toEqual(['new-user'])
    expect(sentMail).toEqual([])
  })

  it('keeps the Supabase invite when the key exists and mail is not configured', async () => {
    mailConfigured = false

    await expect(invite(event())).resolves.toEqual({ status: 'invited' })
    expect(inviteCalls).toHaveLength(1)
    expect(generateCalls).toEqual([])
  })

  it('keeps the sign-in link path without the key, even with mail configured', async () => {
    serviceKeyMissing = true
    rpcQueue.find_user_id_by_email = [
      { data: null, error: null },
      { data: 'linked-user', error: null },
    ]

    await expect(invite(event())).resolves.toEqual({ status: 'invited' })
    expect(otpCalls).toHaveLength(1)
    expect(sentMail).toEqual([])
  })
})

describe('pOST /api/_pluto/supabase/access/users/[id]/resend with Pluto mail', () => {
  beforeEach(() => {
    mailConfigured = true
    rpcResults.list_staff_users = {
      data: [{ id: ID, email: 'pending@example.com', roles: ['editor'] }],
      error: null,
    }
    rpcResults.list_roles = { data: [{ key: 'editor', label: 'Editor' }], error: null }
  })

  it('sends the Pluto email with a new link', async () => {
    body = { locale: 'pt-BR' }

    await expect(resend(event({ id: ID }))).resolves.toEqual({ status: 'sent', emailSent: true })

    expect(inviteCalls).toEqual([])
    expect(generateCalls[0]).toMatchObject({ type: 'invite', email: 'pending@example.com' })
    expect(sentMail[0]).toMatchObject({ to: 'pending@example.com' })
    expect(sentMail[0]!.idempotencyKey).toMatch(new RegExp(`^invite/${ID}/`))
    expect(renderCalls[0]?.options).toMatchObject({ locale: 'pt-BR' })
  })

  it('returns the link when the send fails', async () => {
    mailSendError = { code: 'rate_limited' }

    await expect(resend(event({ id: ID }))).resolves.toEqual({
      status: 'sent',
      emailSent: false,
      link: 'https://site.test/admin/accept-invite?token_hash=hash-1&type=invite',
    })
  })

  it('refuses a user who accepted the invite', async () => {
    getUserResult = {
      data: { user: { email: 'a@example.com', email_confirmed_at: '2026-01-01' } },
      error: null,
    }

    await expect(resend(event({ id: ID }))).rejects.toMatchObject({ statusCode: 409 })
    expect(generateCalls).toEqual([])
  })
})

describe('pOST /api/_pluto/supabase/access/users/invite-link', () => {
  it('answers 503 without the service key', async () => {
    serviceKeyMissing = true

    await expect(inviteLink(event())).rejects.toMatchObject({
      statusCode: 503,
      data: { i18n: { key: 'supabase.access.errors.serviceKeyRequired' } },
    })
    expect(generateCalls).toEqual([])
  })

  it('makes no call for a caller who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(inviteLink(event())).rejects.toMatchObject({ statusCode: 403 })
    expect(generateCalls).toEqual([])
  })

  it('returns an invite link for a new email and sets the roles', async () => {
    await expect(inviteLink(event())).resolves.toEqual({
      status: 'invited',
      link: 'https://site.test/admin/accept-invite?token_hash=hash-1&type=invite',
    })

    expect(rpcCalls.at(-1)).toEqual({
      name: 'set_user_roles',
      args: { target: 'new-user', role_keys: ['editor'] },
    })
    expect(sentMail).toEqual([])
    expect(inviteCalls).toEqual([])
  })

  it('deletes the new user when the roles fail', async () => {
    rpcResults.set_user_roles = {
      data: null,
      error: { code: 'P0001', message: 'pluto:unknown_role' },
    }

    await expect(inviteLink(event())).rejects.toMatchObject({ statusCode: 400 })
    expect(deleteCalls).toEqual(['new-user'])
  })

  it('never returns a link for a confirmed account, only the roles', async () => {
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }
    getUserResult = {
      data: { user: { email: 'ada@example.com', email_confirmed_at: '2026-01-01' } },
      error: null,
    }

    // A magic link signs in as the account: an admin must not get one.
    await expect(inviteLink(event())).resolves.toEqual({ status: 'granted', link: null })
    expect(generateCalls).toEqual([])
    expect(rpcCalls.map((call) => call.name)).toContain('add_user_roles')
  })

  it('adds the roles and returns a magic link for an account that never confirmed', async () => {
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }

    await expect(inviteLink(event())).resolves.toEqual({
      status: 'granted',
      link: 'https://site.test/admin/accept-invite?token_hash=hash-1&type=magiclink',
    })

    expect(generateCalls).toMatchObject([{ type: 'magiclink', email: 'ada@example.com' }])
    expect(rpcCalls.map((call) => call.name)).toContain('add_user_roles')
    expect(deleteCalls).toEqual([])
  })

  it('uses the link type that GoTrue reports', async () => {
    rpcResults.find_user_id_by_email = { data: 'old-user', error: null }
    generateVerification = 'signup'

    await expect(inviteLink(event())).resolves.toMatchObject({
      link: 'https://site.test/admin/accept-invite?token_hash=hash-1&type=signup',
    })
  })

  it('adds the roles when the account appears after the lookup', async () => {
    rpcQueue.find_user_id_by_email = [
      { data: null, error: null },
      { data: 'raced-user', error: null },
    ]
    // The invite link fails with email_exists, then the magic link works.
    generateQueue = [{ code: 'email_exists', message: 'exists' }, null]

    await expect(inviteLink(event())).resolves.toMatchObject({ status: 'granted' })
    expect(generateCalls.map((call) => call.type)).toEqual(['invite', 'magiclink'])
    expect(deleteCalls).toEqual([])
  })

  it('maps an address that GoTrue refuses', async () => {
    generateError = { code: 'email_address_invalid', message: 'invalid' }

    await expect(inviteLink(event())).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.access.errors.emailInvalid' } },
    })
  })

  it('limits a caller to 10 links', async () => {
    for (let i = 0; i < 10; i++) {
      await inviteLink(event())
    }

    await expect(inviteLink(event())).rejects.toMatchObject({ statusCode: 429 })
  })
})

describe('gET /api/_pluto/supabase/access/capabilities', () => {
  it('reports the key and the mail state to an admin', async () => {
    mailConfigured = true

    await expect(capabilities(event())).resolves.toEqual({
      serviceKey: true,
      mail: { configured: true },
    })
  })

  it('reports a missing key', async () => {
    serviceKeyMissing = true

    await expect(capabilities(event())).resolves.toEqual({
      serviceKey: false,
      mail: { configured: false },
    })
  })

  it('refuses a caller who is not an admin', async () => {
    rpcResults.is_admin = { data: false, error: null }

    await expect(capabilities(event())).rejects.toMatchObject({ statusCode: 403 })
  })
})
