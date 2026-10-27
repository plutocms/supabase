import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../../utils/access-errors'
import { roleBodySchema } from '../../../../../utils/access-invite'
import { requireAdminRole } from '../../../../../utils/admin-role-guard'
import { parseBody } from '../../../../../utils/validate'

/** Edits a role and replaces its capabilities. The `admin` role is refused. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const key = event.context.params?.key as string
  const body = await parseBody(event, roleBodySchema)
  const client = await serverSupabaseClient<Database>(event)
  const { error } = await client.rpc('update_role', {
    p_key: key,
    p_label: body.label,
    p_description: body.description ?? '',
    p_capabilities: body.capabilities,
  })

  if (error) {
    throw mapAccessError(error)
  }

  return { key }
})
