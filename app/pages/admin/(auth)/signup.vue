<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t, te } = usePlutoI18n()
const errorText = usePlutoErrorText()

useHead({
  title: () => t('supabase.auth.signup.pageTitle'),
})

const toast = useToast()

const form = ref({
  email: '',
  username: '',
  display_name: '',
  password: '',
  confirm_password: '',
})

const isSubmitting = ref<boolean>(false)

const passwordMatch = computed(() => {
  return form.value.password === form.value.confirm_password
})

const isEmailVerificationMessageVisible = ref<boolean>(false)

async function submitForm() {
  if (!passwordMatch.value) {
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/_pluto/supabase/auth/signup', {
      method: 'POST',
      body: {
        email: form.value.email,
        username: form.value.username,
        display_name: form.value.display_name,
        password: form.value.password,
      },
    })

    toast.add({
      title: t('supabase.auth.signup.created'),
      description: t('supabase.auth.signup.createdDescription'),
      icon: 'lucide:check',
      color: 'success',
    })

    isEmailVerificationMessageVisible.value = true
  } catch (error) {
    console.error('Error signing up:', error)

    toast.add({
      title: t('supabase.auth.signup.failed'),
      description: resolveAuthErrorText(
        {
          code: failureData(error)?.code,
          message: (error as { data?: { statusMessage?: string } }).data?.statusMessage
            ?? errorText(error, 'supabase.auth.errors.unknown'),
        },
        { t, te }
      ),
      icon: 'lucide:circle-x',
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <PlutoAdminAuthCard
    :title="isEmailVerificationMessageVisible ? t('supabase.auth.signup.almostThere') : t('supabase.auth.signup.title')"
  >
    <div v-if="isEmailVerificationMessageVisible" class="space-y-6 py-10">
      <div class="text-center space-y-4">
        <hgroup class="flex flex-col gap-y-1">
          <span class="text-5xl">
            <UIcon name="lucide:mail-warning" class="inline-block" />
          </span>
        </hgroup>

        <p>
          {{ t('supabase.auth.signup.verificationSent') }}
        </p>

        <UAlert icon="lucide:check" color="success" variant="outline">
          <template #description>
            {{ t('supabase.auth.signup.closePage') }}
          </template>
        </UAlert>

        <UAlert
          icon="lucide:alert-triangle"
          color="warning"
          variant="outline"
        >
          <template #description>
            {{ t('supabase.auth.signup.checkSpam') }}
          </template>
        </UAlert>
      </div>
    </div>

    <form v-else @submit.prevent="submitForm">
      <div class="flex flex-col gap-y-6">

        <UFormField :label="t('supabase.auth.fields.email')" required>
          <UInput
            v-model="form.email"
            type="email"
            placeholder="victor@example.com"
            class="w-full"
            required
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('supabase.auth.fields.username')" required>
            <UInput
              v-model="form.username"
              :placeholder="t('supabase.auth.signup.usernamePlaceholder')"
              class="w-full"
              minlength="3"
              required
            />
          </UFormField>

          <UFormField :label="t('supabase.auth.fields.displayName')" required>
            <UInput
              v-model="form.display_name"
              :placeholder="t('supabase.auth.signup.displayNamePlaceholder')"
              class="w-full"
              required
            />
          </UFormField>
        </div>

        <UFormField
          :error="!passwordMatch"
          :label="t('supabase.auth.fields.password')"
          required
        >
          <UInput
            v-model="form.password"
            placeholder="••••"
            class="w-full"
            type="password"
            required
          />
        </UFormField>

        <UFormField
          :error="!passwordMatch"
          :label="t('supabase.auth.fields.confirmPassword')"
          required
        >
          <UInput
            v-model="form.confirm_password"
            placeholder="••••"
            class="w-full"
            type="password"
            required
          />
        </UFormField>

        <div
          class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4"
        >
          <UFormField>
            <UButton
              to="/admin/login"
              icon="lucide:arrow-left"
              variant="link"
              class="px-0"
            >
              {{ t('supabase.auth.backToLogin') }}
            </UButton>
          </UFormField>

          <UFormField>
            <UButton
              :disabled="isSubmitting || !passwordMatch"
              :loading="isSubmitting"
              type="submit"
              class="w-full justify-center sm:w-auto"
            >
              {{ t('supabase.auth.signup.submit') }}
            </UButton>
          </UFormField>
        </div>
      </div>
    </form>
  </PlutoAdminAuthCard>
</template>
