import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../utils/access-errors'
import { createRoleBodySchema } from '../../../../utils/access-invite'
import { requireAdminRole } from '../../../../utils/admin-role-guard'
import { parseBody } from '../../../../utils/validate'

/** Creates a role. A new role cannot hold the wildcard. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const body = await parseBody(event, createRoleBodySchema)
  const client = await serverSupabaseClient<Database>(event)
  const { error } = await client.rpc('create_role', {
    p_key: body.key,
    p_label: body.label,
    p_description: body.description ?? '',
    p_capabilities: body.capabilities,
  })

  if (error) {
    throw mapAccessError(error)
  }

  return { key: body.key }
})
