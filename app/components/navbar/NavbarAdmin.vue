<script setup lang="ts">
import { UDropdownMenu } from '#components'
import { domainFromUrl } from '#imports'

const host = useRequestURL().host

const route = useRoute()
const isSidebarOpen = useState<boolean>('pluto-admin-sidebar-open', () => false)

function openSidebar() {
  isSidebarOpen.value = true
}

const { isLoggedIn, user, logout } = await useAuth()

const displayName = computed(() => {
  return (
    user.value?.display_name ||
    user.value?.full_name ||
    user.value?.name ||
    user.value?.username ||
    'User'
  )
})

const shortDisplayName = computed(() => displayName.value.split(' ')[0])

const userMenuLabel = computed(() => {
  return user.value?.username
    ? `${displayName.value} (${user.value.username})`
    : displayName.value
})

const has_settings_modified = useState<boolean>('has_settings_modified')

const { data: settingsData, status } = await useFetch('/api/settings', {
  watch: [has_settings_modified],
})

const maybeDevUrl = computed(() => {
  if (import.meta.dev) {
    return `http://${host}`
  }

  return settingsData.value?.settings.website_url || ''
})

type DropdownItems = NonNullable<
  Parameters<typeof UDropdownMenu>[0]['items']
>

const items = computed<DropdownItems>(() => [
  [
    {
      label: userMenuLabel.value,
      avatar: {
        icon: 'lucide:user',
        class: 'bg-green-600',
        ui: {
          icon: 'text-white text-sm',
        },
      },
      type: 'label',
    },
  ],

  [
    {
      label: 'Settings',
      icon: 'i-lucide-cog',
      type: 'link',
      to: '/admin/settings',
      kbds: ['meta', ','],
      onSelect() {
        if (isLoggedIn.value) {
          navigateTo('/admin/settings')
        }
      },
    },
  ],

  [
    {
      label: 'Pluto on GitHub',
      icon: 'i-simple-icons-github',
      type: 'link',
      to: 'https://github.com/ojvribeiro/pluto',
      target: '_blank',
      external: true,
    },
  ],

  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      kbds: ['meta', 'shift', 'q'],
      class: 'cursor-pointer',
      onSelect() {
        logout({ showToast: true })
      },
    },
  ],
])

defineShortcuts(extractShortcuts(items.value))
</script>

<template>
  <PlutoNavbarAdmin>
    <div
      class="flex h-full min-w-0 items-stretch justify-between gap-1 px-2 lg:px-4"
    >
      <div class="flex min-w-0 items-center gap-x-1 lg:gap-x-3">
        <UButton
          class="lg:hidden"
          icon="lucide:menu"
          color="neutral"
          variant="ghost"
          aria-label="Open navigation"
          square
          @click="openSidebar"
        />

        <div class="h-full shrink-0 py-1">
          <NuxtLink
            title="Go to dashboard home"
            to="/admin/home"
            class="group block h-full"
          >
            <img
              src="/img/pluto.png"
              class="block h-full grayscale-100 group-hover:grayscale-0"
            />
          </NuxtLink>
        </div>

        <div class="min-w-0 h-full overflow-hidden">
          <ul class="flex h-full min-w-0 items-center text-sm">
            <NavbarAdminActionButton
              :show="route.path.startsWith('/admin')"
              :title="`Visit ${domainFromUrl(maybeDevUrl)}`"
              :icon="
                status === 'pending'
                  ? 'lucide:loader-circle'
                  : 'lucide:external-link'
              "
              :disabled="status === 'pending'"
              :to="maybeDevUrl"
              target="_blank"
              label="View site"
            />

            <ClientOnly>
              <template #fallback>
                <li class="h-full">
                  <div
                    class="light:text-zinc-800/50 flex h-full items-center gap-x-2 rounded-sm px-2 text-white/50"
                  >
                    <Icon name="svg-spinners:ring-resize" />
                  </div>
                </li>
              </template>

              <PlutoNavbarAdminActions />
            </ClientOnly>
          </ul>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1 lg:gap-3">
        <ColorModeButton />

        <div class="h-full">
          <UDropdownMenu
            :items="items"
            :ui="{
              content: 'w-64',
            }"
            :modal="false"
          >
            <button
              class="group h-full py-1"
              aria-label="Open user menu"
              type="button"
            >
              <div
                class="flex h-full items-center gap-x-2 rounded-sm rounded-l-xl pr-2 pl-0.5 group-hover:bg-white/20"
              >
                <UAvatar
                  :ui="{
                    root: 'rounded-xl',
                    icon: 'text-white text-lg',
                  }"
                  :alt="displayName"
                  size="sm"
                  icon="lucide:user"
                  class="bg-green-600"
                />

                <span
                  class="light:text-zinc-800 hidden text-sm font-bold dark:text-white lg:inline"
                >
                  {{ shortDisplayName }}
                </span>
              </div>
            </button>
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </PlutoNavbarAdmin>
</template>
