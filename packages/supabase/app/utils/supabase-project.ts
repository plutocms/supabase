// Pure helpers of the "Supabase sign-in emails" panel. This file does not use
// Nuxt auto-imports, so plain Vitest can import it.

/** The SMTP values of Resend, for the Supabase custom SMTP form. */
export const RESEND_SMTP = {
  host: 'smtp.resend.com',
  port: '465',
  username: 'resend',
} as const

/** The page where Resend connects itself to a Supabase project. */
export const RESEND_SUPABASE_INTEGRATION_URL =
  'https://resend.com/settings/integrations'

/**
 * Reads the project ref from the Supabase URL: `https://<ref>.supabase.co`
 * (and `.supabase.red`). A custom domain, a local URL or a bad value gives
 * null.
 */
export function supabaseProjectRef(
  url: string | null | undefined
): string | null {
  if (!url) {
    return null
  }

  try {
    const { hostname } = new URL(url)
    const match = /^([a-z0-9]{10,})\.supabase\.(?:co|red)$/.exec(
      hostname.toLowerCase()
    )

    return match?.[1] ?? null
  } catch {
    return null
  }
}

export interface SupabaseDashboardLinks {
  project: string
  smtp: string
  templates: string
  rateLimits: string
}

/**
 * The dashboard pages of a project. The deep links are best effort: Supabase
 * can move a page, and the panel says so.
 */
export function supabaseDashboardLinks(ref: string): SupabaseDashboardLinks {
  const base = `https://supabase.com/dashboard/project/${ref}`

  return {
    project: base,
    smtp: `${base}/auth/smtp`,
    templates: `${base}/auth/templates`,
    rateLimits: `${base}/auth/rate-limits`,
  }
}
