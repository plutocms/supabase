/**
 * Loads (or clears) the current user's capabilities whenever their session
 * appears or disappears — app-wide, not page-scoped.
 *
 * This used to live as a `watch` inside `app/pages/admin.vue`. That only
 * ran while `admin.vue` was the mounted page, so a signed-in admin loading
 * a public page directly (a fresh navigation or a page reload, with no
 * earlier visit to `/admin/**` in the same app instance) never triggered a
 * load at all — `usePlutoPermissions().granted` stayed empty, and every
 * `can()` check for that admin read as `false` on that page, even though
 * the same admin's capability-gated UI worked correctly inside `/admin/**`.
 * `NavbarAdminActions.vue`'s "Edit product" quick-link (shown while
 * viewing a live `/product/**` page) is exactly the kind of capability-
 * gated UI that lives outside `/admin/**` by design, so it needs this to
 * fire on every page, not just admin ones.
 *
 * `useSupabaseSession()` (not `useAuth()`) on purpose: it is the same
 * primitive `useAuth()`'s own `isLoggedIn` is built from
 * (`computed(() => !!supabaseSession.value)`), and it is genuinely
 * app-wide reactive state already (managed by `@nuxtjs/supabase`'s own
 * plugin), so reading it directly here needs no extra composable surface.
 */
export default defineNuxtPlugin(() => {
  const session = useSupabaseSession()
  const { load, clear } = usePlutoPermissions()

  watch(
    session,
    (current) => {
      if (current) {
        load()
      } else {
        clear()
      }
    },
    { immediate: true }
  )
})
