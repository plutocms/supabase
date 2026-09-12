import NavbarAdminProvider from '../components/navbar/NavbarAdminProvider.vue'
import SettingsGeneralPanel from '../components/settings/SettingsGeneralPanel.vue'

export default defineNuxtPlugin(() => {
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
    capabilities: [
      { id: 'settings-manage', key: 'settings:manage', label: 'Manage site settings' },
      { id: 'users-read', key: 'users:read', label: 'View all user accounts' },
      { id: 'system-migrate', key: 'system:migrate', label: 'Apply pending layer migrations' },
    ],
    permissionsDriver: {
      id: 'supabase',
      load: async () => {
        const response = await $fetch<{ capabilities: string[] }>('/api/permissions/me')
        return response.capabilities
      },
    },
  })
})
