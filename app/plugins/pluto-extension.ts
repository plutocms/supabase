import NavbarAdminProvider from '../components/navbar/NavbarAdminProvider.vue'
import SettingsGeneralPanel from '../components/settings/SettingsGeneralPanel.vue'

export default defineNuxtPlugin(() => {
  // Read at setup, while the Nuxt context exists. The driver below calls it
  // later, after an await, when the context is gone.
  const errorText = usePlutoErrorText()

  definePlutoExtension({
    id: 'supabase',
    navbar: { id: 'admin-navbar', component: NavbarAdminProvider },
    settingsPanels: [
      {
        id: 'general',
        order: 0,
        title: 'General',
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

        // NavbarAdmin.vue watches this to refresh its own /api/settings
        // read (it shows the site's own URL) — the settings page saving
        // through the new registry must still trigger it, exactly like
        // the old page did.
        const hasSettingsModified = useState<number>('has_settings_modified')
        hasSettingsModified.value = Date.now()
      },
    },
    // No 'system:migrate' capability: applying migrations stays admin-only,
    // gated by requireAdmin (public.is_admin() directly), never a named
    // capability — see server/utils/admin-guard.ts for why.
    capabilities: [
      { id: 'settings-manage', key: 'settings:manage', label: 'Manage site settings' },
      { id: 'users-read', key: 'users:read', label: 'View all user accounts' },
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
