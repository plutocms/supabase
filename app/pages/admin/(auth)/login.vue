<script setup lang="ts">
interface Form {
  email: string
  password: string
}

definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.auth.login.title'),
})

const { isSubmitting, login } = await useAuth()

const form = ref<Form>({
  email: '',
  password: '',
})

function submitForm() {
  login(form.value)
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center p-4">
    <UCard class="w-full max-w-100">
      <form @submit.prevent="submitForm">
        <div class="flex flex-col gap-y-6">
          <h1 class="text-3xl font-bold">{{ t('supabase.auth.login.title') }}</h1>

          <UFormField :label="t('supabase.auth.fields.email')">
            <UInput
              v-model="form.email"
              placeholder="victor@example.com"
              class="w-full"
              autocomplete="email"
            />
          </UFormField>

          <UFormField :label="t('supabase.auth.fields.password')">
            <UInput
              v-model="form.password"
              placeholder="••••"
              class="w-full"
              type="password"
            />
          </UFormField>

          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4"
          >
            <UFormField>
              <UButton
                :loading="isSubmitting"
                type="submit"
                icon="lucide:log-in"
                class="w-full justify-center sm:w-auto"
              >
                {{ t('supabase.auth.login.submit') }}
              </UButton>
            </UFormField>

            <UFormField>
              <UButton variant="link" to="/admin/signup" class="px-0">
                {{ t('supabase.auth.login.createAccount') }}
              </UButton>
            </UFormField>
          </div>

          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <UButton
              variant="link"
              icon="lucide:arrow-left"
              to="/"
              class="px-0"
            >
              {{ t('supabase.auth.login.backToHome') }}
            </UButton>

            <UButton variant="link" to="/admin/forgot-password" class="px-0">
              {{ t('supabase.auth.login.forgotPassword') }}
            </UButton>
          </div>
        </div>
      </form>
    </UCard>
  </div>
</template>
