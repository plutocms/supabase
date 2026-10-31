// Test helpers for the i18n code. `@plutocms/core` does not ship its own
// test fixtures, so this file builds the same stubs from the shipped engine.
import {
  createTranslator,
  flattenMessages,
} from '@plutocms/core/app/composables/internal/i18n-core'
import plutoEn from '@plutocms/core/i18n/locales/en.json'
import blogEn from '../../i18n/locales/en.json'

/** The flat English messages of pluto and of this layer. */
export const englishMessages = {
  ...flattenMessages(plutoEn),
  ...flattenMessages(blogEn),
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
