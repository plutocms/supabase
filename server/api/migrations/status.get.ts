import { requireAdmin } from '../../utils/admin-guard'
import { getMigrationStatus } from '../../utils/pending-migrations'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { pending, applied, hasConnection } = await getMigrationStatus(event)

  return {
    success: true as const,
    pending,
    applied,
    hasConnection,
    needsConnectionString: !hasConnection && pending.length > 0,
  }
})
