<script setup lang="ts">
useHead({
  title: 'Migrations',
})

const config = useRuntimeConfig()
const projectId = config.public.supabase.url
  ?.split('https://')[1]
  ?.split('.')[0]

const toast = useToast()

const { status, fetchStatus, pendingCount, refresh, runMigrations } =
  useMigrations()

const isDev = import.meta.dev

const connectionForm = ref({
  connectionString: '',
  password: '',
})

const isRunning = ref(false)
const lastRun = ref<Awaited<ReturnType<typeof runMigrations>> | null>(null)
// Kept only in this page's own memory, only to show the manual .env step if
// persisting fails — see EnvPersistWarning.vue. Never sent anywhere new.
const lastConnectionString = ref('')

/**
 * Polls the status endpoint until it responds again, or gives up.
 *
 * Used only to wait out a dev-server restart (see the comment in the
 * `catch` block of `applyMigrations`) — the server is expected to come
 * back within a few seconds, not to be actually down.
 */
async function waitForServerAndRefresh(): Promise<boolean> {
  const maxAttempts = 15
  const delayMs = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    await refresh()

    if (status.value) {
      return true
    }
  }

  return false
}

async function applyMigrations(useForm: boolean) {
  isRunning.value = true
  lastRun.value = null

  try {
    const connectionString = useForm
      ? connectionForm.value.connectionString.replace(
          '[YOUR-PASSWORD]',
          encodeURIComponent(connectionForm.value.password)
        )
      : undefined

    if (connectionString) {
      lastConnectionString.value = connectionString
    }

    const result = await runMigrations(connectionString)
    lastRun.value = result

    if (result.success === false) {
      toast.add({
        title: 'Could not apply migrations',
        description: result.needsConnectionString
          ? 'A database connection string is required.'
          : undefined,
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return
    }

    toast.add({
      title: 'Migrations applied',
      icon: 'lucide:check-circle',
      color: 'success',
    })
  } catch (error) {
    // Saving a first-time connection string writes DATABASE_URL to .env
    // (server/utils/env-file.ts). In dev, Nuxt restarts the whole dev
    // server whenever .env changes, so this request's connection can drop
    // before its response arrives, even though the migration itself
    // already succeeded server-side. A dropped connection has no HTTP
    // status code — a real error response would — so use that to tell the
    // two apart, and only in dev, where the restart is expected at all.
    const hasStatusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode?: unknown }).statusCode !== undefined

    if (isDev && useForm && !hasStatusCode) {
      toast.add({
        title: 'Dev server restarting',
        description:
          'Saving a new connection string restarts the dev server. Reconnecting…',
        icon: 'lucide:refresh-cw',
        color: 'info',
      })

      const recovered = await waitForServerAndRefresh()

      toast.add(
        recovered
          ? {
              title: 'Reconnected',
              description:
                pendingCount.value === 0
                  ? 'The server is back. All migrations were applied.'
                  : `The server is back. ${pendingCount.value} layer(s) still pending — check above.`,
              icon: 'lucide:check-circle',
              color: 'success',
            }
          : {
              title: 'Still reconnecting',
              description:
                'The dev server is taking longer than expected. Reload this page in a moment.',
              icon: 'lucide:triangle-alert',
              color: 'warning',
            }
      )

      return
    }

    if (import.meta.dev) {
      console.error('Error applying migrations:', error)
    }

    toast.add({
      title: 'Error applying migrations',
      description: 'Please check the console for more details.',
      icon: 'lucide:circle-x',
      color: 'error',
    })
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <AdminView>
    <h1 class="text-3xl font-bold lg:text-4xl">Migrations</h1>

    <div v-if="fetchStatus === 'pending'" class="flex items-center gap-x-2">
      <Icon name="svg-spinners:ring-resize" />
      <span>Loading migration status…</span>
    </div>

    <template v-else-if="status">
      <UCard>
        <div class="flex flex-col gap-y-6">
          <UAlert
            v-if="pendingCount === 0"
            color="success"
            variant="outline"
            icon="lucide:check-circle"
            title="Everything is up to date"
            description="No layer needs a database migration."
          />

          <div v-else class="flex flex-col gap-y-2">
            <h2 class="font-semibold">
              Pending layers ({{ status.pending.length }})
            </h2>
            <ul class="list-inside list-disc text-sm">
              <li v-for="layer in status.pending" :key="layer">
                {{ layer }}
              </li>
            </ul>
          </div>

          <div v-if="status.applied.length" class="flex flex-col gap-y-2">
            <h2 class="font-semibold">
              Applied layers ({{ status.applied.length }})
            </h2>
            <ul class="list-inside list-disc text-sm">
              <li v-for="layer in status.applied" :key="layer">
                {{ layer }}
              </li>
            </ul>
          </div>

          <template v-if="pendingCount > 0">
            <UForm
              v-if="status.needsConnectionString"
              class="flex flex-col gap-y-4"
              @submit="applyMigrations(true)"
            >
              <UFormField label="Supabase connection string" required>
                <UInput
                  v-model="connectionForm.connectionString"
                  :disabled="isRunning"
                  placeholder="postgresql://"
                  required
                />

                <template #help>
                  You can find your connection string
                  <ULink
                    :to="`https://supabase.com/dashboard/project/${projectId}/database/settings?showConnect=true&connectTab=direct&method=transaction`"
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
                  v-model="connectionForm.password"
                  :disabled="isRunning"
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
                description="It is used once to open a direct PostgreSQL connection and run the pending layer schemas. It is then written to .env on the server, so future migrations need no prompt. It is never stored anywhere else, and never sent back to your browser."
              />

              <UAlert
                v-if="isDev"
                color="info"
                variant="outline"
                title="This restarts the dev server"
                icon="lucide:refresh-cw"
                description="Saving a new connection string writes it to .env. In development, that restarts the server automatically. The page will briefly show a reconnecting message — this is expected, not an error."
              />

              <div class="flex">
                <UButton
                  :loading="isRunning"
                  :disabled="isRunning"
                  type="submit"
                  icon="lucide:database"
                  class="w-full justify-center sm:w-auto"
                >
                  Apply pending migrations
                </UButton>
              </div>
            </UForm>

            <div v-else class="flex">
              <UButton
                :loading="isRunning"
                :disabled="isRunning"
                icon="lucide:database"
                class="w-full justify-center sm:w-auto"
                @click="applyMigrations(false)"
              >
                Apply pending migrations
              </UButton>
            </div>
          </template>
        </div>
      </UCard>

      <UCard v-if="lastRun">
        <div class="flex flex-col gap-y-4">
          <h2 class="font-semibold">Last run</h2>

          <EnvPersistWarning
            v-if="lastRun.success && lastRun.persisted === false"
            :connection-string="lastConnectionString"
          />

          <ul
            v-if="lastRun.results?.length"
            class="flex flex-col gap-y-1 text-sm"
          >
            <li v-for="result in lastRun.results" :key="result.layerName">
              <span class="font-mono">{{ result.layerName }}</span>
              — {{ result.status }}
              <span v-if="result.error" class="text-error">
                : {{ result.error }}</span
              >
            </li>
          </ul>
        </div>
      </UCard>
    </template>
  </AdminView>
</template>
