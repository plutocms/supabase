<script setup lang="ts">
// Confirms and deletes a role. It says how many users lose the role. Opened
// with useOverlay from the Roles page.
import type { AccessRole } from '../../../shared/types/access'

const props = defineProps<{
  role: AccessRole
}>()

const emit = defineEmits<{ close: [deleted: boolean] }>()

const { t } = usePlutoI18n()
const toast = useToast()
const errorText = usePlutoErrorText()

const working = ref(false)

async function remove() {
  if (working.value) {
    return
  }

  working.value = true

  try {
    await $fetch(`/api/_pluto/supabase/access/roles/${props.role.key}`, {
      method: 'DELETE',
    })

    toast.add({
      title: t('supabase.access.toasts.roleDeleted'),
      color: 'success',
      icon: 'lucide:circle-check',
    })
    emit('close', true)
  } catch (error) {
    toast.add({
      title: t('supabase.access.toasts.failed'),
      description: errorText(error),
      color: 'error',
      icon: 'lucide:circle-x',
    })
  } finally {
    working.value = false
  }
}
</script>

<template>
  <UModal
    :title="t('supabase.access.deleteRole.title')"
    :description="t('supabase.access.deleteRole.body', { name: role.label })"
    :close="{ onClick: () => emit('close', false) }"
  >
    <template #body>
      <UAlert
        :description="
          t('supabase.access.deleteRole.usersLose', role.user_count)
        "
        :color="role.user_count > 0 ? 'warning' : 'neutral'"
        variant="subtle"
        icon="lucide:users"
      />
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="emit('close', false)"
        >
          {{ t('pluto.common.cancel') }}
        </UButton>
        <UButton
          :loading="working"
          color="error"
          icon="lucide:trash-2"
          @click="remove"
        >
          {{ t('supabase.access.deleteRole.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
