<script setup lang="ts">
// Confirms and removes the roles of one user. The account stays: only the
// admin access goes. Opened with useOverlay from the Users page.
import type { AccessUser } from '../../../shared/types/access'
import { userDisplayName } from '../../utils/access-ui'

const props = defineProps<{
  user: AccessUser
  /** True when the user is the signed-in admin. */
  self: boolean
}>()

const emit = defineEmits<{ close: [revoked: boolean] }>()

const { t } = usePlutoI18n()
const toast = useToast()
const errorText = usePlutoErrorText()
const permissions = usePlutoPermissions()

const working = ref(false)

async function revoke() {
  if (working.value) {
    return
  }

  working.value = true

  try {
    await $fetch(`/api/access/users/${props.user.id}/roles`, { method: 'DELETE' })

    toast.add({
      title: t('supabase.access.toasts.revoked'),
      color: 'success',
      icon: 'lucide:circle-check',
    })

    if (props.self) {
      await permissions.load()
    }

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
    :title="t('supabase.access.revoke.title')"
    :description="t('supabase.access.revoke.body', { name: userDisplayName(user) })"
    :close="{ onClick: () => emit('close', false) }"
  >
    <template #body>
      <UAlert
        v-if="self"
        :description="t('supabase.access.revoke.self')"
        color="warning"
        variant="subtle"
        icon="lucide:triangle-alert"
      />
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="emit('close', false)">
          {{ t('pluto.common.cancel') }}
        </UButton>
        <UButton :loading="working" color="error" icon="lucide:user-x" @click="revoke">
          {{ t('supabase.access.revoke.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
