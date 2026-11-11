# plutocms/supabase

The monorepo of the Supabase integration of Pluto. It is a Bun workspace.

| Package                  | npm name                  | Tags                   |
| ------------------------ | ------------------------- | ---------------------- |
| `packages/supabase`      | `@plutocms/supabase`      | `vX.Y.Z`               |
| `packages/supabase-shop` | `@plutocms/supabase-shop` | `supabase-shop-vX.Y.Z` |
| `packages/supabase-blog` | `@plutocms/supabase-blog` | `supabase-blog-vX.Y.Z` |

`supabase-shop` and `supabase-blog` run on the tables of `supabase`. A change that touches both
is one PR.

## Rules

- Bun links `@plutocms/supabase` from the workspace. `@plutocms/core` comes from npm. Keep the
  wide ranges (`>=0.x.0 <1.0.0`) in the `dependencies`. Do not use `workspace:` (npm publish does
  not rewrite it).
- Bun does not run the `prepare` script of a workspace package. Each package has `dev:prepare`,
  and the root `postinstall` runs them all.
- Each package has its own `eslint.config.mjs`, skills, tests, migrations and `.env`. The
  Tailwind entry point of the ESLint config is a path next to the config file, so the class rules
  also work from the root.
- The dev tools (ESLint, Prettier, the ESLint configs, `vue-tsc`) are devDependencies of the root.
  `vue-tsc` is pinned to 3.3.13: version 3.3.14 reports a false type error in `setup.vue`. The
  `typescript` override (5.9) is there for the same reason.
- To test a local checkout of core, set `PLUTO_CORE_PATH`. Inside this repo you do not need
  `PLUTO_SUPABASE_PATH`.
- Never run a migration or the typegen against a remote database as a check.

## Playground

`playground/` is a private app that extends the shop and blog layers (and so `supabase`), like an
app made from a template. `bun run dev` starts it on port 3200. It reads `playground/.env`
(`SUPABASE_URL`, `SUPABASE_KEY`; see `.env.example`). Never put `DATABASE_URL` in it: with it, the
server applies the pending migrations of the branch at startup. Set `PLUTO_CORE_PATH` to try a
local core.

## Commands (at the root)

- `bun install`
- `bun run dev` (the playground)
- `bun run lint`, `bun run lint:fix`, `bun run prettier`
- `bun run typecheck`, `bun run test`, `bun run build` (each runs supabase, then shop, then blog)
- One package: `bun run --cwd packages/<name> <script>`

CI and release use the files in `.github/`. Releases come from release-please (three packages,
separate PRs). The skills of each package are in `packages/<name>/.claude/skills`.
