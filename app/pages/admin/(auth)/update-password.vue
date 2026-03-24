<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Update Password',
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
  <div class="grid h-full place-items-center">
    <UCard class="w-100">
      <div v-if="isPasswordUpdated" class="space-y-6 py-10">
        <div class="text-center space-y-4">
          <hgroup class="flex flex-col gap-y-1">
            <span class="text-5xl">
              <UIcon name="lucide:lock-keyhole" class="inline-block" />
            </span>

            <h1 class="text-3xl font-bold">Password Updated!</h1>
          </hgroup>

          <p>
            Your password has been changed. You can now log in with your new
            password.
          </p>

          <div class="flex items-center justify-center">
            <UButton to="/admin/login" color="primary" icon="lucide:log-in">
              Go to Login
            </UButton>
          </div>
        </div>
      </div>

      <form v-else @submit.prevent="submitForm">
        <div class="flex flex-col gap-y-6">
          <hgroup class="flex flex-col gap-y-1">
            <h1 class="text-3xl font-bold">Update Password</h1>
            <p class="text-sm text-muted">Enter your new password below.</p>
          </hgroup>

          <UFormField label="New Password">
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
                ? 'Passwords do not match.'
                : undefined
            "
            label="Confirm New Password"
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

          <div class="flex items-center justify-between gap-x-4">
            <UFormField>
              <UButton
                :loading="isSubmitting"
                :disabled="!passwordMatch"
                type="submit"
                icon="lucide:lock-keyhole"
              >
                Update Password
              </UButton>
            </UFormField>

            <UFormField>
              <UButton variant="link" to="/admin/login" class="px-0">
                Back to Login
              </UButton>
            </UFormField>
          </div>
        </div>
      </form>
    </UCard>
  </div>
</template>
