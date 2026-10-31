<script setup lang="ts">
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.migrations.title'),
})

const config = useRuntimeConfig()
const projectId = config.public.supabase.url
  ?.split('https://')[1]
  ?.split('.')[0]

const toast = useToast()

const { status, fetchStatus, pendingCount, refresh, runMigrations } =
  useMigrations()

const isDev = import.meta.dev

// The text of each result status that the server returns.
const statusLabels: Record<string, string> = {
  applied: 'supabase.migrations.status.applied',
  skipped: 'supabase.migrations.status.skipped',
  failed: 'supabase.migrations.status.failed',
}

function statusText(status: string): string {
  const key = statusLabels[status]

  return key ? t(key) : status
}

// Only the layers that actually have a pending, or applied, file — used to
// render per-file detail under each layer below.
const pendingLayers = computed(
  () => status.value?.layers.filter((layer) => layer.pending.length > 0) ?? []
)
const appliedLayers = computed(
  () => status.value?.layers.filter((layer) => layer.applied.length > 0) ?? []
)

const connectionForm = ref({
  connectionString: '',
  password: '',
})

const isRunning = ref(false)
// True only while waitForServerAndRefresh is polling through a dev-server
// restart. useMigrations().status reads as null on every failed poll in
// that window (see its own doc comment), which would otherwise leave the
// page blank below the title — the toasts alone are easy to miss. The
// template shows a persistent banner instead, keyed on this flag, so the
// page always explains what is happening instead of going quiet.
const isReconnecting = ref(false)
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
        title: t('supabase.migrations.applyFailed'),
        description: result.needsConnectionString
          ? t('supabase.migrations.connectionRequired')
          : undefined,
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return
    }

    toast.add({
      title: t('supabase.migrations.applied'),
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
        title: t('supabase.connection.restarting'),
        description: t('supabase.migrations.restartingDescription'),
        icon: 'lucide:refresh-cw',
        color: 'info',
      })

      isReconnecting.value = true

      const recovered = await waitForServerAndRefresh()

      isReconnecting.value = false

      toast.add(
        recovered
          ? {
              title: t('supabase.connection.reconnected'),
              description:
                pendingCount.value === 0
                  ? t('supabase.migrations.reconnectedAllApplied')
                  : t('supabase.migrations.reconnectedPending', {
                      count: pendingCount.value,
                    }),
              icon: 'lucide:check-circle',
              color: 'success',
            }
          : {
              title: t('supabase.connection.stillReconnecting'),
              description: t(
                'supabase.connection.stillReconnectingDescription'
              ),
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
      title: t('supabase.migrations.error'),
      description: t('supabase.connection.checkConsole'),
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
    <h1 class="text-3xl font-bold lg:text-4xl">
      {{ t('supabase.migrations.title') }}
    </h1>

    <UAlert
      v-if="isReconnecting"
      :title="t('supabase.connection.restarting')"
      :description="t('supabase.migrations.reconnectingBanner')"
      color="info"
      variant="outline"
      icon="lucide:refresh-cw"
    />

    <div
      v-else-if="fetchStatus === 'pending'"
      class="flex items-center gap-x-2"
    >
      <Icon name="svg-spinners:ring-resize" />
      <span>{{ t('supabase.migrations.loading') }}</span>
    </div>

    <template v-else-if="status">
      <UCard>
        <div class="flex flex-col gap-y-6">
          <UAlert
            v-if="pendingCount === 0"
            :title="t('supabase.migrations.upToDate')"
            :description="t('supabase.migrations.upToDateDescription')"
            color="success"
            variant="outline"
            icon="lucide:check-circle"
          />

          <div v-else class="flex flex-col gap-y-2">
            <h2 class="font-semibold">
              {{
                t('supabase.migrations.pendingLayers', {
                  count: status.pending.length,
                })
              }}
            </h2>
            <ul class="flex flex-col gap-y-2 text-sm">
              <li v-for="layer in pendingLayers" :key="layer.layerName">
                <span class="font-mono">{{ layer.layerName }}</span>
                <ul class="list-inside list-disc pl-4">
                  <li v-for="fileName in layer.pending" :key="fileName">
                    {{ fileName }}
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div v-if="status.applied.length" class="flex flex-col gap-y-2">
            <h2 class="font-semibold">
              {{
                t('supabase.migrations.appliedLayers', {
                  count: status.applied.length,
                })
              }}
            </h2>
            <ul class="flex flex-col gap-y-2 text-sm">
              <li v-for="layer in appliedLayers" :key="layer.layerName">
                <span class="font-mono">{{ layer.layerName }}</span>
                <ul class="list-inside list-disc pl-4">
                  <li v-for="fileName in layer.applied" :key="fileName">
                    {{ fileName }}
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <template v-if="pendingCount > 0">
            <UForm
              v-if="status.needsConnectionString"
              class="flex flex-col gap-y-4"
              @submit="applyMigrations(true)"
            >
              <UFormField
                :label="t('supabase.connection.connectionString')"
                required
              >
                <UInput
                  v-model="connectionForm.connectionString"
                  :disabled="isRunning"
                  placeholder="postgresql://"
                  required
                />

                <template #help>
                  <SupabaseMessageParts
                    :message="t('supabase.connection.connectionStringHelp')"
                  >
                    <template #link>
                      <ULink
                        :to="`https://supabase.com/dashboard/project/${projectId}/database/settings?showConnect=true&connectTab=direct&method=transaction`"
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
                :description="t('supabase.migrations.why')"
                color="warning"
                variant="outline"
                icon="lucide:info"
              />

              <UAlert
                v-if="isDev"
                :title="t('supabase.connection.restartTitle')"
                :description="t('supabase.migrations.restartDescription')"
                color="info"
                variant="outline"
                icon="lucide:refresh-cw"
              />

              <div class="flex">
                <UButton
                  :loading="isRunning"
                  :disabled="isRunning"
                  type="submit"
                  icon="lucide:database"
                  class="w-full justify-center sm:w-auto"
                >
                  {{ t('supabase.migrations.apply') }}
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
                {{ t('supabase.migrations.apply') }}
              </UButton>
            </div>
          </template>
        </div>
      </UCard>

      <UCard v-if="lastRun">
        <div class="flex flex-col gap-y-4">
          <h2 class="font-semibold">
            {{ t('supabase.migrations.lastRun') }}
          </h2>

          <EnvPersistWarning
            v-if="lastRun.success && lastRun.persisted === false"
            :connection-string="lastConnectionString"
          />

          <ul
            v-if="lastRun.results?.length"
            class="flex flex-col gap-y-1 text-sm"
          >
            <li
              v-for="result in lastRun.results"
              :key="`${result.layerName}/${result.migrationName}`"
            >
              <span class="font-mono"
                >{{ result.layerName }}/{{ result.migrationName }}</span
              >
              — {{ statusText(result.status) }}
              <span v-if="result.error" class="text-error">
                : {{ result.error }}</span
              >
            </li>
          </ul>
        </div>
      </UCard>
    </template>

    <UAlert
      v-else
      :title="t('supabase.migrations.loadFailed')"
      :description="t('supabase.migrations.loadFailedDescription')"
      color="error"
      variant="outline"
      icon="lucide:circle-x"
    >
      <template #actions>
        <UButton
          color="error"
          variant="outline"
          icon="lucide:refresh-cw"
          @click="refresh()"
        >
          {{ t('supabase.migrations.retry') }}
        </UButton>
      </template>
    </UAlert>
  </AdminView>
</template>
