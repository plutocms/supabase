<script setup lang="ts">
// Changes the roles of one user. The save replaces the roles. A change to the
// roles of the signed-in admin loads the permissions again, so the menu and
// the tabs follow at once.
import type { AccessRole, AccessUser } from '../../../shared/types/access'
import { ADMIN_ROLE_KEY, sameKeys, userDisplayName } from '../../utils/access-ui'

const props = defineProps<{
  user: AccessUser | null
  roles: AccessRole[]
  /** True when the user is the signed-in admin. */
  self: boolean
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })

const { t } = usePlutoI18n()
const toast = useToast()
const errorText = usePlutoErrorText()
const permissions = usePlutoPermissions()

const roleKeys = ref<string[]>([])
const saving = ref(false)

watch(
  () => [open.value, props.user?.id] as const,
  ([isOpen]) => {
    if (isOpen && props.user) {
      roleKeys.value = [...props.user.roles]
    }
  },
  { immediate: true }
)

const items = computed(() =>
  props.roles.map((role) => ({
    label: role.label,
    value: role.key,
    description: role.description || undefined,
  }))
)

const name = computed(() => (props.user ? userDisplayName(props.user) : ''))
const unchanged = computed(() => !props.user || sameKeys(roleKeys.value, props.user.roles))

// The warning shows when the admin removes their own admin role.
const removesOwnAdmin = computed(
  () =>
    props.self
    && (props.user?.roles.includes(ADMIN_ROLE_KEY) ?? false)
    && !roleKeys.value.includes(ADMIN_ROLE_KEY)
)

async function save() {
  if (!props.user || saving.value || roleKeys.value.length === 0) {
    return
  }

  saving.value = true

  try {
    await $fetch(`/api/access/users/${props.user.id}/roles`, {
      method: 'PUT',
      body: { roleKeys: roleKeys.value },
    })

    toast.add({
      title: t('supabase.access.toasts.rolesSaved'),
      color: 'success',
      icon: 'lucide:circle-check',
    })

    if (props.self) {
      await permissions.load()
    }

    emit('saved')
    open.value = false
  } catch (error) {
    toast.add({
      title: t('supabase.access.toasts.failed'),
      description: errorText(error),
      color: 'error',
      icon: 'lucide:circle-x',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="t('supabase.access.editRoles.title')"
    :description="t('supabase.access.editRoles.description', { name })"
  >
    <template #body>
      <div class="flex flex-col gap-y-4">
        <UAlert
          v-if="removesOwnAdmin"
          :description="t('supabase.access.editRoles.selfAdmin')"
          color="warning"
          variant="subtle"
          icon="lucide:triangle-alert"
        />

        <UCheckboxGroup v-model="roleKeys" :items="items" />

        <p v-if="roleKeys.length === 0" class="text-muted text-sm">
          {{ t('supabase.access.editRoles.emptyHint') }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          {{ t('pluto.common.cancel') }}
        </UButton>
        <UButton
          :loading="saving"
          :disabled="unchanged || roleKeys.length === 0"
          icon="lucide:save"
          @click="save"
        >
          {{ t('supabase.access.editRoles.save') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
