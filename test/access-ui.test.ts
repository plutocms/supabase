import { describe, expect, it } from 'vitest'
import {
  errorKeyOf,
  isAdminUser,
  isInviteMailError,
  isValidRoleKey,
  roleLabelOf,
  sameKeys,
  slugifyRoleKey,
  userDisplayName,
  userStatus,
} from '../app/utils/access-ui'
import {
  supabaseDashboardLinks,
  supabaseProjectRef,
} from '../app/utils/supabase-project'

describe('slugifyRoleKey', () => {
  it('makes a key from a label', () => {
    expect(slugifyRoleKey('Content Editor')).toBe('content_editor')
  })

  it('removes accents and symbols', () => {
    expect(slugifyRoleKey('  Edição & Revisão! ')).toBe('edicao_revisao')
  })

  it('returns an empty string when nothing is left', () => {
    expect(slugifyRoleKey('!!!')).toBe('')
  })

  it('cuts the key to 50 characters with no trailing underscore', () => {
    const key = slugifyRoleKey(`${'a'.repeat(49)} bcd`)

    expect(key.length).toBeLessThanOrEqual(50)
    expect(key.endsWith('_')).toBe(false)
    expect(isValidRoleKey(key)).toBe(true)
  })
})

describe('isValidRoleKey', () => {
  it('accepts a-z, 0-9 and an underscore', () => {
    expect(isValidRoleKey('editor_2')).toBe(true)
  })

  it('refuses an empty key, a capital letter and a dash', () => {
    expect(isValidRoleKey('')).toBe(false)
    expect(isValidRoleKey('Editor')).toBe(false)
    expect(isValidRoleKey('edit-or')).toBe(false)
  })
})

describe('user helpers', () => {
  it('reads the status from the confirmation date', () => {
    expect(userStatus({ email_confirmed_at: null })).toBe('invited')
    expect(userStatus({ email_confirmed_at: '2026-01-01' })).toBe('active')
  })

  it('counts the flag or the admin role as an administrator', () => {
    expect(isAdminUser({ is_admin: true, roles: [] })).toBe(true)
    expect(isAdminUser({ is_admin: false, roles: ['admin'] })).toBe(true)
    expect(isAdminUser({ is_admin: false, roles: ['editor'] })).toBe(false)
  })

  it('names a user by display name, username or email', () => {
    expect(userDisplayName({ display_name: 'Ada', username: 'a', email: 'a@x.test' })).toBe('Ada')
    expect(userDisplayName({ display_name: ' ', username: 'ada', email: 'a@x.test' })).toBe('ada')
    expect(userDisplayName({ display_name: null, username: null, email: 'a@x.test' })).toBe('a@x.test')
  })

  it('looks a role label up, or keeps the key', () => {
    const roles = [{ key: 'editor', label: 'Editor', description: '', is_builtin: false, capabilities: [], user_count: 0 }]

    expect(roleLabelOf(roles, 'editor')).toBe('Editor')
    expect(roleLabelOf(roles, 'ghost')).toBe('ghost')
  })

  it('compares two key lists in any order', () => {
    expect(sameKeys(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameKeys(['a'], ['a', 'b'])).toBe(false)
    expect(sameKeys(['a', 'a'], ['a', 'b'])).toBe(false)
  })
})

describe('invite errors', () => {
  const fetchError = (key: string) => ({ data: { data: { i18n: { key } } } })

  it('reads the i18n key of a server error', () => {
    expect(errorKeyOf(fetchError('supabase.access.errors.lastAdmin'))).toBe(
      'supabase.access.errors.lastAdmin'
    )
    expect(errorKeyOf(new Error('x'))).toBeUndefined()
    expect(errorKeyOf(null)).toBeUndefined()
  })

  it('knows the three mailer errors', () => {
    for (const code of ['emailNotAuthorized', 'emailRateLimited', 'emailInvalid']) {
      expect(isInviteMailError(fetchError(`supabase.access.errors.${code}`))).toBe(true)
    }

    expect(isInviteMailError(fetchError('supabase.access.errors.lastAdmin'))).toBe(false)
    expect(isInviteMailError(fetchError('supabase.access.errors.inviteFailed'))).toBe(false)
  })
})

describe('supabaseProjectRef', () => {
  it('reads the ref of a hosted project', () => {
    expect(supabaseProjectRef('https://abcdefghijklmnop.supabase.co')).toBe('abcdefghijklmnop')
  })

  it('returns null for a local or custom URL, or a bad value', () => {
    expect(supabaseProjectRef('http://127.0.0.1:54321')).toBeNull()
    expect(supabaseProjectRef('https://api.example.com')).toBeNull()
    expect(supabaseProjectRef('not a url')).toBeNull()
    expect(supabaseProjectRef(undefined)).toBeNull()
  })

  it('builds the dashboard links', () => {
    expect(supabaseDashboardLinks('abcdefghijklmnop')).toEqual({
      project: 'https://supabase.com/dashboard/project/abcdefghijklmnop',
      smtp: 'https://supabase.com/dashboard/project/abcdefghijklmnop/auth/smtp',
      templates: 'https://supabase.com/dashboard/project/abcdefghijklmnop/auth/templates',
      rateLimits: 'https://supabase.com/dashboard/project/abcdefghijklmnop/auth/rate-limits',
    })
  })
})
