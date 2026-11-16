
# Menus and areas

The base layer stores the `menu` and `area` content types of core (`definePlutoMenuType`,
`definePlutoAreaType`) in two tables. A site turns each on with core's switch:
`plutoMenus: { enabled: true }` and `plutoAreas: { enabled: true }`.

- A **menu** is a title, a handle (`slug`, for example `main`) and a body of `menu-item` blocks. The
  site reads it with `usePlutoMenu('main')`.
- An **area** is a title, a handle (for example `footer`) and a body of any blocks. The site reads it
  with `usePlutoArea('footer')` and renders it with `PlutoBlocks`.

Neither has a status: a row is live unless it is in the trash.

## Files

- `db/migrations/015_menus_and_areas.sql`: the tables `public.menus` and `public.areas`.
- `shared/utils/content-menu.ts` and `content-area.ts`: core's definitions with the storage of the
  tables (`source`, timestamps, capabilities, `defaultSort` by slug). They use the auto-imported
  core helpers. Plugins use them through auto-import too: a relative import of a layer's own
  `shared/utils` breaks the Nitro build.
- `server/plugins/menus-and-areas.ts`: registers each type when its switch is on.
- `app/plugins/pluto-extension.ts`: registers the types and the capability labels on the client,
  under the same switches.

## The tables

- Columns: `id`, `created_at`, `updated_at`, `slug` (unique, not empty, no `/`), `title`, `body`,
  `deleted_at`.
- Row level security:
  - anon reads the rows that are not in the trash;
  - a signed-in user reads the same, and the trash too with `menus:write` (or `areas:write`);
  - insert, update and delete need `menus:write` (or `areas:write`).
- Grants: anon `select`; authenticated and service_role the four commands.
- The migration grants the capabilities to no role by data. The admin role holds them through `*`.
  Give them to another role in the Roles editor.

## Tests

- `test/menus-areas-migration.test.ts`: migrations 001 to 015 in PGlite (Postgres in memory; it never
  connects to a database). It covers the columns, the policies, the grants, the trash, and the
  capability checks.
- `test/content-menu-area.test.ts`: the two definitions with their storage.
