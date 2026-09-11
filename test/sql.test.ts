import { describe, expect, it } from 'vitest'
import { splitStatements } from '../server/utils/sql'

describe('splitStatements', () => {
  it('splits simple statements on semicolons', () => {
    const sql = 'select 1; select 2;'

    expect(splitStatements(sql)).toEqual(['select 1;', 'select 2;'])
  })

  it('treats a bare $$ ... $$ block as one statement', () => {
    const sql = `create function f() returns void language sql as $$
      select 1;
      select 2;
    $$;`

    expect(splitStatements(sql)).toHaveLength(1)
  })

  it('treats a named $tag$ ... $tag$ block as one statement', () => {
    const sql = `create function f() returns void language plpgsql as $body$
    begin
      raise notice 'hi; there';
    end;
    $body$;`

    expect(splitStatements(sql)).toHaveLength(1)
  })

  it('does not confuse a positional parameter ($1) with a dollar-quote tag', () => {
    const sql = `select * from t where id = $1;`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('does not split on a semicolon inside a block comment', () => {
    const sql = `select 1 /* a ; b */;`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('handles nested block comments', () => {
    const sql = `select 1 /* outer /* inner ; */ still outer */;`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('does not split on a semicolon inside a double-quoted identifier', () => {
    const sql = `create table "my;table" (id int);`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('handles an escaped double quote inside an identifier', () => {
    const sql = `alter table t rename to "weird""name";`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('does not split on a semicolon inside a single-quoted string', () => {
    const sql = `insert into t (a) values ('a;b');`

    expect(splitStatements(sql)).toEqual([sql])
  })

  it('does not split on a semicolon inside a line comment', () => {
    const sql = 'select 1; -- comment with ; inside\nselect 2;'

    const statements = splitStatements(sql)

    expect(statements).toHaveLength(2)
    expect(statements[0]).toBe('select 1;')
    expect(statements[1]).toContain('select 2;')
  })

  describe('regression: do $$ ... $$ blocks from public/schema.sql (pre-conversion)', () => {
    it('keeps an idempotent-policy do block as one statement', () => {
      const sql = `do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'settings' and policyname = 'Enable read access for authenticated users on settings'
  ) then
    create policy "Enable read access for authenticated users on settings"
    on public.settings
    for select
    to authenticated, dashboard_user
    using (true);
  end if;
end
$$;`

      expect(splitStatements(sql)).toHaveLength(1)
    })

    it('keeps the handle_new_user function body as one statement', () => {
      const sql = `create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  profile_count int;
  should_be_admin boolean;
begin
  select count(*) into profile_count from public.profiles;

  should_be_admin := profile_count = 0;

  insert into public.profiles (id, email, username, display_name, is_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name',
    should_be_admin
  );
  return new;
end;
$$;`

      expect(splitStatements(sql)).toHaveLength(1)
    })

    it('splits a full multi-block excerpt into the right number of statements', () => {
      const sql = `alter table public.settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'settings' and policyname = 'Enable insert for authenticated users only'
  ) then
    create policy "Enable insert for authenticated users only"
    on public.settings
    for insert
    to authenticated, dashboard_user
    with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'settings' and policyname = 'Enable read access for authenticated users on settings'
  ) then
    create policy "Enable read access for authenticated users on settings"
    on public.settings
    for select
    to authenticated, dashboard_user
    using (true);
  end if;
end
$$;`

      expect(splitStatements(sql)).toHaveLength(3)
    })
  })
})
