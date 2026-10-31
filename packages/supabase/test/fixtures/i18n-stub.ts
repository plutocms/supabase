// Test helpers for the i18n code. `@plutocms/core` does not ship its own
// test fixtures, so this file builds the same stubs from the shipped engine.
import {
  createTranslator,
  flattenMessages,
} from '@plutocms/core/app/composables/internal/i18n-core'
import plutoEn from '@plutocms/core/i18n/locales/en.json'
import supabaseEn from '../../i18n/locales/en.json'

/** The flat English messages of pluto and of this layer. */
export const englishMessages = {
  ...flattenMessages(plutoEn),
  ...flattenMessages(supabaseEn),
}

/** Builds a real translator over the English messages. */
export function createI18nStub() {
  const { t, te, tx } = createTranslator({
    locale: () => 'en',
    messages: () => englishMessages,
    warn: () => {},
  })

  return { t, te, tx, locale: 'en' }
}

interface PlutoErrorOptions {
  statusCode: number
  message: string
  key: string
  params?: Record<string, unknown>
  data?: Record<string, unknown>
}

/**
 * Stands in for the Nitro global `createPlutoError`. It returns the same plain
 * shape as `createError` does in these tests.
 */
export function createPlutoErrorStub(options: PlutoErrorOptions) {
  return {
    statusCode: options.statusCode,
    statusMessage: options.message,
    data: {
      ...options.data,
      i18n: { key: options.key, params: options.params },
    },
  }
}
