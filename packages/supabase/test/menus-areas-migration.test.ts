import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// The copy test of 015_menus_and_areas.sql. It runs every base migration, 001 to 015, in PGlite
// (Postgres in memory). It never connects to a real database. The Supabase parts that the
// migrations need (the roles, the auth and storage schemas, auth.uid) are stubs.
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
const MENU_EDITOR = user(2)
const AREA_EDITOR = user(3)
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
      ('${MENU_EDITOR}', 'menus@example.com'),
      ('${AREA_EDITOR}', 'areas@example.com');
    insert into public.roles (key, label) values ('t_menus', 'Menus'), ('t_areas', 'Areas');
    insert into public.role_capabilities (role_key, capability) values
      ('t_menus', 'menus:write'),
      ('t_areas', 'areas:write');
    insert into public.user_roles (user_id, role_key) values
      ('${MENU_EDITOR}', 't_menus'),
      ('${AREA_EDITOR}', 't_areas');
    insert into public.menus (slug, title) values ('main', 'Main'), ('footer-links', 'Footer links');
    insert into public.menus (slug, title, deleted_at) values ('old', 'Old', now());
    insert into public.areas (slug, title) values ('footer', 'Footer');
    insert into public.areas (slug, title, deleted_at) values ('old', 'Old', now());
  `)
}, 120000)

afterAll(async () => {
  await db.close()
})

describe('015_menus_and_areas.sql in PGlite', () => {
  it('is the last of fifteen base migrations', () => {
    expect(files).toHaveLength(15)
    expect(files.at(-1)).toBe('015_menus_and_areas.sql')
  })

  it('applies a second time with no error', async () => {
    await db.exec(readFileSync(join(dir, '015_menus_and_areas.sql'), 'utf8'))
  })

  for (const table of ['menus', 'areas']) {
    const visible = table === 'menus' ? 'footer-links,main' : 'footer'

    it(`has the columns of ${table}, and no status`, async () => {
      const result = await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = '${table}'
         order by column_name`
      )
      expect(result.rows.map((row) => row.column_name)).toEqual([
        'body',
        'created_at',
        'deleted_at',
        'id',
        'slug',
        'title',
        'updated_at',
      ])
    })

    it(`has row level security, the policies and the indexes of ${table}`, async () => {
      const security = await db.query<{ relrowsecurity: boolean }>(
        `select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`
      )
      expect(security.rows[0]?.relrowsecurity).toBe(true)

      const policies = await db.query<{ policyname: string }>(
        `select policyname from pg_policies where tablename = '${table}' order by policyname`
      )
      expect(policies.rows.map((row) => row.policyname)).toEqual([
        'Allow authenticated delete',
        'Allow authenticated insert',
        'Allow authenticated read',
        'Allow authenticated update',
        `Allow public read of ${table}`,
      ])

      const indexes = await db.query<{ indexname: string }>(
        `select indexname from pg_indexes where tablename = '${table}' order by indexname`
      )
      expect(indexes.rows.map((row) => row.indexname).sort()).toEqual([
        `${table}_pkey`,
        `${table}_slug_key`,
        `idx_${table}_deleted_at`,
      ].sort())
    })

    it(`grants anon select, and authenticated and service_role the four commands on ${table}`, async () => {
      async function privileges(role: string): Promise<string[]> {
        const result = await db.query<{ privilege_type: string }>(
          `select privilege_type from information_schema.role_table_grants
           where table_schema = 'public' and table_name = '${table}' and grantee = '${role}'
           order by privilege_type`
        )
        return result.rows.map((row) => row.privilege_type)
      }
      const crud = ['DELETE', 'INSERT', 'SELECT', 'UPDATE']

      expect(await privileges('anon')).toEqual(['SELECT'])
      expect(await privileges('authenticated')).toEqual(crud)
      expect(await privileges('service_role')).toEqual(crud)
    })

    it(`keeps the handle of ${table} unique, with text and no slash`, async () => {
      const same = await as(
        'service_role',
        null,
        `insert into public.${table} (slug, title) values ('old', 'Again')`
      )
      expect(same.error).toBeDefined()

      for (const slug of ['', 'a/b', '/a']) {
        const result = await as(
          'service_role',
          null,
          `insert into public.${table} (slug, title) values ('${slug}', 'Bad')`
        )
        expect(result.error, slug).toBeDefined()
      }
    })

    it(`shows anon the ${table} that are not in the trash`, async () => {
      const result = await as('anon', null, `select slug from public.${table}`)
      expect(slugs(result.rows)).toBe(visible)
    })

    it(`shows a signed-in user with no capability the same ${table}`, async () => {
      const result = await as(
        'authenticated',
        PLAIN,
        `select slug from public.${table}`
      )
      expect(slugs(result.rows)).toBe(visible)
    })

    it(`does not let anon or a user without the capability write ${table}`, async () => {
      const anon = await as(
        'anon',
        null,
        `insert into public.${table} (slug, title) values ('anon', 'Anon')`
      )
      expect(anon.error).toBeDefined()

      const insert = await as(
        'authenticated',
        PLAIN,
        `insert into public.${table} (slug, title) values ('mine', 'Mine')`
      )
      expect(insert.error).toBeDefined()

      const update = await as(
        'authenticated',
        PLAIN,
        `update public.${table} set title = 'Hacked' where slug = 'old' returning slug`
      )
      expect(update.rows).toEqual([])

      const remove = await as(
        'authenticated',
        PLAIN,
        `delete from public.${table} where slug = 'old' returning slug`
      )
      expect(remove.rows).toEqual([])
    })
  }

  it('lets menus:write read the trash, insert, update, trash and delete menus', async () => {
    const trash = await as(
      'authenticated',
      MENU_EDITOR,
      'select slug from public.menus'
    )
    expect(slugs(trash.rows)).toBe('footer-links,main,old')

    const insert = await as(
      'authenticated',
      MENU_EDITOR,
      `insert into public.menus (slug, title) values ('side', 'Side') returning slug`
    )
    expect(insert.error).toBeUndefined()

    const update = await as(
      'authenticated',
      MENU_EDITOR,
      `update public.menus set title = 'Side menu' where slug = 'side' returning slug`
    )
    expect(slugs(update.rows)).toBe('side')

    const trashed = await as(
      'authenticated',
      MENU_EDITOR,
      `update public.menus set deleted_at = now() where slug = 'side' returning slug`
    )
    expect(slugs(trashed.rows)).toBe('side')

    const hidden = await as('anon', null, 'select slug from public.menus')
    expect(slugs(hidden.rows)).toBe('footer-links,main')

    const remove = await as(
      'authenticated',
      MENU_EDITOR,
      `delete from public.menus where slug = 'side' returning slug`
    )
    expect(slugs(remove.rows)).toBe('side')
  })

  it('lets areas:write read the trash, insert, update, trash and delete areas', async () => {
    const trash = await as(
      'authenticated',
      AREA_EDITOR,
      'select slug from public.areas'
    )
    expect(slugs(trash.rows)).toBe('footer,old')

    const insert = await as(
      'authenticated',
      AREA_EDITOR,
      `insert into public.areas (slug, title) values ('sidebar', 'Sidebar') returning slug`
    )
    expect(insert.error).toBeUndefined()

    const update = await as(
      'authenticated',
      AREA_EDITOR,
      `update public.areas set body = 'Hello' where slug = 'sidebar' returning slug`
    )
    expect(slugs(update.rows)).toBe('sidebar')

    const trashed = await as(
      'authenticated',
      AREA_EDITOR,
      `update public.areas set deleted_at = now() where slug = 'sidebar' returning slug`
    )
    expect(slugs(trashed.rows)).toBe('sidebar')

    const remove = await as(
      'authenticated',
      AREA_EDITOR,
      `delete from public.areas where slug = 'sidebar' returning slug`
    )
    expect(slugs(remove.rows)).toBe('sidebar')
  })

  it('does not let menus:write touch areas, nor areas:write touch menus', async () => {
    const area = await as(
      'authenticated',
      MENU_EDITOR,
      `insert into public.areas (slug, title) values ('x', 'X')`
    )
    expect(area.error).toBeDefined()

    const menu = await as(
      'authenticated',
      AREA_EDITOR,
      `insert into public.menus (slug, title) values ('x', 'X')`
    )
    expect(menu.error).toBeDefined()
  })
})
