import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

vi.stubGlobal('createPlutoError', createPlutoErrorStub)

const serverSupabaseUser = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
  serverSupabaseUser: (...args: unknown[]) => serverSupabaseUser(...args),
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createSupabaseContentAdapter } =
  await import('../server/utils/content-adapter')

const event = {} as H3Event

beforeEach(() => {
  serverSupabaseUser.mockReset()
})

describe('requireSignedIn', () => {
  it('refuses an anonymous caller with a 401', async () => {
    serverSupabaseUser.mockResolvedValue(null)

    await expect(
      createSupabaseContentAdapter().requireSignedIn!(event)
    ).rejects.toMatchObject({ statusCode: 401 })
    expect(serverSupabaseUser).toHaveBeenCalledWith(event)
  })

  it('lets a signed-in caller through', async () => {
    serverSupabaseUser.mockResolvedValue({ sub: 'user-1' })

    await expect(
      createSupabaseContentAdapter().requireSignedIn!(event)
    ).resolves.toBeUndefined()
  })
})
