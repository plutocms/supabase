import { supabasePageType } from '../../shared/utils/content-page'

/**
 * Registers the `page` content type with core's generic content routes and with the public API,
 * at Nitro startup, when the site turns pages on (`plutoPages.enabled`).
 */
export default defineNitroPlugin(() => {
  if (useRuntimeConfig().public.plutoPages?.enabled === true) {
    registerContentType(supabasePageType)
  }
})
