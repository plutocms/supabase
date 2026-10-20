<script setup lang="ts">
// The email and password form of the supabase layer. It is the `signIn`
// component of the auth driver. Core renders it inside the login frame
// (PlutoAdminAuthCard), so this file has no frame. The file lives under
// `app/` so Tailwind scans it.
const props = defineProps<{
  /** A safe local path to open after sign-in. Core checks it. */
  redirect: string
}>()

const { t } = usePlutoI18n()

const { isSubmitting, login } = useAuth({ redirect: () => props.redirect })

const form = ref({
  email: '',
  password: '',
})

function submitForm() {
  login(form.value)
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <div class="flex flex-col gap-y-6">
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

      <UButton
        :loading="isSubmitting"
        type="submit"
        icon="lucide:log-in"
        class="w-full justify-center"
      >
        {{ t('supabase.auth.login.submit') }}
      </UButton>
    </div>
  </form>
</template>
