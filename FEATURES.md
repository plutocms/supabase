# Features

This file lists every implemented feature of this project. Each entry links to a skill file
with full detail, so this file stays short.

See the workspace-level `CLAUDE.md` (one directory up) for the delegation, writing, and git
policies shared by every project here.

- Layer migrations: apply pending, versioned, per-file database migrations from the admin UI,
  after initial setup. @.claude/skills/layer-migrations/SKILL.md
- Permissions storage: role-based capabilities backing server route guards and RLS policies, and
  the admin-only access API (invite, roles) of migration 008.
  @.claude/skills/permissions-storage/SKILL.md
- Users and Roles: the Users and Roles tabs of Settings (invite, edit roles, revoke, copy invite
  link, roles editor), invites through Pluto mail, and a guide for the Supabase sign-in emails.
  @.claude/skills/users-and-roles/SKILL.md
- Content adapter: a Supabase/PostgREST-backed `PlutoContentAdapter`, plugging any layer's
  declared content type into `@plutocms/pluto`'s generic content routes. It supports query
  filters, puts the timestamps on items, and reads the public API of core with an anonymous client.
  @.claude/skills/content-adapter/SKILL.md
- Auth driver: plugs Supabase sign-in into the admin shell that pluto core owns (navbar, sign-in
  page, route guard), and keeps the setup guard in the driver.
  @.claude/skills/auth-driver/SKILL.md
- Profile language: stores each user's admin language in `profiles.locale`, written through a
  security-definer function, and plugs it into pluto's i18n as a locale driver.
  @.claude/skills/profile-language/SKILL.md
- Admin translation: every admin page, component, toast, and server message of this layer is
  translated (`en`, `pt-BR`) in the `supabase.*` namespace of pluto's i18n system.
  @.claude/skills/admin-translation/SKILL.md
