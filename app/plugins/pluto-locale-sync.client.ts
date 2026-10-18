/**
 * Loads the signed-in user's stored admin language whenever a session
 * appears: after a login, and on a page load that already has a session.
 * App-wide, like pluto-permissions-sync.ts, so any page gets the language,
 * not only the pages under /admin.
 *
 * Client-only, unlike the permissions sync. A server `$fetch` does not forward
 * the user's cookies, so a server run would read no locale and clear the cookie.
 * The server already resolves the first locale from the cookie or the
 * Accept-Language header. The stored value then replaces it on the client, and
 * the cookie keeps it for the next server render.
 *
 * `useSupabaseSession()` is the same primitive the permissions sync uses.
 * `syncUserLocale()` never throws. With no driver, or on an error, nothing
 * changes.
 */
export default defineNuxtPlugin(() => {
  const session = useSupabaseSession()
  const { syncUserLocale } = usePlutoI18n()

  watch(
    session,
    (current) => {
      if (current) {
        void syncUserLocale()
      }
    },
    { immediate: true }
  )
})
