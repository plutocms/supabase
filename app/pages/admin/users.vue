<script setup lang="ts">
// The Users page (`/admin/users`, the Users item of the admin menu). It lists
// the staff (users with a role). An admin invites users, changes their roles,
// resends an invite, copies an invite link and revokes access. It needs
// `users:read`: without it, the page shows an alert and loads nothing. The API
// routes do their own check. See the users-and-roles skill.
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  AccessCapabilities,
  AccessRole,
  AccessUser,
} from '../../../shared/types/access'
import {
  isAdminUser,
  roleLabelOf,
  userDisplayName,
  userStatus,
} from '../../utils/access-ui'

// The modals and the slideover load on demand. They stay out of the page chunk.
const InviteModal = defineAsyncComponent(
  () => import('../../components/access/InviteModal.vue')
)
const EditRolesSlideover = defineAsyncComponent(
  () => import('../../components/access/EditRolesSlideover.vue')
)
const RevokeModal = defineAsyncComponent(
  () => import('../../components/access/RevokeModal.vue')
)
const LinkModal = defineAsyncComponent(
  () => import('../../components/access/LinkModal.vue')
)

const { t, d, locale } = usePlutoI18n()
const toast = useToast()
const overlay = useOverlay()
const errorText = usePlutoErrorText()
const permissions = usePlutoPermissions()
const auth = usePlutoAuth()

useHead({
  title: () => t('supabase.access.users.title'),
})

const allowed = computed(() => permissions.can('users:read'))

const users = ref<AccessUser[]>([])
const roles = ref<AccessRole[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')
const capabilities = ref<AccessCapabilities | null>(null)

const isAdmin = computed(() => permissions.isAdmin.value)
const selfId = computed(() => auth.user.value?.id ?? '')

async function load() {
  // Keep the table on screen while it reloads after a change.
  if (status.value !== 'ready') {
    status.value = 'loading'
  }

  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      $fetch<{ users: AccessUser[] }>('/api/_pluto/supabase/access/users'),
      $fetch<{ roles: AccessRole[] }>('/api/_pluto/supabase/access/roles'),
    ])

    users.value = usersResponse.users
    roles.value = rolesResponse.roles
    status.value = 'ready'
  } catch (error) {
    loadError.value = errorText(error)
    status.value = 'error'
  }
}

async function loadCapabilities() {
  try {
    capabilities.value = await $fetch<AccessCapabilities>(
      '/api/_pluto/supabase/access/capabilities'
    )
  } catch {
    // The invite works without it. Only the "Copy invite link" action hides.
    capabilities.value = null
  }
}

watch(
  allowed,
  (ok) => {
    if (ok) {
      load()
    }
  },
  { immediate: true }
)

// Only an admin can read this, so ask after the permissions are known.
watch(
  isAdmin,
  (admin) => {
    if (admin && !capabilities.value) {
      void loadCapabilities()
    }
  },
  { immediate: true }
)

const columns = computed<TableColumn<AccessUser>[]>(() => [
  { id: 'user', header: t('supabase.access.users.columns.user') },
  { id: 'roles', header: t('supabase.access.users.columns.roles') },
  { id: 'status', header: t('supabase.access.users.columns.status') },
  { id: 'lastSignIn', header: t('supabase.access.users.columns.lastSignIn') },
  { id: 'actions', header: '' },
])

function dateText(
  value: string | null,
  options: Intl.DateTimeFormatOptions
): string {
  return value ? d(new Date(value), options) : ''
}

// --- Invite ---
const inviteMounted = ref(false)
const inviteOpen = ref(false)

function openInvite() {
  inviteMounted.value = true
  inviteOpen.value = true
}

// --- Edit roles ---
const editMounted = ref(false)
const editOpen = ref(false)
const editUser = ref<AccessUser | null>(null)

function openEdit(user: AccessUser) {
  editUser.value = user
  editMounted.value = true
  editOpen.value = true
}

