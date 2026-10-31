import { describe, expect, it } from 'vitest'
import { parseInviteLink } from '../app/utils/invite-link'
import { inviteRedirectUrl } from '../server/utils/access-invite'

describe('parseInviteLink', () => {
  it('reads token_hash with type=invite from the query', () => {
    expect(parseInviteLink({ token_hash: 'abc', type: 'invite' }, '')).toEqual({
      kind: 'otp',
      tokenHash: 'abc',
      type: 'invite',
    })
  })

  it('reads token_hash with type=magiclink, from the copied link of an existing account', () => {
    expect(
      parseInviteLink({ token_hash: 'abc', type: 'magiclink' }, '')
    ).toEqual({
      kind: 'otp',
      tokenHash: 'abc',
      type: 'magiclink',
    })
  })

  it('ignores token_hash with another type', () => {
    expect(
      parseInviteLink({ token_hash: 'abc', type: 'recovery' }, '')
    ).toEqual({
      kind: 'none',
    })
  })

  it('takes the first value of a repeated query key', () => {
    expect(
      parseInviteLink({ token_hash: ['abc', 'x'], type: ['invite'] }, '')
    ).toEqual({ kind: 'otp', tokenHash: 'abc', type: 'invite' })
  })

  it('reads the tokens of the hash', () => {
    expect(
      parseInviteLink({}, '#access_token=a1&refresh_token=r1&type=invite')
    ).toEqual({ kind: 'session', accessToken: 'a1', refreshToken: 'r1' })
  })

  it('needs both tokens', () => {
    expect(parseInviteLink({}, '#access_token=a1')).toEqual({ kind: 'none' })
  })

  it('reads an error code of the hash', () => {
    expect(
      parseInviteLink(
        {},
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
      )
    ).toEqual({
      kind: 'error',
      code: 'otp_expired',
      description: 'Email link is invalid',
    })
  })

  it('prefers the query token over the hash', () => {
    expect(
      parseInviteLink(
        { token_hash: 'abc', type: 'invite' },
        '#access_token=a&refresh_token=r'
      ).kind
    ).toBe('otp')
  })

  it('answers none for an empty link', () => {
    expect(parseInviteLink(null, undefined)).toEqual({ kind: 'none' })
    expect(parseInviteLink({}, '#')).toEqual({ kind: 'none' })
  })
})

describe('inviteRedirectUrl', () => {
  it('uses the origin of the request', () => {
    expect(inviteRedirectUrl('https://example.com')).toBe(
      'https://example.com/admin/accept-invite'
    )
    expect(inviteRedirectUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/admin/accept-invite'
    )
  })
})
