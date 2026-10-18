-- Profile language
--
-- Stores each user's admin language on their own profile row. NULL means
-- "Automatic": the user has not chosen one, so the admin uses the browser
-- language. The format check accepts any BCP 47 style code ('en', 'pt-BR'),
-- never a fixed list, so a new language needs no migration. The app decides
-- which codes it offers.
--
-- There is no UPDATE policy on public.profiles, on purpose: a user must never
-- write their own is_admin column. A SECURITY DEFINER function is the only
-- writer of this column. It touches the row of auth.uid() and no other row,
-- and it touches only the locale. This migration adds no RLS policy. The
-- existing select policy already lets a user read their own row.

alter table public.profiles add column if not exists locale text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_locale_format'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_locale_format
      check (locale is null or locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$') not valid;
  end if;
end
$$;

alter table public.profiles validate constraint profiles_locale_format;

-- Sets the language of the calling user. Pass NULL to choose Automatic.
create or replace function public.set_my_locale(new_locale text)
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles
     set locale = new_locale, updated_at = now()
   where id = auth.uid();
$$;

revoke execute on function public.set_my_locale(text) from public, anon;
grant execute on function public.set_my_locale(text) to authenticated;
