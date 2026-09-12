import { useFetch } from '#app'
import { computed } from 'vue'

export interface MigrationFileResult {
  layerName: string
  migrationName: string
  status: 'applied' | 'skipped' | 'failed'
  error?: string
}

export interface LayerStatus {
  layerName: string
  applied: string[]
  pending: string[]
}

interface MigrationsStatusResponse {
  success: boolean
  layers: LayerStatus[]
  pending: string[]
  applied: string[]
  discovered: string[]
  pendingFileCount: number
  hasConnection: boolean
  needsConnectionString: boolean
}

interface RunMigrationsResponse {
  success: boolean
  needsConnectionString?: boolean
  results?: MigrationFileResult[]
  persisted?: boolean
  message?: string
  error?: string
}

/**
 * Reads and applies pending migrations, for admin-only pages and the
 * admin-shell banner.
 *
 * `useFetch` keys the request as `pluto-migrations-status`, so every
 * caller in the app shares the same request and state instead of each
 * firing its own.
 *
 * A 401 or 403 from the status endpoint means the visitor is not a
 * logged-in admin. `status` reads as `null` in that case, so a caller
 * should show nothing — an unauthenticated visitor must see no trace of
 * this feature. Only call this composable from admin pages/components.
 */
export function useMigrations() {
  const {
    data,
    error,
    status: fetchStatus,
    refresh,
  } = useFetch<MigrationsStatusResponse>('/api/migrations/status', {
    key: 'pluto-migrations-status',
  })

  const status = computed(() => {
    if (error.value) {
      return null
    }

    return data.value ?? null
  })

  // Layer-level count — a layer with any pending file counts once here.
  // See `status.pendingFileCount` for the per-file count.
  const pendingCount = computed(() => status.value?.pending.length ?? 0)

  async function runMigrations(connectionString?: string) {
    const result = await $fetch<RunMigrationsResponse>('/api/migrations/run', {
      method: 'POST',
      body: connectionString ? { connectionString } : undefined,
    })

    await refresh()

    return result
  }

  return {
    status,
    fetchStatus,
    pendingCount,
    refresh,
    runMigrations,
  }
}
