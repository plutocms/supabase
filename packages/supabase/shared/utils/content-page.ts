export const supabasePageType = definePlutoPageType({
  source: 'pages',
  publishedAtColumn: 'published_at',
  timestamps: {
    created: 'created_at',
    updated: 'updated_at',
  },
  defaultSort: {
    field: 'slug',
    direction: 'asc',
  },
  capabilities: {
    read: 'pages:read_drafts',
    write: 'pages:write',
    publish: 'pages:publish',
    delete: 'pages:delete',
  },
  status: {
    schedule: true,
    review: true,
  },
})
