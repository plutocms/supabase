import { requireAdmin } from '../../utils/admin-guard'
import { getMigrationStatus } from '../../utils/pending-migrations'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const status = await getMigrationStatus(event)

  return {
    success: true as const,
    ...status,
    needsConnectionString: !status.hasConnection && status.pendingFileCount > 0,
  }
})
