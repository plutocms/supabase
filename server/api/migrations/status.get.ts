import { requireAdmin } from '../../utils/admin-guard'
import { getMigrationStatus } from '../../utils/pending-migrations'

export default defineEventHandler(async (event) => {
  // requireAdmin specifically, not a named capability — see admin-guard.ts
  // for why: this route must work even before 004_roles_and_capabilities.sql
  // (which defines the capability system) has been applied.
  await requireAdmin(event)

  const status = await getMigrationStatus(event)

  return {
    success: true as const,
    ...status,
    needsConnectionString: !status.hasConnection && status.pendingFileCount > 0,
  }
})
