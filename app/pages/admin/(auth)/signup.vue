<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Sign Up',
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
    await $fetch('/api/signup', {
      method: 'POST',
      body: {
        email: form.value.email,
        username: form.value.username,
        display_name: form.value.display_name,
        password: form.value.password,
      },
    })

    toast.add({
      title: 'Account created successfully',
      description: 'You still need to verify your email before you can log in.',
      icon: 'lucide:check',
      color: 'success',
    })

    isEmailVerificationMessageVisible.value = true
  } catch (error) {
    console.error('Error signing up:', error)

    toast.add({
      title: 'Could not create account',
      description:
        error instanceof Error ? error.message : 'An unknown error occurred.',
      icon: 'lucide:circle-x',
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid h-full place-items-center">
    <UCard class="w-100">
      <div v-if="isEmailVerificationMessageVisible" class="space-y-6 py-10">
        <div class="text-center space-y-4">
          <hgroup class="flex flex-col gap-y-1">
            <span class="text-5xl">
              <UIcon name="lucide:mail-warning" class="inline-block" />
            </span>

            <h1 class="text-3xl font-bold">Almost there!</h1>
          </hgroup>

          <p>
            A verification link has been sent to your email. Please check your
            inbox and follow the instructions to verify your account.
          </p>

          <UAlert icon="lucide:check" color="success" variant="outline">
            <template #description>
              You can close this page. You will be logged in automatically once
              you verify your email.
            </template>
          </UAlert>

          <UAlert
            icon="lucide:alert-triangle"
            color="warning"
            variant="outline"
          >
            <template #description>
              If you don't see the email, please check your spam folder.
            </template>
          </UAlert>
        </div>
      </div>

      <form v-else @submit.prevent="submitForm">
        <div class="flex flex-col gap-y-6">
          <h1 class="text-3xl font-bold">Create Account</h1>

          <UFormField label="Email" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="victor@example.com"
              class="w-full"
              required
            />
          </UFormField>

          <div class="flex gap-x-4">
            <UFormField label="Username" required>
              <UInput
                v-model="form.username"
                placeholder="e.g: johndoe"
                class="w-full"
                minlength="3"
                required
              />
            </UFormField>

            <UFormField label="Display Name" required>
              <UInput
                v-model="form.display_name"
                placeholder="e.g: John Doe"
                class="w-full"
                required
              />
            </UFormField>
          </div>

          <UFormField :error="!passwordMatch" label="Password" required>
            <UInput
              v-model="form.password"
              placeholder="••••"
              class="w-full"
              type="password"
              required
            />
          </UFormField>

          <UFormField :error="!passwordMatch" label="Confirm Password" required>
            <UInput
              v-model="form.confirm_password"
              placeholder="••••"
              class="w-full"
              type="password"
              required
            />
          </UFormField>

          <div class="flex items-center justify-between gap-x-4">
            <UFormField>
              <UButton
                to="/admin/login"
                icon="lucide:arrow-left"
                variant="link"
                class="px-0"
              >
                Back to Login
              </UButton>
            </UFormField>

            <UFormField>
              <UButton
                :disabled="isSubmitting || !passwordMatch"
                :loading="isSubmitting"
                type="submit"
              >
                Create account
              </UButton>
            </UFormField>
          </div>
        </div>
      </form>
    </UCard>
  </div>
</template>
