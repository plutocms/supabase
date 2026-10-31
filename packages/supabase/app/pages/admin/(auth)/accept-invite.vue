<script setup lang="ts">
import { parseInviteLink } from '../../../utils/invite-link'

definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.auth.invite.pageTitle'),
})

const route = useRoute()
const supabase = useSupabaseClient()
const auth = usePlutoAuth()

// The link decides the state. `checking` shows while the page reads it.
const state = ref<'checking' | 'ready' | 'expired' | 'invalid'>('checking')

// Read the link in the browser. The link tokens must not reach the server.
onMounted(async () => {
  const link = parseInviteLink(
    route.query as Record<string, string | string[] | null | undefined>,
    window.location.hash
  )

  // Remove the tokens from the address bar and from the history.
  history.replaceState(history.state, '', window.location.pathname)

  if (link.kind === 'otp') {
    const { error } = await supabase.auth.verifyOtp({
      type: link.type,
      token_hash: link.tokenHash,
    })
    state.value = error ? 'expired' : 'ready'

    return
  }

  if (link.kind === 'session') {
    const { error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    })
    state.value = error ? 'invalid' : 'ready'

    return
  }

  if (link.kind === 'error') {
    state.value = 'expired'

    return
  }

  const { data } = await supabase.auth.getSession()
  state.value = data.session ? 'ready' : 'invalid'
})

const { isSubmitting, updatePassword } = useAuth()

const form = ref({
  password: '',
  confirm_password: '',
})

const passwordMatch = computed(
  () => form.value.password === form.value.confirm_password
)

async function submitForm() {
  if (!passwordMatch.value) {
    return
  }

  const result = await updatePassword(form.value.password)

  if (result.success) {
    // Read the session again, so the admin shell sees the signed-in user.
    await auth.driver.value?.refresh?.()
    await navigateTo('/admin/home')
  }
}
</script>

<template>
  <PlutoAdminAuthCard
    :title="
      state === 'ready'
        ? t('supabase.auth.invite.title')
        : t('supabase.auth.invite.pageTitle')
    "
    :description="
      state === 'ready' ? t('supabase.auth.invite.description') : undefined
    "
  >
    <div
      v-if="state === 'checking'"
      class="flex items-center justify-center py-10"
    >
      <UIcon
        name="lucide:loader-circle"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <div v-else-if="state !== 'ready'" class="space-y-6 py-10 text-center">
      <span class="text-5xl">
        <UIcon name="lucide:link-2-off" class="inline-block" />
      </span>

      <p>
        {{
          state === 'expired'
            ? t('supabase.auth.invite.expired')
            : t('supabase.auth.invite.invalid')
        }}
      </p>

      <div class="flex items-center justify-center">
        <UButton to="/admin/login" color="primary" icon="lucide:log-in">
          {{ t('supabase.auth.backToLogin') }}
        </UButton>
      </div>
    </div>

    <form v-else @submit.prevent="submitForm">
      <div class="flex flex-col gap-y-6">
        <UFormField :label="t('supabase.auth.fields.password')">
          <UInput
            v-model="form.password"
            placeholder="••••"
            type="password"
            class="w-full"
            autocomplete="new-password"
            required
          />
        </UFormField>

        <UFormField
          :error="
            form.confirm_password && !passwordMatch
              ? t('supabase.auth.passwordMismatch')
              : undefined
          "
          :label="t('supabase.auth.fields.confirmPassword')"
        >
          <UInput
            v-model="form.confirm_password"
            placeholder="••••"
            type="password"
            class="w-full"
            autocomplete="new-password"
            required
          />
        </UFormField>

        <UButton
          :loading="isSubmitting"
          :disabled="!passwordMatch || !form.password"
          type="submit"
          icon="lucide:lock-keyhole"
          class="w-full justify-center"
        >
          {{ t('supabase.auth.invite.submit') }}
        </UButton>
      </div>
    </form>
  </PlutoAdminAuthCard>
</template>
