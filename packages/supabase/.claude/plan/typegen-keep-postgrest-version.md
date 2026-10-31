# Type generation keeps the PostgREST version and the format

Status: in progress
Started: 2026-10-21
Projects: supabase
Branch / PR: fix/typegen-format

## Context

- Goal: after a migration run, the regenerated `shared/types/supabase.ts` keeps the app's
  `__InternalSupabase` block and the app's code style.
- Why: `server/utils/typegen.ts` runs `supabase gen types typescript --db-url ...` after each
  migration (`server/api/migrations/run.post.ts`) and writes the raw output. The `--db-url` mode
  does not write `__InternalSupabase: { PostgrestVersion }`, which supabase-js uses for its
  typings, and its output is not formatted. In a consumer app on 2026-10-21, a data-only
  migration produced a file with 497 lines removed and 307 added, and the block was lost.
- Decisions:
  - If the new output has no `__InternalSupabase` block and the existing file has one, copy the
    existing block into the new output.
  - Format the output with the app's Prettier when the app has it (resolve it from `rootDir`).
    Without Prettier, write the raw output, as now.
  - Compare with the existing file after these steps, so an unchanged schema writes nothing.
- Key files: `server/utils/typegen.ts`, `server/api/migrations/run.post.ts`,
  `scripts/supabase-typegen.ts` (check if it shares the logic).
- Open questions: none.

## Checklist

- [x] Keep the existing `__InternalSupabase` block (pure function, unit tests).
- [x] Format with the app's Prettier when available (fail soft).
- [x] Write only when the processed output differs.
- [x] lint, typecheck, test.
- [ ] Commit, PR, merge, release (`fix:`, patch).

## Log

- 2026-10-21: plan made. Given to the `builder` of the load-speed steps 2-4 (same repo, kept in
  its own files so it can go in its own PR).
- 2026-10-21: code done in `server/utils/typegen.ts` and `test/typegen.test.ts` (branch `perf/lazy-registrations`, no commit). `keepInternalSupabase()` is a pure function. The app's Prettier is resolved from `rootDir` and fails soft. The write compares the processed text. The user reviews and commits it in its own PR.
- 2026-10-22: the 0.11.1 fix failed in a real app: `next.includes('__InternalSupabase')` is always
  true, because the CLI output names it in `Omit<Database, '__InternalSupabase'>`. It also ran only
  Prettier, while apps commit ESLint + Prettier output. Follow-up (`fix/typegen-keep-block`):
  detect the block itself, run the app's ESLint fix then Prettier, drop the CLI's blank line
  after the brace, and find `supabase.exe` (Bun on Windows). End-to-end check against a real app
  and database: the regenerated text equals the committed file, so nothing is written.
