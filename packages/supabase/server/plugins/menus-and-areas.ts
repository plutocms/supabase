/**
 * Registers the `menu` and `area` content types with core's generic content routes and with the
 * public API, at Nitro startup, when the site turns each on (`plutoMenus.enabled` and
 * `plutoAreas.enabled`).
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig().public

  if (config.plutoMenus?.enabled === true) {
    registerContentType(supabaseMenuType)
  }

  if (config.plutoAreas?.enabled === true) {
    registerContentType(supabaseAreaType)
  }
})
