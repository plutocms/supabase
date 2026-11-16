export const supabaseAreaType = definePlutoAreaType({
  source: 'areas',
  timestamps: {
    created: 'created_at',
    updated: 'updated_at',
  },
  defaultSort: {
    field: 'slug',
    direction: 'asc',
  },
  capabilities: {
    write: 'areas:write',
    delete: 'areas:write',
  },
})
