import { requireCapability } from '../../utils/capability-guard'
import { getMigrationStatus } from '../../utils/pending-migrations'

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'system:migrate')

  const status = await getMigrationStatus(event)

  return {
    success: true as const,
    ...status,
    needsConnectionString: !status.hasConnection && status.pendingFileCount > 0,
  }
})
