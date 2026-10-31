-- Generic settings keys
--
-- public.settings has been a fixed 3-value enum since 001_baseline.sql —
-- a layer other than @plutocms/supabase could never add its own setting
-- without altering a shared type. This adds a free-text, namespaced key
-- column alongside the enum column, without removing the enum column
-- yet. Dropping setting_name and the TSettings enum is left for a later
-- migration, once no shipped code writes it, to keep this one cheap to
-- reason about and its effects easy to undo.
--
-- Key format: lowercase segments separated by dots, e.g. 'website_title'
-- or 'blog.posts_per_page'. A layer other than core must namespace its
-- keys with its own name, so two layers can never collide.

alter table public.settings add column if not exists setting_key text;

update public.settings set setting_key = setting_name::text where setting_key is null;

alter table public.settings alter column setting_name drop not null;

create unique index if not exists settings_setting_key_key on public.settings (setting_key);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'settings_setting_key_format'
       and conrelid = 'public.settings'::regclass
  ) then
    alter table public.settings
      add constraint settings_setting_key_format
      check (setting_key ~ '^[a-z0-9_]+(?:\.[a-z0-9_]+)*$') not valid;
  end if;
end
$$;

alter table public.settings validate constraint settings_setting_key_format;
