<script setup lang="ts">
// Creates or edits a role. The `admin` role opens read-only: it has full
// access and the server refuses to change it. Capabilities show as one group
// of checkboxes for each layer, and an "Other" group for a string that no
// layer declares.
import type { AccessRole } from '../../../shared/types/access'
import {
  ADMIN_ROLE_KEY,
  isValidRoleKey,
  ROLE_KEY_MAX,
  slugifyRoleKey,
} from '../../utils/access-ui'

const props = defineProps<{
  /** The role to edit. Null creates a new role. */
  role: AccessRole | null
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })

const { t } = usePlutoI18n()
const toast = useToast()
const errorText = usePlutoErrorText()
const { groupsFor } = usePlutoCapabilities()

type CapabilityGroup = ReturnType<typeof groupsFor>[number]

const label = ref('')
const key = ref('')
const keyTouched = ref(false)
const description = ref('')
const selected = ref<string[]>([])
const saving = ref(false)
const submitted = ref(false)

const creating = computed(() => props.role === null)
const fullAccess = computed(() => props.role?.key === ADMIN_ROLE_KEY)

const title = computed(() => {
  if (creating.value) {
    return t('supabase.access.role.titleCreate')
  }

  return fullAccess.value
    ? t('supabase.access.role.titleView')
    : t('supabase.access.role.titleEdit')
})

// A fresh form each time the slideover opens.
watch(
  () => [open.value, props.role?.key] as const,
  ([isOpen]) => {
    if (!isOpen) {
      return
    }

    label.value = props.role?.label ?? ''
    key.value = props.role?.key ?? ''
    keyTouched.value = false
    description.value = props.role?.description ?? ''
    selected.value = [...(props.role?.capabilities ?? [])]
    submitted.value = false
  },
  { immediate: true }
)

// The key follows the name until the admin edits the key.
watch(label, (value) => {
  if (creating.value && !keyTouched.value) {
    key.value = slugifyRoleKey(value)
  }
})

const groups = computed<CapabilityGroup[]>(() =>
  groupsFor(props.role?.capabilities ?? [])
)

function groupItems(group: CapabilityGroup) {
  return group.items.map((item) => ({
    label: item.label,
    value: item.key,
    description: item.description,
  }))
}

function groupValue(group: CapabilityGroup): string[] {
  const keys = new Set(group.items.map((item) => item.key))

  return selected.value.filter((value) => keys.has(value))
}

function setGroup(group: CapabilityGroup, value: string[]) {
  const keys = new Set(group.items.map((item) => item.key))

  selected.value = [
    ...selected.value.filter((current) => !keys.has(current)),
    ...value,
  ]
}

const keyError = computed(() =>
  creating.value && submitted.value && !isValidRoleKey(key.value)
    ? t('supabase.access.role.keyInvalid')
    : undefined
)
const capabilitiesError = computed(() =>
  submitted.value && selected.value.length === 0
    ? t('supabase.access.role.capabilitiesRequired')
    : undefined
)

async function save() {
  submitted.value = true

  if (
    saving.value ||
    fullAccess.value ||
    !label.value.trim() ||
    keyError.value ||
    capabilitiesError.value
  ) {
    return
  }

  saving.value = true

  const body = {
    label: label.value.trim(),
    description: description.value.trim(),
    capabilities: selected.value,
  }

  try {
    if (creating.value) {
      await $fetch('/api/_pluto/supabase/access/roles', {
        method: 'POST',
        body: { ...body, key: key.value },
      })
    } else {
      await $fetch(`/api/_pluto/supabase/access/roles/${props.role!.key}`, {
        method: 'PUT',
        body,
      })
    }

    toast.add({
      title: creating.value
        ? t('supabase.access.toasts.roleCreated')
        : t('supabase.access.toasts.roleSaved'),
      color: 'success',
      icon: 'lucide:circle-check',
    })
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
    :title="title"
    :description="t('supabase.access.role.description')"
  >
    <template #body>
      <UAlert
        v-if="fullAccess"
        :title="t('supabase.access.roles.fullAccess')"
        :description="t('supabase.access.role.fullAccessNote')"
        color="neutral"
        variant="subtle"
        icon="lucide:shield-check"
      />

      <form v-else class="flex flex-col gap-y-5" @submit.prevent="save">
        <UFormField
          :label="t('supabase.access.role.label')"
          :error="
            submitted && !label.trim()
              ? t('supabase.access.errors.invalidLabel')
              : undefined
          "
          required
        >
          <UInput
            v-model="label"
            :placeholder="t('supabase.access.role.labelPlaceholder')"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="creating"
          :label="t('supabase.access.role.key')"
          :help="t('supabase.access.role.keyHint')"
          :error="keyError"
          required
        >
          <UInput
            v-model="key"
            :maxlength="ROLE_KEY_MAX"
            autocomplete="off"
            class="w-full font-mono"
            @input="keyTouched = true"
          />
        </UFormField>

        <UFormField :label="t('supabase.access.role.about')">
          <UTextarea
            v-model="description"
            :rows="2"
            :placeholder="t('supabase.access.role.aboutPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('supabase.access.role.capabilities')"
          :error="capabilitiesError"
          required
        >
          <div class="flex flex-col gap-y-4">
            <div
              v-for="group in groups"
              :key="group.id"
              class="flex flex-col gap-y-2"
            >
              <h3 class="text-highlighted text-sm font-semibold">
                {{ group.label }}
              </h3>
              <UCheckboxGroup
                :model-value="groupValue(group)"
                :items="groupItems(group)"
                @update:model-value="setGroup(group, $event as string[])"
              />
            </div>
          </div>
        </UFormField>

        <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          {{ fullAccess ? t('pluto.common.close') : t('pluto.common.cancel') }}
        </UButton>
        <UButton
          v-if="!fullAccess"
          :loading="saving"
          icon="lucide:save"
          @click="save"
        >
          {{ t('supabase.access.role.save') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
