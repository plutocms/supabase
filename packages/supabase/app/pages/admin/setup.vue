<script setup lang="ts">
// Before any account exists: the layout and the card of the admin auth pages.
definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.setup.title'),
})

const config = useRuntimeConfig()
const projectId = config.public.supabase.url
  ?.split('https://')[1]
  ?.split('.')[0]

const toast = useToast()

const isDev = import.meta.dev

// The form, then the result (after a setup that worked).
const done = ref(false)
const detailsOpen = ref(false)

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

/**
 * Polls /api/_pluto/supabase/setup until the dev server responds again, and
 * shows the result once it does.
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
      await $fetch('/api/_pluto/supabase/setup')

      toast.add({
        title: t('supabase.connection.reconnected'),
        description: t('supabase.setup.reconnectedDescription'),
        icon: 'lucide:check-circle',
        color: 'success',
      })

      done.value = true

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

    const data = await $fetch<any>('/api/_pluto/supabase/setup', {
      method: 'POST',
      body: {
        connectionString,
      },
    })

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

    done.value = true
  } catch (error) {
    // The route answers a failed setup with an HTTP error that carries the
    // scrubbed database error in its data.
    if (typeof failureData(error)?.error === 'string') {
      toast.add({
        title: t('supabase.setup.failed'),
        description: t('supabase.setup.failedDescription'),
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return
    }

    // Writing DATABASE_URL to .env (the last step of /api/_pluto/supabase/setup,
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
</script>

<template>
  <PlutoAdminAuthCard
    :title="done ? t('supabase.setup.doneTitle') : t('supabase.setup.title')"
    :description="
      done
        ? t('supabase.setup.doneDescription')
        : t('supabase.setup.description')
    "
    wide
  >
    <template v-if="done">
      <EnvPersistWarning
        v-if="envNotPersisted"
        :connection-string="submittedConnectionString"
      />

      <UButton
        :label="t('supabase.setup.goToSignup')"
        to="/admin/signup"
        trailing-icon="lucide:arrow-right"
        class="w-full justify-center"
      />
    </template>

    <UForm v-else class="flex flex-col gap-y-5" @submit="completeDatabaseSetup">
      <UFormField :label="t('supabase.connection.connectionString')" required>
        <UInput
          v-model="databaseForm.connectionString"
          :disabled="isSettingUpDatabase"
          placeholder="postgresql://"
          class="w-full"
          autofocus
          required
        />

        <template #help>
          <SupabaseMessageParts :message="t('supabase.setup.connectionHelp')">
            <template #link>
              <ULink
                :to="`https://supabase.com/dashboard/project/${projectId}/database/settings?showConnect=true&method=transaction`"
                target="_blank"
                class="text-default underline"
                external
              >
                {{ t('supabase.setup.connectionHelpLink') }}
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
          class="w-full"
          required
        />

        <template #help>
          <SupabaseMessageParts :message="t('supabase.setup.passwordHelp')">
            <template #placeholder>
              <code>[YOUR-PASSWORD]</code>
            </template>

            <template #link>
              <ULink
                :to="`https://supabase.com/dashboard/project/${projectId ?? '_'}/database/settings`"
                target="_blank"
                class="text-default underline"
                external
              >
                {{ t('supabase.setup.passwordHelpLink') }}
              </ULink>
            </template>
          </SupabaseMessageParts>
        </template>
      </UFormField>

      <!-- Where the connection goes, and how the setup works (folded). -->
      <div
        class="bg-elevated/50 ring-default flex flex-col gap-y-1 rounded-md p-3 ring"
      >
        <div class="flex gap-x-2 text-sm">
          <UIcon name="lucide:lock" class="text-muted mt-0.5 size-4 shrink-0" />
          <p class="text-muted">
            <PlutoCodeText :text="t('supabase.setup.stored')" />
          </p>
        </div>

        <UCollapsible v-model:open="detailsOpen">
          <UButton
            :label="t('supabase.setup.howItWorks')"
            :trailing-icon="
              detailsOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'
            "
            color="neutral"
            variant="link"
            size="sm"
            class="ms-4 px-2"
          />

          <template #content>
            <ul
              class="text-muted ms-6 flex list-disc flex-col gap-y-1 ps-4 pt-1 text-sm"
            >
              <li>
                <SupabaseMessageParts
                  :message="t('supabase.setup.detailsRequest')"
                >
                  <template #route>
                    <ULink
                      to="https://github.com/plutocms/supabase/blob/main/packages/supabase/server/api/_pluto/supabase/setup/index.post.ts"
                      target="_blank"
                      class="text-default underline"
                    >
                      {{ t('supabase.setup.detailsRoute') }}
                    </ULink>
                  </template>
                </SupabaseMessageParts>
              </li>
              <li>
                <SupabaseMessageParts :message="t('supabase.setup.detailsRun')">
                  <template #files>
                    <ULink
                      to="https://github.com/plutocms/supabase/tree/main/packages/supabase/db/migrations"
                      target="_blank"
                      class="text-default underline"
                    >
                      {{ t('supabase.setup.detailsFiles') }}
                    </ULink>
                  </template>
                </SupabaseMessageParts>
              </li>
            </ul>
          </template>
        </UCollapsible>
      </div>

      <p v-if="isDev" class="text-muted flex gap-x-2 text-xs">
        <UIcon name="lucide:refresh-cw" class="mt-0.5 size-3.5 shrink-0" />
        <span><PlutoCodeText :text="t('supabase.setup.restartNote')" /></span>
      </p>

      <UButton
        :label="t('supabase.setup.submit')"
        :loading="isSettingUpDatabase"
        icon="lucide:database"
        type="submit"
        class="w-full justify-center"
      />
    </UForm>
  </PlutoAdminAuthCard>
</template>
