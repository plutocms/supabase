import { describe, expect, it } from 'vitest'
import {
  AUTH_ERROR_KEYS,
  AUTH_UNKNOWN_ERROR_KEY,
  authErrorKey,
  resolveAuthErrorText,
} from '../app/utils/auth-error'
import { createI18nStub } from './fixtures/i18n-stub'

const i18n = createI18nStub()

describe('authErrorKey', () => {
  it('maps each known Supabase auth code to a key', () => {
    for (const code of [
      'invalid_credentials',
      'email_not_confirmed',
      'over_request_rate_limit',
      'weak_password',
      'same_password',
      'user_not_found',
    ]) {
      expect(authErrorKey({ code }), code).toBe(`supabase.auth.errors.${code}`)
    }
  })

  it('returns undefined for an unknown code, no code, or a bad shape', () => {
    expect(authErrorKey({ code: 'something_new' })).toBeUndefined()
    expect(authErrorKey({ code: 400 })).toBeUndefined()
    expect(authErrorKey({})).toBeUndefined()
    expect(authErrorKey(null)).toBeUndefined()
    expect(authErrorKey('boom')).toBeUndefined()
  })

  it('does not match a property of Object.prototype', () => {
    expect(authErrorKey({ code: 'toString' })).toBeUndefined()
  })
})

describe('resolveAuthErrorText', () => {
  it('translates a known code, and ignores the raw message', () => {
    expect(
      resolveAuthErrorText(
        { code: 'invalid_credentials', message: 'Invalid login credentials' },
        i18n
      )
    ).toBe('Invalid email or password.')
  })

  it('falls back to the raw message for an unknown code', () => {
    expect(
      resolveAuthErrorText(
        { code: 'something_new', message: 'Something new happened' },
        i18n
      )
    ).toBe('Something new happened')
  })

  it('falls back to the raw message when the error has no code', () => {
    expect(resolveAuthErrorText(new Error('Network down'), i18n)).toBe(
      'Network down'
    )
  })

  it('falls back to the unknown-error text when there is no message', () => {
    expect(resolveAuthErrorText({}, i18n)).toBe('An unknown error occurred.')
    expect(resolveAuthErrorText({ message: '  ' }, i18n)).toBe(
      'An unknown error occurred.'
    )
    expect(resolveAuthErrorText(undefined, i18n)).toBe(
      'An unknown error occurred.'
    )
  })

  it('uses the raw message when the key has no translation', () => {
    const noKeys = { t: (key: string) => key, te: () => false }

    expect(
      resolveAuthErrorText(
        { code: 'weak_password', message: 'Too weak' },
        noKeys
      )
    ).toBe('Too weak')
  })
})

describe('auth error keys', () => {
  it('all exist in en, and the unknown key too', () => {
    for (const key of [
      ...Object.values(AUTH_ERROR_KEYS),
      AUTH_UNKNOWN_ERROR_KEY,
    ]) {
      expect(i18n.te(key), key).toBe(true)
    }
  })
})
