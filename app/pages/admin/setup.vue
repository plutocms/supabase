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

const isDev = import.meta.dev

const items = ref<StepperItem[]>([
  {
    title: 'Database Setup',
    icon: 'i-lucide-database',
  },

  {
    title: 'Complete Setup',
    icon: 'i-lucide-check',
  },
])

const stepper = useTemplateRef('stepper')

const currentStep = ref<number>(0)

const isSettingUpDatabase = ref(false)

const databaseForm = ref({
  connectionString: '',
  password: '',
})

// Set only when the server reports it could not write DATABASE_URL to
// .env — see EnvPersistWarning.vue. Holds the connection string this page
// already sent once; never re-sent, only shown back on this same page.
const envNotPersisted = ref(false)
const submittedConnectionString = ref('')

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

const currentStepSubmitLabel = computed(() => {
  if (currentStep.value === 0) {
    return 'Set up database'
  }

  return 'Submit'
})

/**
 * Polls /api/settings/first_setup until the dev server responds again, and
 * advances the stepper once it does.
 *
 * Used only to wait out the restart described in the `catch` block of
 * `completeDatabaseSetup` — the server is expected to come back within a
 * few seconds, not to be actually down.
 */
async function waitForServerAndAdvance(): Promise<boolean> {
  const maxAttempts = 15
  const delayMs = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    try {
      await $fetch('/api/settings/first_setup')

      toast.add({
        title: 'Reconnected',
        description: 'The server is back. Your database has been set up.',
        icon: 'lucide:check-circle',
        color: 'success',
      })

      stepper.value?.next()

      return true
    } catch {
      // Still restarting — try again.
    }
  }

  return false
}

async function completeDatabaseSetup() {
  try {
    isSettingUpDatabase.value = true

    const connectionString = databaseForm.value.connectionString.replace(
      '[YOUR-PASSWORD]',
      encodeURIComponent(databaseForm.value.password)
    )

    const data = await $fetch<any>('/api/setup/create', {
      method: 'POST',
      body: {
        connectionString,
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

    if (data.persisted === false) {
      envNotPersisted.value = true
      submittedConnectionString.value = connectionString
    }

    toast.add({
      title: 'Database setup complete',
      description: 'Your database has been set up successfully.',
      icon: 'lucide:check-circle',
      color: 'success',
    })

    stepper.value?.next()
  } catch (error) {
    // Writing DATABASE_URL to .env (the last step of /api/setup/create,
    // after the schema and every layer migration already succeeded)
    // restarts the dev server. The response can be cut off by that
    // restart even though the setup itself worked. A dropped connection
    // has no HTTP status code — a real error response would — so use
    // that, and only in dev, to tell "still finishing" apart from a real
    // failure. See the matching comment in app/pages/admin/migrations.vue.
    const hasStatusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode?: unknown }).statusCode !== undefined

    if (import.meta.dev && !hasStatusCode) {
      toast.add({
        title: 'Dev server restarting',
        description: 'Setup is finishing. Reconnecting…',
        icon: 'lucide:refresh-cw',
        color: 'info',
      })

      const recovered = await waitForServerAndAdvance()

      if (recovered) {
        return
      }

      toast.add({
        title: 'Still reconnecting',
        description:
          'The dev server is taking longer than expected. Reload this page in a moment.',
        icon: 'lucide:triangle-alert',
        color: 'warning',
      })

      return
    }

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
  if (step === 0) {
    completeDatabaseSetup()
  }
}
</script>

<template>
  <UApp>
    <div class="flex min-h-dvh items-center justify-center p-4">
      <UCard class="w-full max-w-125">
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
                        <UPopover :content="{ side: 'bottom' }" arrow>
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
                                  to="https://github.com/plutocms/supabase/tree/main/db/migrations"
                                  target="_blank"
                                  class="underline"
                                >
                                  SQL files</ULink
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

                <UAlert
                  v-if="isDev"
                  color="info"
                  variant="outline"
                  title="This restarts the dev server"
                  icon="lucide:refresh-cw"
                  description="Saving your connection string writes it to .env. In development, that restarts the server automatically. The page will briefly show a reconnecting message — this is expected, not an error."
                />
              </UForm>
            </section>

            <section v-if="currentStep === 1">
              <div class="flex flex-col gap-y-4">
                <hgroup class="text-center">
                  <span class="text-3xl">🎉</span>

                  <h1 class="font-bold text-2xl">Setup Complete</h1>
                </hgroup>

                <p class="text-balance text-center text-lg">
                  Your database is ready. Create your admin account by signing
                  up.
                </p>

                <EnvPersistWarning
                  v-if="envNotPersisted"
                  :connection-string="submittedConnectionString"
                />

                <p class="text-center">
                  <UButton
                    icon="lucide:arrow-right"
                    to="/admin/signup"
                    color="primary"
                    trailing
                  >
                    Go to sign up
                  </UButton>
                </p>
              </div>
            </section>
          </div>

          <div class="flex justify-end">
            <div class="w-full sm:w-auto">
              <UButton
                v-if="stepper?.hasNext"
                :form="currentStepId"
                :loading="currentLoading"
                leading-icon="lucide:check"
                type="submit"
                class="w-full justify-center sm:w-auto"
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
