<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.auth.update.title'),
})

const route = useRoute()
const supabase = useSupabaseClient()

// Exchange the PKCE code for a session when arriving from a password reset email
onMounted(async () => {
  const code = route.query.code as string | undefined

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }
})

const { isSubmitting, updatePassword } = await useAuth()

const form = ref({
  password: '',
  confirm_password: '',
})

const passwordMatch = computed(() => {
  return form.value.password === form.value.confirm_password
})

const isPasswordUpdated = ref(false)

async function submitForm() {
  if (!passwordMatch.value) {
    return
  }

  const result = await updatePassword(form.value.password)

  if (result.success) {
    isPasswordUpdated.value = true

    await supabase.auth.signOut()
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center p-4">
    <UCard class="w-full max-w-100">
      <div v-if="isPasswordUpdated" class="space-y-6 py-10">
        <div class="text-center space-y-4">
          <hgroup class="flex flex-col gap-y-1">
            <span class="text-5xl">
              <UIcon name="lucide:lock-keyhole" class="inline-block" />
            </span>

            <h1 class="text-3xl font-bold">{{ t('supabase.auth.update.doneTitle') }}</h1>
          </hgroup>

          <p>
            {{ t('supabase.auth.update.doneDescription') }}
          </p>

          <div class="flex items-center justify-center">
            <UButton to="/admin/login" color="primary" icon="lucide:log-in">
              {{ t('supabase.auth.update.goToLogin') }}
            </UButton>
          </div>
        </div>
      </div>

      <form v-else @submit.prevent="submitForm">
        <div class="flex flex-col gap-y-6">
          <hgroup class="flex flex-col gap-y-1">
            <h1 class="text-3xl font-bold">{{ t('supabase.auth.update.title') }}</h1>
            <p class="text-sm text-muted">
              {{ t('supabase.auth.update.description') }}
            </p>
          </hgroup>

          <UFormField :label="t('supabase.auth.update.newPassword')">
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
            :label="t('supabase.auth.update.confirmNewPassword')"
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

          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4"
          >
            <UFormField>
              <UButton
                :loading="isSubmitting"
                :disabled="!passwordMatch"
                type="submit"
                icon="lucide:lock-keyhole"
                class="w-full justify-center sm:w-auto"
              >
                {{ t('supabase.auth.update.submit') }}
              </UButton>
            </UFormField>

            <UFormField>
              <UButton variant="link" to="/admin/login" class="px-0">
                {{ t('supabase.auth.backToLogin') }}
              </UButton>
            </UFormField>
          </div>
        </div>
      </form>
    </UCard>
  </div>
</template>
