<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'

definePageMeta({
  middleware: ['setup-check'],
  layout: 'setup',
})

useHead({
  title: 'Setup Wizard',
})

const config = useRuntimeConfig()
const projectId = config.public.supabase.url
  ?.split('https://')[1]
  ?.split('.')[0]

const toast = useToast()

const items = ref<StepperItem[]>([
  {
    title: 'Database Setup',
    icon: 'i-lucide-database',
  },

  {
    title: 'Admin Account',
    icon: 'i-lucide-user',
  },

  {
    title: 'Complete Setup',
    icon: 'i-lucide-check',
  },
])

const stepper = useTemplateRef('stepper')

const currentStep = ref<number>(0)

const isSettingUpDatabase = ref(false)
const isCreatingAdmin = ref(false)

const databaseForm = ref({
  connectionString: '',
  password: '',
})

const adminForm = ref({
  username: '',
  display_name: '',
  email: '',
  password: '',
})

const currentLoading = computed(() => {
  if (currentStep.value === 0) {
    return isSettingUpDatabase.value
  }

  if (currentStep.value === 1) {
    return isCreatingAdmin.value
  }

  return false
})

const currentStepId = computed(() => {
  if (currentStep.value === 0) {
    return 'database-setup-form'
  }

  if (currentStep.value === 1) {
    return 'admin-setup-form'
  }

  return undefined
})

const currentStepSubmitLabel = computed(() => {
  if (currentStep.value === 0) {
    return 'Set up database'
  }

  if (currentStep.value === 1) {
    return 'Create admin account'
  }

  return 'Submit'
})

async function completeDatabaseSetup() {
  try {
    isSettingUpDatabase.value = true

    const data = await $fetch<any>('/api/setup/create', {
      method: 'POST',
      body: {
        baseUrl: window.location.origin,
        connectionString: databaseForm.value.connectionString.replace(
          '[YOUR-PASSWORD]',
          encodeURIComponent(databaseForm.value.password)
        ),
        adminForm: adminForm.value,
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

async function createAdminAccount() {
  try {
    isCreatingAdmin.value = true

    const data = await $fetch('/api/signup', {
      method: 'POST',
      body: {
        username: adminForm.value.username,
        display_name: adminForm.value.display_name,
        email: adminForm.value.email,
        password: adminForm.value.password,
        is_admin: true,
      },
    })

    if (data.success === false) {
      toast.add({
        title: 'Admin account creation failed',
        description: data.message || 'Please try again.',
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return
    }

    toast.add({
      title: 'Admin account created',
      description: 'Your admin account has been created successfully.',
      icon: 'lucide:check-circle',
      color: 'success',
    })

    stepper.value?.next()
  } catch (error) {
    if (import.meta.dev) {
      console.error('Error creating admin account:', error)
    }

    toast.add({
      title: 'Error creating admin account',
      description: 'Please check the console for more details.',
      icon: 'lucide:circle-x',
      color: 'error',
    })
  } finally {
    isCreatingAdmin.value = false
  }
}

function handleStepChange(step: number) {
  if (step === 0) {
    completeDatabaseSetup()
  }

  if (step === 1) {
    createAdminAccount()
  }
}
</script>

<template>
  <UApp>
    <div class="flex justify-center items-center h-screen">
      <UCard class="w-[500px]">
        <div class="flex flex-col gap-y-8">
          <UStepper ref="stepper" v-model="currentStep" :items="items" linear />

          <div>
            <section v-if="currentStep === 0">
              <UForm
                id="database-setup-form"
                class="flex flex-col gap-y-4"
                @submit="handleStepChange(currentStep)"
              >
                <UFormField label="Supabase connection string" required>
                  <UInput
                    v-model="databaseForm.connectionString"
                    :disabled="isSettingUpDatabase"
                    placeholder="postgresql://"
                    autofocus
                    required
                  />

                  <template #help>
                    You can find your connection string
                    <ULink
                      :to="`https://supabase.com/dashboard/project/${projectId}/database/settings?showConnect=true&method=transaction`"
                      target="_blank"
                      class="underline"
                      external
                    >
                      clicking here </ULink
                    >.
                  </template>
                </UFormField>

                <UFormField label="Database password" required>
                  <UInput
                    v-model="databaseForm.password"
                    :disabled="isSettingUpDatabase"
                    type="password"
                    placeholder="• • • • •"
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

            <section v-if="currentStep === 1">
              <UForm
                id="admin-setup-form"
                class="grid grid-cols-2 gap-4"
                @submit="handleStepChange(currentStep)"
              >
                <UFormField label="Email" class="col-span-2" required>
                  <UInput
                    v-model="adminForm.email"
                    :disabled="isCreatingAdmin"
                    placeholder="you@example.com"
                    autofocus
                    required
                  />
                </UFormField>

                <UFormField label="Username" required>
                  <UInput
                    v-model="adminForm.username"
                    :disabled="isCreatingAdmin"
                    placeholder="Username"
                    required
                  />
                </UFormField>

                <UFormField label="Display Name" required>
                  <UInput
                    v-model="adminForm.display_name"
                    :disabled="isCreatingAdmin"
                    placeholder="Display Name"
                    required
                  />
                </UFormField>

                <UFormField label="Password" class="col-span-2" required>
                  <UInput
                    v-model="adminForm.password"
                    :disabled="isCreatingAdmin"
                    type="password"
                    placeholder="• • • • "
                    required
                  />
                </UFormField>
              </UForm>
            </section>

            <section v-else-if="currentStep === 2">
              <div class="flex flex-col gap-y-4">
                <hgroup class="text-center">
                  <span class="text-3xl">🎉</span>

                  <h1 class="font-bold text-2xl">Setup Complete</h1>
                </hgroup>

                <p class="text-balance text-center text-lg">
                  Your database is ready and your admin account has been
                  created.
                </p>

                <UAlert icon="lucide:info" color="warning" variant="outline">
                  <template #description>
                    <p>
                      You need to confirm your email address before you can log
                      in. Please check your inbox and click on the confirmation
                      link. If you don't see the email, please check your spam
                      folder.
                    </p>
                  </template>
                </UAlert>

                <p class="text-center">
                  <UButton
                    icon="lucide:arrow-right"
                    to="/admin/login"
                    color="primary"
                    trailing
                  >
                    Go to login page
                  </UButton>
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
                type="submit"
              >
                {{ currentStepSubmitLabel }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UApp>
</template>
