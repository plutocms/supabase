import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// The copy test of 013_pages.sql. It runs every base migration, 001 to 013, in PGlite (Postgres
// in memory). It never connects to a real database. The Supabase parts that the migrations need
// (the roles, the auth and storage schemas, auth.uid) are stubs.
const dir = join(__dirname, '..', 'db', 'migrations')
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const BOOTSTRAP = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role dashboard_user nologin;
create schema auth;
create schema storage;
create schema extensions;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
grant usage on schema public, auth to anon, authenticated, service_role;
`

const user = (n: number) => `00000000-0000-0000-0000-00000000000${n}`
const PLAIN = user(1)
const WRITER = user(2)
const PUBLISHER = user(3)
const FIRST = user(9)

let db: PGlite

async function as(
  role: string,
  userId: string | null,
  query: string
): Promise<{ rows: Array<Record<string, unknown>>; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      await tx.exec(
        `set local role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ''}', true);`
      )
      const result = await tx.query<Record<string, unknown>>(query)
      return { rows: result.rows }
    })
  } catch (error) {
    return { rows: [], error: (error as Error).message }
  }
}

function slugs(rows: Array<Record<string, unknown>>): string {
  return rows
    .map((row) => row.slug)
    .sort()
    .join(',')
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(BOOTSTRAP)
  for (const name of files) {
    await db.exec(readFileSync(join(dir, name), 'utf8'))
  }
  await db.exec(`
    insert into auth.users (id, email) values
      ('${FIRST}', 'first@example.com'),
      ('${PLAIN}', 'plain@example.com'),
      ('${WRITER}', 'writer@example.com'),
      ('${PUBLISHER}', 'publisher@example.com');
    insert into public.roles (key, label) values ('t_writer', 'Writer'), ('t_publisher', 'Publisher');
    insert into public.role_capabilities (role_key, capability) values
      ('t_writer', 'pages:write'),
      ('t_writer', 'pages:read_drafts'),
      ('t_publisher', 'pages:publish'),
      ('t_publisher', 'pages:read_drafts');
    insert into public.user_roles (user_id, role_key) values
      ('${WRITER}', 't_writer'),
      ('${PUBLISHER}', 't_publisher');
    insert into public.pages (slug, title, status, published_at) values
      ('about', 'About', 'published', now() - interval '1 day'),
      ('about/team', 'Team', 'published', now() - interval '1 day'),
      ('soon', 'Soon', 'scheduled', now() + interval '1 day'),
      ('due', 'Due', 'scheduled', now() - interval '1 hour');
    insert into public.pages (slug, title, status) values ('draft', 'Draft', 'draft');
    insert into public.pages (slug, title, status, published_at, deleted_at)
      values ('gone', 'Gone', 'published', now() - interval '1 day', now());
  `)
}, 120000)

afterAll(async () => {
  await db.close()
})

