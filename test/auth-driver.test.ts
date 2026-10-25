import { describe, expect, it } from 'vitest'
import {
  mapSupabaseUser,
  setupRedirect,
  setupStateFromResponse,
  SUPABASE_PUBLIC_PATHS,
  SUPABASE_SIGN_IN_FALLBACK,
} from '../app/utils/auth-driver'

describe('mapSupabaseUser', () => {
  it('uses sub as the id of JWT claims', () => {
    expect(
      mapSupabaseUser({
        sub: 'user-1',
        email: 'a@example.com',
        user_metadata: { display_name: 'Ada Lovelace', username: 'ada' },
      })
    ).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      username: 'ada',
      email: 'a@example.com',
      avatarUrl: undefined,
    })
  })

  it('uses id for a user object', () => {
    expect(mapSupabaseUser({ id: 'user-2' })?.id).toBe('user-2')
  })

  it('prefers sub over id', () => {
    expect(mapSupabaseUser({ sub: 'a', id: 'b' })?.id).toBe('a')
  })

  it('picks the name in the order of the old navbar', () => {
    const name = (meta: Record<string, unknown>) =>
      mapSupabaseUser({ sub: 'x', user_metadata: meta })?.name

    expect(name({ display_name: 'D', full_name: 'F', name: 'N' })).toBe('D')
    expect(name({ full_name: 'F', name: 'N' })).toBe('F')
    expect(name({ name: 'N' })).toBe('N')
    expect(name({ display_name: '  ', name: 'N' })).toBe('N')
    expect(name({})).toBeUndefined()
  })

  it('reads the avatar from avatar_url, else picture', () => {
    const avatar = (meta: Record<string, unknown>) =>
      mapSupabaseUser({ sub: 'x', user_metadata: meta })?.avatarUrl

    expect(avatar({ avatar_url: '/a.png', picture: '/b.png' })).toBe('/a.png')
    expect(avatar({ picture: '/b.png' })).toBe('/b.png')
  })

  it('ignores a metadata value that is not text', () => {
    const user = mapSupabaseUser({
      sub: 'x',
      user_metadata: { display_name: 12, username: { a: 1 } },
    })

    expect(user?.name).toBeUndefined()
    expect(user?.username).toBeUndefined()
  })

  it('gives null when there is no user or no id', () => {
    expect(mapSupabaseUser(null)).toBeNull()
    expect(mapSupabaseUser(undefined)).toBeNull()
    expect(mapSupabaseUser({ email: 'a@example.com' })).toBeNull()
    expect(mapSupabaseUser({ sub: '  ' })).toBeNull()
  })
})

describe('sUPABASE_PUBLIC_PATHS', () => {
  const signedIn = (path: string) =>
    SUPABASE_PUBLIC_PATHS.find((entry) => entry.path === path)?.signedIn

  it('lists every public auth page and the setup page', () => {
    expect(SUPABASE_PUBLIC_PATHS.map((entry) => entry.path).toSorted()).toEqual([
      '/admin/accept-invite',
      '/admin/confirm',
      '/admin/forgot-password',
      '/admin/setup',
      '/admin/signup',
      '/admin/update-password',
    ])
  })

  it('does not list the login page, because core always has it', () => {
    expect(signedIn('/admin/login')).toBeUndefined()
  })

  it('sends a signed-in user away from sign-up and forgot-password', () => {
    expect(signedIn('/admin/signup')).toBe('redirect')
    expect(signedIn('/admin/forgot-password')).toBe('redirect')
  })

  it('keeps confirm, update-password, accept-invite and setup open for a signed-in user', () => {
    expect(signedIn('/admin/confirm')).toBe('allow')
    expect(signedIn('/admin/update-password')).toBe('allow')
    expect(signedIn('/admin/accept-invite')).toBe('allow')
    expect(signedIn('/admin/setup')).toBe('allow')
  })

  it('opens the admin home after a sign-in with no redirect', () => {
    expect(SUPABASE_SIGN_IN_FALLBACK).toBe('/admin/home')
  })
})

describe('setupStateFromResponse', () => {
  it('reads the first setup flag', () => {
    expect(setupStateFromResponse({ success: true, is_first_setup: true })).toBe('pending')
    expect(setupStateFromResponse({ success: true, is_first_setup: false })).toBe('done')
  })

  it('gives unknown for a failed or empty answer', () => {
    expect(setupStateFromResponse({ success: false })).toBe('unknown')
    expect(setupStateFromResponse(null)).toBe('unknown')
    expect(setupStateFromResponse(undefined)).toBe('unknown')
  })
})

describe('setupRedirect', () => {
  it('sends every admin path but the setup page to the setup page, until the setup is done', () => {
    for (const state of ['pending', 'unknown'] as const) {
      expect(setupRedirect('/admin/home', state)).toBe('/admin/setup')
      expect(setupRedirect('/admin/login', state)).toBe('/admin/setup')
      expect(setupRedirect('/admin/setup', state)).toBeUndefined()
    }
  })

  it('closes the setup page after the setup is done', () => {
    expect(setupRedirect('/admin/setup', 'done')).toBe('/admin/login')
  })

  it('leaves every other path alone after the setup is done', () => {
    expect(setupRedirect('/admin/home', 'done')).toBeUndefined()
    expect(setupRedirect('/admin/login', 'done')).toBeUndefined()
  })
})
