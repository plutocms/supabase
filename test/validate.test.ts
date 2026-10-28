import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

// `parseBody` calls the globals `readBody` and `createPlutoError`, which Nitro
// normally auto-imports. Outside a Nuxt/Nitro build there is no such global
// at runtime, so both are stubbed here. The `createPlutoError` stub returns a
// plain object, so a test can assert on `statusCode`/`data`.
let bodyToReturn: unknown

beforeEach(() => {
  vi.stubGlobal('readBody', async () => bodyToReturn)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const { parseBody } = await import('../server/utils/validate')

const fakeEvent = {} as H3Event

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
})

describe('parseBody', () => {
  it('returns the parsed body unchanged when it matches the schema', async () => {
    bodyToReturn = { name: 'Widget' }

    await expect(parseBody(fakeEvent, schema)).resolves.toEqual({
      name: 'Widget',
    })
  })

  it('throws the standard 400 shape when the body fails the schema', async () => {
    bodyToReturn = { name: '' }

    await expect(parseBody(fakeEvent, schema)).rejects.toEqual({
      statusCode: 400,
      statusMessage: 'Validation failed.',
      data: {
        errors: [{ field: 'name', message: 'Name is required.' }],
        i18n: { key: 'pluto.errors.validationFailed' },
      },
    })
  })

  it('joins a nested field path with "."', async () => {
    const nestedSchema = z.object({
      address: z.object({ zip: z.string().min(1, 'Zip is required.') }),
    })
    bodyToReturn = { address: { zip: '' } }

    await expect(parseBody(fakeEvent, nestedSchema)).rejects.toEqual({
      statusCode: 400,
      statusMessage: 'Validation failed.',
      data: {
        errors: [{ field: 'address.zip', message: 'Zip is required.' }],
        i18n: { key: 'pluto.errors.validationFailed' },
      },
    })
  })
})