// --- Revoke ---
async function openRevoke(user: AccessUser) {
  const modal = overlay.create(RevokeModal)
  const revoked = await modal.open({ user, self: user.id === selfId.value })

  if (revoked) {
    await load()
  }
}

// --- Invite link ---
async function showLink(link: string) {
  await overlay.create(LinkModal).open({ link })
}

async function copyLink(user: AccessUser) {
  if (!user.email) {
    return
  }

  try {
    const result = await $fetch<{ link: string | null }>(
      '/api/_pluto/supabase/access/users/invite-link',
      {
        method: 'POST',
        body: { email: user.email, roleKeys: user.roles },
      }
    )

    // A confirmed account gets no link: it signs in with its own password.
    if (!result.link) {
      toast.add({
        title: t('supabase.access.toasts.noLinkConfirmed'),
        color: 'info',
        icon: 'lucide:info',
      })
      return
    }

    await showLink(result.link)
  } catch (error) {
    toast.add({
      title: t('supabase.access.toasts.failed'),
      description: errorText(error),
      color: 'error',
      icon: 'lucide:circle-x',
    })
  }
}

// --- Resend ---
async function resend(user: AccessUser) {
  try {
    const result = await $fetch<{ emailSent?: boolean; link?: string }>(
      `/api/_pluto/supabase/access/users/${user.id}/resend`,
      { method: 'POST', body: { locale: locale.value } }
    )

    if (result.emailSent === false && result.link) {
      toast.add({
        title: t('supabase.access.toasts.resentNoEmail'),
        color: 'warning',
        icon: 'lucide:triangle-alert',
      })
      await showLink(result.link)

      return
    }

    toast.add({
      title: t('supabase.access.toasts.resent', { email: user.email ?? '' }),
      color: 'success',
      icon: 'lucide:circle-check',
    })
  } catch (error) {
    toast.add({
      title: t('supabase.access.toasts.failed'),
      description: errorText(error),
      color: 'error',
      icon: 'lucide:circle-x',
    })
  }
}

function menuItems(user: AccessUser): DropdownMenuItem[][] {
  const pending = userStatus(user) === 'invited'
  const main: DropdownMenuItem[] = [
    {
      label: t('supabase.access.users.menu.editRoles'),
      icon: 'lucide:shield',
      onSelect: () => openEdit(user),
    },
  ]

  if (pending) {
    main.push({
      label: t('supabase.access.users.menu.resend'),
      icon: 'lucide:send',
      onSelect: () => resend(user),
    })

    if (capabilities.value?.serviceKey && user.roles.length > 0) {
      main.push({
        label: t('supabase.access.users.menu.copyLink'),
        icon: 'lucide:link',
        onSelect: () => copyLink(user),
      })
    }
  }

  return [
    main,
    [
      {
        label: t('supabase.access.users.menu.revoke'),
        icon: 'lucide:user-x',
        color: 'error',
        onSelect: () => openRevoke(user),
      },
    ],
  ]
}
</script>

