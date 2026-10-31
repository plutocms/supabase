import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function strip(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
}

const sql = strip(
  readFileSync(
    join(__dirname, '..', 'db', 'migrations', '008_users_and_roles_admin.sql'),
    'utf8'
  )
)

const functions: Array<{ name: string; args: string }> = [
  { name: 'list_staff_users', args: '' },
  { name: 'list_roles', args: '' },
  { name: 'find_user_id_by_email', args: 'text' },
  { name: 'set_user_roles', args: 'uuid, text[]' },
  { name: 'add_user_roles', args: 'uuid, text[]' },
  { name: 'create_role', args: 'text, text, text, text[]' },
  { name: 'update_role', args: 'text, text, text, text[]' },
  { name: 'delete_role', args: 'text' },
]

function body(name: string): string {
  const match = sql.match(
    new RegExp(
      `create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$; `,
      'i'
    )
  )

  return match?.[0] ?? ''
}

describe('008_users_and_roles_admin.sql', () => {
  it('creates no table', () => {
    expect(sql).not.toMatch(/create table/i)
  })

  it.each(functions)(
    '$name is plpgsql, security definer, empty search_path',
    ({ name }) => {
      const text = body(name)

      expect(text, name).not.toBe('')
      expect(text).toMatch(/language plpgsql/i)
      expect(text).toMatch(/security definer/i)
      expect(text).toMatch(/set search_path = ''/i)
    }
  )

  it.each(functions)(
    '$name revokes from public, anon and grants the rest',
    ({ name, args }) => {
      expect(sql).toContain(
        `revoke execute on function public.${name}(${args}) from public, anon;`
      )
      expect(sql).toContain(
        `grant execute on function public.${name}(${args}) to authenticated, service_role;`
      )
    }
  )

  it('lists need users:read, every write needs is_admin', () => {
    for (const name of ['list_staff_users', 'list_roles']) {
      expect(body(name)).toMatch(/has_capability\('users:read'\)/)
    }
    for (const name of [
      'find_user_id_by_email',
      'set_user_roles',
      'add_user_roles',
      'create_role',
      'update_role',
      'delete_role',
    ]) {
      expect(body(name), name).toMatch(/if not public\.is_admin\(\) then/)
    }
  })

  it('answers a missing right with 42501 and pluto:forbidden', () => {
    expect(sql).toMatch(/errcode = '42501', message = 'pluto:forbidden'/)
  })

  it('takes the advisory lock in every role writer', () => {
    for (const name of [
      'set_user_roles',
      'add_user_roles',
      'create_role',
      'update_role',
      'delete_role',
    ]) {
      expect(body(name), name).toContain(
        "pg_advisory_xact_lock(hashtext('pluto.user_roles'))"
      )
    }
  })

  it('set_user_roles checks the last admin and syncs profiles.is_admin', () => {
    const text = body('set_user_roles')

    expect(text).toContain("message = 'pluto:last_admin'")
    expect(text).toContain("message = 'pluto:unknown_role'")
    expect(text).toMatch(
      /update public\.profiles p set is_admin = \('admin' = any\(keys\)\)/
    )
    // The admin check reads the column and the role.
    expect(text).toMatch(/select p\.is_admin from public\.profiles p/)
    expect(text).toMatch(/ur\.role_key = 'admin'/)
  })

  it('add_user_roles sets the admin flag when it adds admin', () => {
    expect(body('add_user_roles')).toMatch(
      /if 'admin' = any\(keys\) then update public\.profiles p set is_admin = true/
    )
  })

  it('create_role and update_role refuse the wildcard and an empty role', () => {
    for (const name of ['create_role', 'update_role']) {
      expect(body(name), name).toContain("message = 'pluto:wildcard'")
      expect(body(name), name).toContain("message = 'pluto:empty_role'")
    }

    expect(body('create_role')).toContain("message = 'pluto:role_exists'")
    expect(body('create_role')).toContain("p_key !~ '^[a-z0-9_]+$'")
  })

  it('update_role refuses admin, delete_role refuses a built-in role', () => {
    expect(body('update_role')).toMatch(
      /if p_key = 'admin' then raise exception[^;]*pluto:builtin_role/
    )
    expect(body('delete_role')).toContain("message = 'pluto:builtin_role'")
    expect(body('delete_role')).toMatch(/return affected;/)
  })

  it('tightens the role policies, with a drop before each create', () => {
    const creates = [...sql.matchAll(/create policy "([^"]+)" on (\S+)/gi)]

    expect(creates).toHaveLength(4)
    for (const [, name, table] of creates) {
      expect(sql).toContain(`drop policy if exists "${name}" on ${table};`)
    }

    expect(sql).toMatch(
      /on public\.roles for delete to authenticated using \(public\.is_admin\(\) and not is_builtin\);/
    )
    expect(sql).toMatch(
      /on public\.role_capabilities for insert to authenticated with check \( public\.is_admin\(\) and role_key <> 'admin' and capability <> '\*' \);/
    )
    expect(sql).toMatch(
      /on public\.role_capabilities for update to authenticated using \(public\.is_admin\(\) and role_key <> 'admin'\)/
    )
    expect(sql).toMatch(
      /on public\.role_capabilities for delete to authenticated using \(public\.is_admin\(\) and role_key <> 'admin'\);/
    )
  })

  it('every statement is safe to run twice', () => {
    expect(sql).not.toMatch(/create function/i)
    expect(sql).not.toMatch(/drop function|drop table|alter table/i)
  })
})