describe('013_pages.sql in PGlite', () => {
  it('is the thirteenth base migration, and 014 adds the layout', () => {
    expect(files).toHaveLength(14)
    expect(files[12]).toBe('013_pages.sql')
    expect(files.at(-1)).toBe('014_page_layout.sql')
  })

  it('applies 013 and 014 a second time with no error', async () => {
    await db.exec(readFileSync(join(dir, '013_pages.sql'), 'utf8'))
    await db.exec(readFileSync(join(dir, '014_page_layout.sql'), 'utf8'))
  })

  it('gives a page the default layout, takes full, and refuses another layout', async () => {
    await db.exec(`insert into public.pages (slug, title) values ('layout-check', 'Layout')`)
    const row = await db.query<{ layout: string }>(`select layout from public.pages where slug = 'layout-check'`)
    expect(row.rows[0]?.layout).toBe('default')
    await db.exec(`update public.pages set layout = 'full' where slug = 'layout-check'`)
    await expect(db.exec(`update public.pages set layout = 'wide' where slug = 'layout-check'`)).rejects.toThrow()
    await db.exec(`delete from public.pages where slug = 'layout-check'`)
  })

  it('has the table with the columns of a post, the description and the layout', async () => {
    const result = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'pages'
       order by column_name`
    )
    expect(result.rows.map((row) => row.column_name)).toEqual([
      'body',
      'created_at',
      'deleted_at',
      'description',
      'id',
      'layout',
      'published_at',
      'slug',
      'status',
      'title',
      'updated_at',
    ])
  })

  it('has row level security, the policies, the guards and the indexes', async () => {
    const security = await db.query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where oid = 'public.pages'::regclass`
    )
    expect(security.rows[0]?.relrowsecurity).toBe(true)

    const policies = await db.query<{ policyname: string }>(
      `select policyname from pg_policies where tablename = 'pages' order by policyname`
    )
    expect(policies.rows.map((row) => row.policyname)).toEqual([
      'Allow authenticated delete',
      'Allow authenticated insert',
      'Allow authenticated read',
      'Allow authenticated update',
      'Allow pages:delete trash on pages',
      'Allow public read of published pages',
    ])

    const triggers = await db.query<{ tgname: string }>(
      `select tgname from pg_trigger where tgrelid = 'public.pages'::regclass and not tgisinternal order by tgname`
    )
    expect(triggers.rows.map((row) => row.tgname)).toEqual([
      'pages_status_guard',
      'pages_trash_only_guard',
    ])

    const indexes = await db.query<{ indexname: string }>(
      `select indexname from pg_indexes where tablename = 'pages' order by indexname`
    )
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      'idx_pages_created_at',
      'idx_pages_deleted_at',
      'idx_pages_scheduled',
      'idx_pages_status',
      'pages_pkey',
      'pages_slug_key',
    ])
  })

  it('grants anon select, and authenticated and service_role the four commands', async () => {
    async function privileges(role: string): Promise<string[]> {
      const result = await db.query<{ privilege_type: string }>(
        `select privilege_type from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'pages' and grantee = '${role}'
         order by privilege_type`
      )
      return result.rows.map((row) => row.privilege_type)
    }
    expect(await privileges('anon')).toEqual(['SELECT'])
    expect(await privileges('authenticated')).toEqual([
      'DELETE',
      'INSERT',
      'SELECT',
      'UPDATE',
    ])
    expect(await privileges('service_role')).toEqual([
      'DELETE',
      'INSERT',
      'SELECT',
      'UPDATE',
    ])
  })

  it('keeps the path unique, and refuses a path with a slash at the end', async () => {
    const same = await as(
      'service_role',
      null,
      `insert into public.pages (slug, title) values ('about', 'Again')`
    )
    expect(same.error).toBeDefined()

    const slash = await as(
      'service_role',
      null,
      `insert into public.pages (slug, title) values ('about/', 'Slash')`
    )
    expect(slash.error).toBeDefined()
  })

  it('refuses an unknown status', async () => {
    const result = await as(
      'service_role',
      null,
      `insert into public.pages (slug, title, status) values ('x', 'X', 'archived')`
    )
    expect(result.error).toBeDefined()
  })

  it('shows an anonymous visitor the live pages that are not in the trash', async () => {
    const result = await as('anon', null, 'select slug from public.pages')
    expect(slugs(result.rows)).toBe('about,about/team,due')
  })

  it('shows a signed-in user with no capability the same pages', async () => {
    const result = await as(
      'authenticated',
      PLAIN,
      'select slug from public.pages'
    )
    expect(slugs(result.rows)).toBe('about,about/team,due')
  })

  it('shows every page except the trash to a holder of pages:read_drafts', async () => {
    const result = await as(
      'authenticated',
      PUBLISHER,
      'select slug from public.pages'
    )
    expect(slugs(result.rows)).toBe('about,about/team,draft,due,gone,soon')
  })

  it('does not let a user without pages:write insert', async () => {
    const result = await as(
      'authenticated',
      PLAIN,
      `insert into public.pages (slug, title, status) values ('mine', 'Mine', 'draft')`
    )
    expect(result.error).toBeDefined()
  })

  it('does not let anon insert', async () => {
    const result = await as(
      'anon',
      null,
      `insert into public.pages (slug, title, status) values ('anon', 'Anon', 'draft')`
    )
    expect(result.error).toBeDefined()
  })

  it('lets pages:write save a draft and send it to review, but not publish', async () => {
    const draft = await as(
      'authenticated',
      WRITER,
      `insert into public.pages (slug, title, status) values ('mine', 'Mine', 'draft') returning slug`
    )
    expect(draft.error).toBeUndefined()

    const review = await as(
      'authenticated',
      WRITER,
      `update public.pages set status = 'review' where slug = 'mine' returning slug`
    )
    expect(review.error).toBeUndefined()

    const publish = await as(
      'authenticated',
      WRITER,
      `update public.pages set status = 'published' where slug = 'mine'`
    )
    expect(publish.error).toBeDefined()

    const edit = await as(
      'authenticated',
      WRITER,
      `update public.pages set title = 'Hacked' where slug = 'about'`
    )
    expect(edit.error).toBeDefined()
  })

  it('lets pages:publish publish a page', async () => {
    const result = await as(
      'authenticated',
      PUBLISHER,
      `update public.pages set status = 'published', published_at = now() where slug = 'mine' returning slug`
    )
    expect(result.error).toBeUndefined()
    expect(slugs(result.rows)).toBe('mine')
  })

  it('does not let a user without pages:delete delete a row', async () => {
    const result = await as(
      'authenticated',
      PUBLISHER,
      `delete from public.pages where slug = 'draft' returning slug`
    )
    expect(result.rows).toEqual([])
  })

  it('lets the service role, the scheduled task, publish a due page', async () => {
    const result = await as(
      'service_role',
      null,
      `update public.pages set status = 'published'
       where status = 'scheduled' and published_at <= now() and deleted_at is null returning slug`
    )
    expect(result.error).toBeUndefined()
    expect(slugs(result.rows)).toBe('due')
  })
})
