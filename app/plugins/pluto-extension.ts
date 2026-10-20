import AuthSignIn from '../components/auth/AuthSignIn.vue'
import MigrationsBanner from '../components/migrations/MigrationsBanner.vue'
import SettingsGeneralPanel from '../components/settings/SettingsGeneralPanel.vue'

export default defineNuxtPlugin(() => {
  // Read at setup, while the Nuxt context exists. The driver below calls it
  // later, after an await, when the context is gone.
  const errorText = usePlutoErrorText()
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  const claims = useSupabaseUser()

  // The site settings that the admin bar shows: the site name and the site
  // URL. They load in the browser after a sign-in, because the settings read
  // needs the session cookie. The state starts empty on the server.
  const siteSettings = useState<Record<string, string>>(
    'supabase-site-settings',
    () => ({})
  )
  const hasSettingsModified = useState<number>('has_settings_modified')

  async function loadSiteSettings() {
    try {
      const response = await $fetch<{ settings: Record<string, string> }>(
        '/api/settings'
      )
      siteSettings.value = response.settings
    } catch {
      // The bar then shows the fallback name and the "/" URL.
    }
  }

  // The setup guard. A done setup is cached for the session, so the guard
  // does not fetch on every navigation. A state that is not done is read
  // again each time.
  const setupDone = useState<boolean>('supabase-setup-done', () => false)

  async function readSetupState(): Promise<SetupState> {
    if (setupDone.value) {
      return 'done'
    }

    let state: SetupState = 'unknown'
    try {
      state = setupStateFromResponse(
        await $fetch('/api/settings/first_setup')
      )
    } catch (error) {
      if (import.meta.dev) {
        console.error('Error checking first setup status:', error)
      }
    }

    setupDone.value = state === 'done'

    return state
  }

  if (import.meta.client) {
    watch(
      [() => Boolean(session.value), hasSettingsModified],
      ([signedIn]) => {
        if (signedIn) {
          void loadSiteSettings()
        } else {
          siteSettings.value = {}
        }
      },
      { immediate: true }
    )
  }

  definePlutoExtension({
    id: 'supabase',
    // Core renders the navbar, the login page and the route guard from this
    // driver. See the admin-shell skill in @plutocms/pluto.
    authDriver: {
      id: 'supabase-auth',
      // The JWT claims carry the id (`sub`) and the user metadata.
      user: () => mapSupabaseUser(claims.value),
      // The session cookie gives the same answer on the server and in the
      // first client render, so the bar does not cause a hydration mismatch.
      loggedIn: () => Boolean(session.value),
      // The module plugin reads the session before this plugin runs.
      ready: () => Promise.resolve(),
      refresh: async () => {
        try {
          const { data } = await supabase.auth.getSession()
          session.value = data.session
          if (data.session) {
            const { data: claimsData } = await supabase.auth.getClaims()
            claims.value = claimsData?.claims ?? null
          } else {
            claims.value = null
          }
        } catch {
          // Keep the state as it is when the read fails.
        }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        session.value = null
        claims.value = null
      },
      signIn: AuthSignIn,
      signInTitle: 'supabase.auth.login.title',
      // The old login page always showed the sign-up link.
      links: {
        signUp: '/admin/signup',
        forgotPassword: '/admin/forgot-password',
      },
      publicPaths: SUPABASE_PUBLIC_PATHS,
      // Core runs this on `/admin/**`, after ready() and before the sign-in
      // rule, so the first-setup redirect wins over the sign-in redirect.
      // It never rejects.
      guard: async (to) => setupRedirect(to.path, await readSetupState()),
    },
    // The website title and URL settings. An empty value makes core use its
    // own fallback (the runtime config name, and "/" for the URL).
    site: {
      id: 'supabase-site',
      name: () => siteSettings.value.website_title,
      // In development, "View site" opens this dev server, like the old navbar.
      url: () => (import.meta.dev ? null : siteSettings.value.website_url),
    },
    // The pending-migrations notice, shown at the top of the admin pages.
    adminBanners: [{ id: 'migrations', component: MigrationsBanner }],
    settingsPanels: [
      {
        id: 'general',
        order: 0,
        title: 'supabase.settings.general.title',
        icon: 'lucide:globe',
        component: SettingsGeneralPanel,
      },
    ],
    settingsDriver: {
      id: 'supabase',
      load: async () => {
        const response = await $fetch<{ settings: Record<string, string> }>(
          '/api/settings'
        )
        return response.settings
      },
      save: async (patch) => {
        await $fetch('/api/settings/update', {
          method: 'POST',
          body: patch,
        })

        // The site info above watches this to read the settings again.
        hasSettingsModified.value = Date.now()
      },
    },
    // No 'system:migrate' capability: applying migrations stays admin-only,
    // gated by requireAdmin (public.is_admin() directly), never a named
    // capability — see server/utils/admin-guard.ts for why.
    capabilities: [
      { id: 'settings-manage', key: 'settings:manage', label: 'supabase.capabilities.settingsManage' },
      { id: 'users-read', key: 'users:read', label: 'supabase.capabilities.usersRead' },
    ],
    // The admin language of the signed-in user, stored in profiles.locale
    // (005_profile_locale.sql). A save error carries the translated server
    // text, so the Settings language card can show it in a toast.
    localeDriver: {
      id: 'supabase',
      load: async () => {
        const response = await $fetch<{ locale: string | null }>('/api/profile/locale')
        return response.locale
      },
      save: async (locale) => {
        try {
          await $fetch('/api/profile/locale', { method: 'POST', body: { locale } })
        } catch (error) {
          throw new Error(errorText(error))
        }
      },
    },
    permissionsDriver: {
      id: 'supabase',
      load: async () => {
        const response = await $fetch<{ capabilities: string[] }>('/api/permissions/me')
        return response.capabilities
      },
    },
  })
})
