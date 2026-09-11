/**
 * A single discovered migration file for one layer.
 *
 * `modules/pluto-migrations.ts` discovers these at build time, either from
 * a layer's `db/migrations/` directory, or as a single legacy
 * `public/schema.sql` / `public/schema.<name>.sql` file. `server/utils/
 * migrations.ts` applies them at runtime.
 *
 * Lives under `shared/` so both the Nuxt module (which runs under
 * `nuxt/kit`, at build time, outside the app/server TS projects) and
 * server code can import the same type.
 */
export interface PlutoMigrationFile {
  /** File name, for example `001_baseline.sql` or `002_admin_hardening.sql`. */
  name: string
  /** Raw SQL content of the file. */
  sql: string
  /** First 16 hex characters of the SHA-256 digest of `sql`. */
  checksum: string
  /**
   * True when the file's first non-blank line matches
   * `-- pluto:no-transaction`. Such a file runs statement-by-statement,
   * with no surrounding transaction — use this only when a statement
   * cannot run inside a transaction (for example `create index
   * concurrently`).
   */
  noTransaction: boolean
}