<template>
  <main>
    <AdminView>
      <!-- The section (the Users item of the menu) and its tabs, like Settings. -->
      <h1 class="text-3xl font-bold lg:text-4xl">
        {{ t('supabase.access.users.title') }}
      </h1>

      <PlutoAdminNavTabs />

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold">
            {{ t('supabase.access.users.title') }}
          </h2>
          <p class="text-muted text-sm">
            {{ t('supabase.access.users.description') }}
          </p>
        </div>

        <UButton v-if="isAdmin" icon="lucide:user-plus" @click="openInvite">
          {{ t('supabase.access.users.invite') }}
        </UButton>
      </div>

      <UAlert
        v-if="!allowed"
        :title="t('pluto.settings.noPermission.title')"
        :description="
          t('pluto.settings.noPermission.description', {
            page: t('supabase.access.users.title'),
          })
        "
        icon="lucide:lock"
        color="warning"
      />

      <!-- Loading -->
      <div
        v-else-if="status === 'loading'"
        class="flex flex-col gap-y-3"
        aria-busy="true"
      >
        <USkeleton v-for="row in 4" :key="row" class="h-12 w-full" />
      </div>

      <!-- Error -->
      <UAlert
        v-else-if="status === 'error'"
        :title="t('supabase.access.users.error.title')"
        :description="loadError"
        :actions="[
          {
            label: t('pluto.common.tryAgain'),
            color: 'neutral',
            variant: 'outline',
            onClick: load,
          },
        ]"
        color="error"
        variant="subtle"
        icon="lucide:circle-x"
      />

      <!-- Empty -->
      <UEmpty
        v-else-if="users.length === 0"
        :title="t('supabase.access.users.empty.title')"
        :description="t('supabase.access.users.empty.description')"
        :actions="
          isAdmin
            ? [
                {
                  label: t('supabase.access.users.invite'),
                  icon: 'lucide:user-plus',
                  onClick: openInvite,
                },
              ]
            : []
        "
        icon="lucide:users"
      />

      <!-- The list -->
      <UTable
        v-else
        :data="users"
        :columns="columns"
        class="border-default rounded-lg border"
      >
        <template #user-cell="{ row }">
          <div class="flex min-w-0 flex-col">
            <span class="flex items-center gap-2">
              <span class="text-highlighted truncate font-medium">{{
                userDisplayName(row.original)
              }}</span>
              <UBadge
                v-if="row.original.id === selfId"
                :label="t('supabase.access.users.you')"
                color="primary"
                variant="subtle"
                size="sm"
              />
            </span>
            <span
              v-if="row.original.email"
              class="text-muted truncate text-sm"
              >{{ row.original.email }}</span
            >
          </div>
        </template>

        <template #roles-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-if="isAdminUser(row.original)"
              :label="t('supabase.access.users.administrator')"
              color="primary"
              variant="subtle"
            />
            <template v-else>
              <UBadge
                v-for="key in row.original.roles"
                :key="key"
                :label="roleLabelOf(roles, key)"
                color="neutral"
                variant="subtle"
              />
            </template>
          </div>
        </template>

        <template #status-cell="{ row }">
          <div class="flex flex-col items-start gap-1">
            <UBadge
              v-if="userStatus(row.original) === 'active'"
              :label="t('supabase.access.users.status.active')"
              color="success"
              variant="subtle"
            />
            <template v-else>
              <UBadge
                :label="t('supabase.access.users.status.invited')"
                color="warning"
                variant="subtle"
              />
              <span v-if="row.original.invited_at" class="text-muted text-xs">
                {{
                  t('supabase.access.users.status.invitedOn', {
                    date: dateText(row.original.invited_at, {
                      dateStyle: 'medium',
                    }),
                  })
                }}
              </span>
            </template>
          </div>
        </template>

        <template #lastSignIn-cell="{ row }">
          <span v-if="row.original.last_sign_in_at" class="text-sm">
            {{
              dateText(row.original.last_sign_in_at, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            }}
          </span>
          <span v-else class="text-muted text-sm">{{
            t('supabase.access.users.neverSignedIn')
          }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div v-if="isAdmin" class="flex justify-end">
            <UDropdownMenu
              :items="menuItems(row.original)"
              :content="{ align: 'end' }"
            >
              <UButton
                :aria-label="
                  t('supabase.access.users.actionsLabel', {
                    name: userDisplayName(row.original),
                  })
                "
                icon="lucide:ellipsis"
                color="neutral"
                variant="ghost"
              />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>

      <!-- Lazy: the chunk loads on the first open. -->
      <InviteModal
        v-if="inviteMounted"
        v-model:open="inviteOpen"
        :roles="roles"
        :capabilities="capabilities"
        @done="load"
      />
      <EditRolesSlideover
        v-if="editMounted"
        v-model:open="editOpen"
        :user="editUser"
        :roles="roles"
        :self="editUser?.id === selfId"
        @saved="load"
      />
    </AdminView>
  </main>
</template>
