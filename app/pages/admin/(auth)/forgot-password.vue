<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.auth.forgot.pageTitle'),
})

const { isSubmitting, requestPasswordReset } = await useAuth()

const email = ref('')
const isEmailSent = ref(false)

async function submitForm() {
  const result = await requestPasswordReset(email.value)

  if (result.success) {
    isEmailSent.value = true
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center p-4">
    <UCard class="w-full max-w-100">
      <div v-if="isEmailSent" class="space-y-6 py-10">
        <div class="text-center space-y-4">
          <hgroup class="flex flex-col gap-y-1">
            <span class="text-5xl">
              <UIcon name="lucide:mail" class="inline-block" />
            </span>

            <h1 class="text-3xl font-bold">{{ t('supabase.auth.forgot.sentTitle') }}</h1>
          </hgroup>

          <p>
            <SupabaseMessageParts :message="t('supabase.auth.forgot.sentDescription')">
              <template #email>
                <strong>{{ email }}</strong>
              </template>
            </SupabaseMessageParts>
          </p>

          <div class="flex items-center justify-center">
            <UButton variant="link" to="/admin/login" class="px-0">
              {{ t('supabase.auth.backToLogin') }}
            </UButton>
          </div>
        </div>
      </div>

      <form v-else @submit.prevent="submitForm">
        <div class="flex flex-col gap-y-6">
          <hgroup class="flex flex-col gap-y-1">
            <h1 class="text-3xl font-bold">{{ t('supabase.auth.forgot.title') }}</h1>
            <p class="text-sm text-muted">
              {{ t('supabase.auth.forgot.description') }}
            </p>
          </hgroup>

          <UFormField :label="t('supabase.auth.fields.email')">
            <UInput
              v-model="email"
              placeholder="victor@example.com"
              type="email"
              class="w-full"
              autocomplete="email"
              required
            />
          </UFormField>

          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4"
          >
            <UFormField>
              <UButton
                :loading="isSubmitting"
                type="submit"
                icon="lucide:send"
                class="w-full justify-center sm:w-auto"
              >
                {{ t('supabase.auth.forgot.submit') }}
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
