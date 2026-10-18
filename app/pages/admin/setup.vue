<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'

definePageMeta({
  middleware: ['setup-check'],
  layout: 'setup',
})

const { t, uiLocale } = usePlutoI18n()

useHead({
  title: () => t('supabase.setup.title'),
})

const config = useRuntimeConfig()
const projectId = config.public.supabase.url
  ?.split('https://')[1]
  ?.split('.')[0]

const toast = useToast()

const isDev = import.meta.dev

const items = computed<StepperItem[]>(() => [
  {
    title: t('supabase.setup.steps.database'),
    icon: 'i-lucide-database',
  },

  {
    title: t('supabase.setup.steps.complete'),
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
    return t('supabase.setup.submit')
  }

  return t('supabase.setup.next')
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
        title: t('supabase.connection.reconnected'),
        description: t('supabase.setup.reconnectedDescription'),
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
        title: t('supabase.setup.failed'),
        description: t('supabase.setup.failedDescription'),
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
      title: t('supabase.setup.complete'),
      description: t('supabase.setup.completeDescription'),
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
        title: t('supabase.connection.restarting'),
        description: t('supabase.setup.restartingDescription'),
        icon: 'lucide:refresh-cw',
        color: 'info',
      })

      const recovered = await waitForServerAndAdvance()

      if (recovered) {
        return
      }

      toast.add({
        title: t('supabase.connection.stillReconnecting'),
        description: t('supabase.connection.stillReconnectingDescription'),
        icon: 'lucide:triangle-alert',
        color: 'warning',
      })

      return
    }

    if (import.meta.dev) {
      console.error('Error setting up the database:', error)
    }

    toast.add({
      title: t('supabase.setup.error'),
      description: t('supabase.connection.checkConsole'),
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
  <UApp :locale="uiLocale">
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
                <UFormField :label="t('supabase.connection.connectionString')" required>
                  <UInput
                    v-model="databaseForm.connectionString"
                    :disabled="isSettingUpDatabase"
                    placeholder="postgresql://"
                    autofocus
                    required
                  />

                  <template #help>
                    <SupabaseMessageParts
                      :message="t('supabase.connection.connectionStringHelp')"
                    >
                      <template #link>
                        <ULink
                          :to="`https://supabase.com/dashboard/project/${projectId}/database/settings?showConnect=true&method=transaction`"
                          target="_blank"
                          class="underline"
                          external
                        >
                          {{ t('supabase.connection.connectionStringHelpLink') }}
                        </ULink>
                      </template>
                    </SupabaseMessageParts>
                  </template>
                </UFormField>

                <UFormField :label="t('supabase.connection.password')" required>
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
                    <SupabaseMessageParts
                      :message="t('supabase.connection.passwordInfo')"
                    >
                      <template #link>
                        <ULink
                          to="https://supabase.com/dashboard/project/_/database/settings"
                          target="_blank"
                        >
                          {{ t('supabase.connection.passwordInfoLink') }}
                        </ULink>
                      </template>
                    </SupabaseMessageParts>
                  </template>
                </UAlert>

                <UAlert
                  :title="t('supabase.connection.whyTitle')"
                  color="warning"
                  variant="outline"
                  icon="lucide:info"
                >
                  <template #description>
                    <div class="flex flex-col gap-y-4">
                      <p>
                        <SupabaseMessageParts
                          :message="t('supabase.setup.why')"
                        >
                          <template #promise>
                            <UTooltip :text="t('supabase.setup.promiseTooltip')">
                              <span
                                class="underline decoration-dotted cursor-help"
                              >
                                {{ t('supabase.setup.promise') }}</span
                              ></UTooltip
                            >
                          </template>
                        </SupabaseMessageParts>
                      </p>

                      <div>
                        <UPopover :content="{ side: 'bottom' }" arrow>
                          <UButton
                            :label="t('supabase.setup.technicalDetails')"
                            icon="lucide:lightbulb"
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
                                <SupabaseMessageParts
                                  :message="t('supabase.setup.technicalDetailsRequest')"
                                >
                                  <template #route>
                                    <ULink
                                      to="https://github.com/plutocms/supabase/blob/feat/setup-wizard/server/api/setup/create.post.ts"
                                      target="_blank"
                                      class="underline"
                                    >
                                      {{ t('supabase.setup.technicalDetailsRoute') }}</ULink
                                    >
                                  </template>
                                  <template #files>
                                    <ULink
                                      to="https://github.com/plutocms/supabase/tree/main/db/migrations"
                                      target="_blank"
                                      class="underline"
                                    >
                                      {{ t('supabase.setup.technicalDetailsFiles') }}</ULink
                                    >
                                  </template>
                                </SupabaseMessageParts>
                              </p>

                              <p>
                                {{ t('supabase.setup.technicalDetailsStored') }}
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
                  :title="t('supabase.connection.restartTitle')"
                  :description="t('supabase.setup.restartDescription')"
                  color="info"
                  variant="outline"
                  icon="lucide:refresh-cw"
                />
              </UForm>
            </section>

            <section v-if="currentStep === 1">
              <div class="flex flex-col gap-y-4">
                <hgroup class="text-center">
                  <span class="text-3xl">🎉</span>

                  <h1 class="font-bold text-2xl">{{ t('supabase.setup.doneTitle') }}</h1>
                </hgroup>

                <p class="text-balance text-center text-lg">
                  {{ t('supabase.setup.doneDescription') }}
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
                    {{ t('supabase.setup.goToSignup') }}
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
