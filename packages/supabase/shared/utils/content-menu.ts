export const supabaseMenuType = definePlutoMenuType({
  source: 'menus',
  timestamps: {
    created: 'created_at',
    updated: 'updated_at',
  },
  defaultSort: {
    field: 'slug',
    direction: 'asc',
  },
  capabilities: {
    write: 'menus:write',
    delete: 'menus:write',
  },
})
