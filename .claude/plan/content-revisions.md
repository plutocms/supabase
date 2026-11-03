# Supabase revisions

Core (plutocms/pluto#389) added the optional adapter reads `listRevisions` and `getRevision` and the
History UI. This PR gives them storage on Supabase.

## Decisions

- One table for every content type of every layer: `public.pluto_content_revisions` (011). The
  adapter writes a row after each create and update, with the user's own client, so no trigger per
  content table. `data` is the item after the save (field names, as `toItem` gives it).
- RLS: a row stores the write capability of its type (`capability`). Select, insert and delete need
  that capability (or, with none, any staff capability). Insert also needs `author_id = auth.uid()`.
  No update. Grants: select, insert, delete to authenticated; CRUD to service_role.
- The action: `create`; on update, `publish` / `unpublish` when the status crosses the published
  value (the old row is read first), else `update`.
- At most 100 revisions per item: the older ones are deleted after an insert.
- A failed revision write never fails the save: a warning only.
- A delete removes the revisions of the item.
- Cursor: the last revision id (keyset).
- An item saved before 011 has no revision until its next save.

## Checklist

- [ ] 011 migration + grants test.
- [ ] Adapter: record, list, get, delete; tests.
- [ ] Skills, FEATURES.md, docs.
- [ ] After the core release: the core range, install, typecheck.
