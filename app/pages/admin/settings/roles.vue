<script setup lang="ts">
// The Roles tab of Settings (admin only). A role is a set of capabilities. An
// admin creates, edits and deletes roles. The `admin` role is built in: it
// opens read-only, and it cannot be deleted. See the users-and-roles skill.
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { AccessRole } from '../../../../shared/types/access'
import { ADMIN_ROLE_KEY } from '../../../utils/access-ui'

// The slideover and the modal load on demand. They stay out of the page chunk.
const RoleSlideover = defineAsyncComponent(
  () => import('../../../components/access/RoleSlideover.vue')
)
const DeleteRoleModal = defineAsyncComponent(
  () => import('../../../components/access/DeleteRoleModal.vue')
)

const { t } = usePlutoI18n()
const overlay = useOverlay()
const errorText = usePlutoErrorText()

useHead({
  title: () =>
    `${t('supabase.access.roles.title')} - ${t('pluto.pages.settings')}`,
})

const roles = ref<AccessRole[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')

async function load() {
  // Keep the table on screen while it reloads after a change.
  if (status.value !== 'ready') {
    status.value = 'loading'
  }

  try {
    const response = await $fetch<{ roles: AccessRole[] }>(
      '/api/_pluto/supabase/access/roles'
    )

    roles.value = response.roles
    status.value = 'ready'
  } catch (error) {
    loadError.value = errorText(error)
    status.value = 'error'
  }
}

onMounted(load)

const columns = computed<TableColumn<AccessRole>[]>(() => [
  { id: 'role', header: t('supabase.access.roles.columns.role') },
  { id: 'permissions', header: t('supabase.access.roles.columns.permissions') },
  { id: 'users', header: t('supabase.access.roles.columns.users') },
  { id: 'actions', header: '' },
])

// --- Create and edit ---
const slideoverMounted = ref(false)
const slideoverOpen = ref(false)
const editing = ref<AccessRole | null>(null)

function openRole(role: AccessRole | null) {
  editing.value = role
  slideoverMounted.value = true
  slideoverOpen.value = true
}

// --- Delete ---
async function openDelete(role: AccessRole) {
  const modal = overlay.create(DeleteRoleModal)
  const deleted = await modal.open({ role })

  if (deleted) {
    await load()
  }
}

function isFullAccess(role: AccessRole): boolean {
  return role.capabilities.includes('*')
}

function menuItems(role: AccessRole): DropdownMenuItem[][] {
  const readOnly = role.key === ADMIN_ROLE_KEY
  const main: DropdownMenuItem[] = [
    {
      label: readOnly
        ? t('supabase.access.roles.menu.view')
        : t('supabase.access.roles.menu.edit'),
      icon: readOnly ? 'lucide:eye' : 'lucide:pencil',
      onSelect: () => openRole(role),
    },
  ]

  // A built-in role cannot be deleted.
  if (role.is_builtin) {
    return [main]
  }

  return [
    main,
    [
      {
        label: t('supabase.access.roles.menu.delete'),
        icon: 'lucide:trash-2',
        color: 'error',
        onSelect: () => openDelete(role),
      },
    ],
  ]
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold">
          {{ t('supabase.access.roles.title') }}
        </h2>
        <p class="text-muted text-sm">
          {{ t('supabase.access.roles.description') }}
        </p>
      </div>

      <UButton icon="lucide:plus" @click="openRole(null)">
        {{ t('supabase.access.roles.create') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'loading'"
      class="flex flex-col gap-y-3"
      aria-busy="true"
    >
      <USkeleton v-for="row in 3" :key="row" class="h-12 w-full" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="status === 'error'"
      :title="t('supabase.access.roles.error.title')"
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

    <!-- The list -->
    <UTable
      v-else
      :data="roles"
      :columns="columns"
      class="border-default rounded-lg border"
    >
      <template #role-cell="{ row }">
        <div class="flex min-w-0 flex-col">
          <span class="flex items-center gap-2">
            <span class="text-highlighted truncate font-medium">{{
              row.original.label
            }}</span>
            <UBadge
              v-if="row.original.is_builtin"
              :label="t('supabase.access.roles.builtin')"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </span>
          <code class="text-muted truncate font-mono text-xs">{{
            row.original.key
          }}</code>
        </div>
      </template>

      <template #permissions-cell="{ row }">
        <span v-if="isFullAccess(row.original)" class="text-sm">
          {{ t('supabase.access.roles.fullAccess') }}
        </span>
        <span v-else class="text-sm">
          {{
            t(
              'supabase.access.roles.permissionCount',
              row.original.capabilities.length
            )
          }}
        </span>
      </template>

      <template #users-cell="{ row }">
        <span class="text-sm">{{
          t('supabase.access.roles.userCount', row.original.user_count)
        }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu
            :items="menuItems(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              :aria-label="row.original.label"
              icon="lucide:ellipsis"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </div>
      </template>
    </UTable>

    <!-- Lazy: the chunk loads on the first open. -->
    <RoleSlideover
      v-if="slideoverMounted"
      v-model:open="slideoverOpen"
      :role="editing"
      @saved="load"
    />
  </div>
</template>
