-- The layout of a page (the `layout` field of the page type of @plutocms/core): `default` shows the
-- title, then a narrow body; `full` shows the blocks only, at full width (an imported landing page).
-- Every statement is idempotent.

alter table public.pages add column if not exists layout text not null default 'default';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pages_layout_check'
  ) then
    alter table public.pages
      add constraint pages_layout_check check (layout in ('default', 'full'));
  end if;
end
$$;
