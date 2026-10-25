<script setup lang="ts">
// The invite form. It sends the invite, or copies the invite link when the
// server has the service role key. When Supabase's mailer refuses the invite
// (a team-only address, a rate limit, a bad address), an inline alert shows the
// cause with two ways out: copy the link, or set up email.
import type {
  AccessCapabilities,
  AccessInviteResult,
  AccessRole,
} from '../../../shared/types/access'
import { isInviteMailError, languageName } from '../../utils/access-ui'

const props = defineProps<{
  roles: AccessRole[]
  /** What the server offers. Null while it is not known. */
  capabilities: AccessCapabilities | null
}>()

const emit = defineEmits<{ done: [] }>()

const open = defineModel<boolean>('open', { required: true })

const { t, locale, locales } = usePlutoI18n()
const toast = useToast()
const errorText = usePlutoErrorText()

const email = ref('')
const name = ref('')
const roleKeys = ref<string[]>([])
const emailLocale = ref(locale.value)
const submitting = ref(false)
const showRolesError = ref(false)
// The cause shown in the inline alert, when the mailer refused the invite.
const mailProblem = ref<string | null>(null)
// The link of the finished invite, when the user must send it by hand.
const link = ref<string | null>(null)

const roleItems = computed(() =>
  props.roles.map((role) => ({
    label: role.label,
    value: role.key,
    description: role.description || undefined,
  }))
)

const localeItems = computed(() =>
  locales.value.map((code) => ({ label: languageName(code), value: code }))
)

const canCopyLink = computed(() => props.capabilities?.serviceKey === true)

// A fresh form each time the modal opens.
watch(open, (isOpen) => {
  if (isOpen) {
    email.value = ''
    name.value = ''
    roleKeys.value = []
    emailLocale.value = locale.value
    showRolesError.value = false
    mailProblem.value = null
    link.value = null
  }
})

function body() {
  return {
    email: email.value.trim(),
    roleKeys: roleKeys.value,
    displayName: name.value.trim() || undefined,
  }
}

function valid(): boolean {
  showRolesError.value = roleKeys.value.length === 0

  return !showRolesError.value
}

async function submit() {
  if (submitting.value || !valid()) {
    return
  }

  submitting.value = true
  mailProblem.value = null

  try {
    const result = await $fetch<AccessInviteResult>('/api/access/users/invite', {
      method: 'POST',
      body: { ...body(), locale: emailLocale.value },
    })

    emit('done')

    if (result.status === 'granted') {
      toast.add({
        title: t('supabase.access.toasts.granted', { email: email.value.trim() }),
        color: 'success',
        icon: 'lucide:circle-check',
      })
      open.value = false
    } else if (result.emailSent === false && result.link) {
      // The user exists and has the roles. Only the email failed.
      link.value = result.link
      toast.add({
        title: t('supabase.access.toasts.emailFailed', { email: email.value.trim() }),
        color: 'warning',
        icon: 'lucide:triangle-alert',
      })
    } else {
      toast.add({
        title: t('supabase.access.toasts.invited', { email: email.value.trim() }),
        color: 'success',
        icon: 'lucide:circle-check',
      })
      open.value = false
    }
  } catch (error) {
    if (isInviteMailError(error)) {
      mailProblem.value = errorText(error)
    } else {
      toast.add({
        title: t('supabase.access.toasts.failed'),
        description: errorText(error),
        color: 'error',
        icon: 'lucide:circle-x',
      })
    }
  } finally {
    submitting.value = false
  }
}

async function copyLink() {
  if (submitting.value || !valid()) {
    return
  }

  submitting.value = true

  try {
    const result = await $fetch<{ status: 'invited' | 'granted', link: string | null }>(
      '/api/access/users/invite-link',
      { method: 'POST', body: body() }
    )

    mailProblem.value = null
    emit('done')

    // A confirmed account gets no link: it signs in with its own password.
    if (!result.link) {
      toast.add({
        title: t('supabase.access.toasts.granted', { email: body().email }),
        color: 'success',
        icon: 'lucide:circle-check',
      })
      open.value = false
      return
    }

    link.value = result.link
  } catch (error) {
    toast.add({
      title: t('supabase.access.toasts.failed'),
      description: errorText(error),
      color: 'error',
      icon: 'lucide:circle-x',
    })
  } finally {
    submitting.value = false
  }
}

async function setupEmail() {
  open.value = false
  await navigateTo('/admin/settings/email?reason=invite')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="link ? t('supabase.access.invite.linkTitle') : t('supabase.access.invite.title')"
    :description="link ? t('supabase.access.invite.linkDescription') : t('supabase.access.invite.description')"
  >
    <template #body>
      <AccessLinkField v-if="link" :link="link" />

      <form v-else class="flex flex-col gap-y-4" @submit.prevent="submit">
        <UAlert
          v-if="mailProblem"
          :title="t('supabase.access.invite.mailProblem')"
          :description="mailProblem"
          color="warning"
          variant="subtle"
          icon="lucide:mail-warning"
        >
          <template #actions>
            <UButton
              v-if="canCopyLink"
              :loading="submitting"
              color="neutral"
              variant="outline"
              size="xs"
              icon="lucide:link"
              @click="copyLink"
            >
              {{ t('supabase.access.invite.copyLink') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              icon="lucide:settings"
              @click="setupEmail"
            >
              {{ t('supabase.access.invite.setupEmail') }}
            </UButton>
          </template>
        </UAlert>

        <p
          v-if="mailProblem && !canCopyLink"
          class="text-muted text-sm"
        >
          {{ t('supabase.access.invite.needsKey') }}
        </p>

        <UFormField :label="t('supabase.access.invite.email')" required>
          <UInput
            v-model="email"
            :placeholder="t('supabase.access.invite.emailPlaceholder')"
            type="email"
            autocomplete="off"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField :label="t('supabase.access.invite.name')">
          <UInput
            v-model="name"
            :placeholder="t('supabase.access.invite.namePlaceholder')"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('supabase.access.invite.roles')"
          :error="showRolesError && roleKeys.length === 0 ? t('supabase.access.invite.rolesRequired') : undefined"
          required
        >
          <UCheckboxGroup v-model="roleKeys" :items="roleItems" />
        </UFormField>

        <UFormField
          :label="t('supabase.access.invite.locale')"
          :description="t('supabase.access.invite.localeHint')"
        >
          <USelect v-model="emailLocale" :items="localeItems" class="w-full sm:w-64" />
        </UFormField>

        <!-- Enter in a field submits the form. -->
        <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <template v-if="link">
          <UButton @click="open = false">
            {{ t('supabase.access.invite.done') }}
          </UButton>
        </template>

        <template v-else>
          <UButton color="neutral" variant="outline" @click="open = false">
            {{ t('pluto.common.cancel') }}
          </UButton>
          <UButton :loading="submitting" icon="lucide:send" @click="submit">
            {{ t('supabase.access.invite.submit') }}
          </UButton>
        </template>
      </div>
    </template>
  </UModal>
</template>
