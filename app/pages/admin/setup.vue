<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'

definePageMeta({
  middleware: ['setup-check'],
  layout: 'setup',
})

useHead({
  title: 'Setup Wizard',
})

const toast = useToast()

const items = ref<StepperItem[]>([
  {
    title: 'Database Setup',
    icon: 'i-lucide-database',
  },

  /* {
    title: 'Admin Account',
    icon: 'i-lucide-user',
  }, */

  {
    title: 'Complete Setup',
    icon: 'i-lucide-check',
  },
])

const stepper = useTemplateRef('stepper')

const currentStep = ref<number>(0)

const isSettingUpDatabase = ref(false)
const databaseForm = ref({
  password: '',
})

const currentLoading = computed(() => {
  if (currentStep.value === 0) {
    return isSettingUpDatabase.value
  }

  return false
})

const currentStepId = computed(() => {
  if (currentStep.value === 0) {
    return 'database-setup-form'
  }

  return undefined
})

async function completeSetup() {
  try {
    isSettingUpDatabase.value = true

    const data = await $fetch<any>('/api/setup/create', {
      method: 'POST',
      body: {
        baseUrl: window.location.origin,
        password: databaseForm.value.password,
      },
    })

    if (data.success === false) {
      toast.add({
        title: 'Database setup failed',
        description: 'Please check your password and try again.',
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return
    }

    toast.add({
      title: 'Database setup complete',
      description: 'Your database has been set up successfully.',
      icon: 'lucide:check-circle',
      color: 'success',
    })

    stepper.value?.next()
  } catch (error) {
    if (import.meta.dev) {
      console.error('Error setting up the database:', error)
    }

    toast.add({
      title: 'Error setting up the database',
      description: 'Please check the console for more details.',
      icon: 'lucide:circle-x',
      color: 'error',
    })
  } finally {
    isSettingUpDatabase.value = false
  }
}

function handleStepChange(step: number) {
  if (step === 1) {
    completeSetup()
  }
}
</script>

<template>
  <UApp>
    <div class="flex justify-center items-center h-screen">
      <UCard class="w-[500px]">
        <div class="flex flex-col gap-y-8">
          <UStepper
            ref="stepper"
            v-model="currentStep"
            :items="items"
            disabled
            linear
          />

          <div>
            <section v-if="currentStep === 0">
              <UForm
                id="database-setup-form"
                class="flex flex-col gap-y-4"
                @submit="handleStepChange(currentStep + 1)"
              >
                <UFormField label="Database password" required>
                  <UInput
                    v-model="databaseForm.password"
                    :disabled="isSettingUpDatabase"
                    type="password"
                    placeholder="• • • • • • • •"
                    autofocus
                    required
                  />
                </UFormField>

                <UAlert
                  color="secondary"
                  icon="lucide:badge-info"
                  variant="outline"
                >
                  <template #description>
                    Your password is created when you create your Supabase
                    project. You can change it in the
                    <ULink
                      to="https://supabase.com/dashboard/project/_/database/settings"
                      target="_blank"
                    >
                      Supabase Database Settings </ULink
                    >.
                  </template>
                </UAlert>

                <UAlert
                  color="warning"
                  variant="outline"
                  title="Why do I need to provide a database password?"
                  icon="lucide:info"
                >
                  <template #description>
                    <div class="flex flex-col gap-y-4">
                      <p>
                        It will be used to create your database structure. It
                        won't be stored anywhere. That's a
                        <UTooltip
                          text="Click on the 'Technical details' button for more info"
                        >
                          <span class="underline decoration-dotted cursor-help">
                            promise</span
                          ></UTooltip
                        >! 😉
                      </p>

                      <div>
                        <UPopover :content="{ side: 'right' }" arrow>
                          <UButton
                            icon="lucide:lightbulb"
                            label="Technical details"
                            color="info"
                            variant="subtle"
                            class="w-fit"
                            size="sm"
                          />

                          <template #content>
                            <div
                              class="flex flex-col gap-y-4 max-w-xs p-4 text-white text-sm"
                            >
                              <p>
                                When you click "Next", a request to
                                <ULink
                                  to="https://github.com/plutocms/supabase/blob/feat/setup-wizard/server/api/setup/create.post.ts"
                                  target="_blank"
                                  class="underline"
                                >
                                  a server route</ULink
                                >
                                will be made with the database password you
                                provided. This API will then use this password
                                to make a direct PostgreSQL connection to your
                                Supabase database and run the SQL queries from
                                this
                                <ULink
                                  to="https://github.com/plutocms/supabase/blob/feat/setup-wizard/public/schema.sql"
                                  target="_blank"
                                  class="underline"
                                >
                                  SQL file</ULink
                                >.
                              </p>

                              <p>
                                After the setup is complete, the password will
                                NOT be stored or used for any other purpose.
                              </p>
                            </div>
                          </template>
                        </UPopover>
                      </div>
                    </div>
                  </template>
                </UAlert>
              </UForm>
            </section>

            <section v-else-if="currentStep === 1">
              <div class="flex flex-col gap-y-4">
                <h1 class="text-2xl font-bold text-center">
                  Setup Complete 🎉
                </h1>

                <p>
                  Your database has been set up successfully! 🎉 You can now log
                  in to the admin panel using your Supabase credentials.
                </p>

                <p class="text-center">
                  <ULink to="/admin/login" class="underline">
                    Go to login page</ULink
                  >
                </p>
              </div>
            </section>
          </div>

          <div class="flex justify-end">
            <div>
              <UButton
                v-if="stepper?.hasNext"
                :form="currentStepId"
                :loading="currentLoading"
                leading-icon="lucide:check"
                trailing-icon="lucide:arrow-right"
                type="submit"
              >
                Submit and continue
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UApp>
</template>
