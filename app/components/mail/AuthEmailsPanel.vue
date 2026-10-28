<script setup lang="ts">
// The "Supabase sign-in emails" section of the Email settings page. It is a
// `mailPanels` entry. Sign-up, password reset and magic link emails go through
// Supabase's mailer, not through Pluto mail. This guide shows how to send them
// through Resend. The core page draws the card and the title.
import {
  RESEND_SMTP,
  RESEND_SUPABASE_INTEGRATION_URL,
  supabaseDashboardLinks,
  supabaseProjectRef,
} from '../../utils/supabase-project'

const { t } = usePlutoI18n()

const projectRef = computed(() =>
  supabaseProjectRef(useRuntimeConfig().public.supabase?.url)
)
const links = computed(() =>
  projectRef.value ? supabaseDashboardLinks(projectRef.value) : null
)

const smtpRows = computed(() => [
  {
    key: 'host',
    label: t('supabase.mail.authEmails.host'),
    value: RESEND_SMTP.host,
    copy: RESEND_SMTP.host,
  },
  {
    key: 'port',
    label: t('supabase.mail.authEmails.port'),
    value: RESEND_SMTP.port,
    copy: RESEND_SMTP.port,
  },
  {
    key: 'username',
    label: t('supabase.mail.authEmails.username'),
    value: RESEND_SMTP.username,
    copy: RESEND_SMTP.username,
  },
  // The password is the API key. Pluto never shows it, so there is nothing to copy.
  {
    key: 'password',
    label: t('supabase.mail.authEmails.password'),
    value: t('supabase.mail.authEmails.passwordValue'),
    copy: null,
  },
])

const dashboardLinks = computed(() =>
  links.value
    ? [
        {
          key: 'smtp',
          label: t('supabase.mail.authEmails.dashboardSmtp'),
          to: links.value.smtp,
          icon: 'lucide:mail',
        },
        {
          key: 'templates',
          label: t('supabase.mail.authEmails.dashboardTemplates'),
          to: links.value.templates,
          icon: 'lucide:layout-template',
        },
        {
          key: 'rateLimits',
          label: t('supabase.mail.authEmails.dashboardRateLimits'),
          to: links.value.rateLimits,
          icon: 'lucide:gauge',
        },
        {
          key: 'project',
          label: t('supabase.mail.authEmails.dashboardHome'),
          to: links.value.project,
          icon: 'lucide:external-link',
        },
      ]
    : []
)
</script>

<template>
  <div class="flex flex-col gap-y-5">
    <p class="text-muted text-sm">{{ t('supabase.mail.authEmails.intro') }}</p>

    <section class="flex flex-col gap-y-2">
      <h3 class="text-highlighted text-sm font-semibold">
        {{ t('supabase.mail.authEmails.resendTitle') }}
      </h3>
      <p class="text-muted text-sm">
        {{ t('supabase.mail.authEmails.resendBody') }}
      </p>
      <div>
        <UButton
          :to="RESEND_SUPABASE_INTEGRATION_URL"
          target="_blank"
          rel="noopener noreferrer"
          icon="lucide:external-link"
          color="neutral"
          variant="outline"
        >
          {{ t('supabase.mail.authEmails.resendLink') }}
        </UButton>
      </div>
    </section>

    <section class="flex flex-col gap-y-2">
      <h3 class="text-highlighted text-sm font-semibold">
        {{ t('supabase.mail.authEmails.manualTitle') }}
      </h3>
      <p class="text-muted text-sm">
        {{ t('supabase.mail.authEmails.manualBody') }}
      </p>

      <ul
        class="border-default bg-elevated/50 divide-default divide-y rounded-md border"
      >
        <li
          v-for="row in smtpRows"
          :key="row.key"
          class="flex items-center gap-3 px-3 py-2"
        >
          <span class="text-muted w-24 shrink-0 text-sm">{{ row.label }}</span>
          <code
            class="min-w-0 flex-1 overflow-x-auto text-sm whitespace-nowrap"
            >{{ row.value }}</code
          >
          <AccessCopyButton
            v-if="row.copy"
            :text="row.copy"
            :label="
              t('supabase.mail.authEmails.copyValue', { label: row.label })
            "
          />
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-y-2">
      <h3 class="text-highlighted text-sm font-semibold">
        {{ t('supabase.mail.authEmails.dashboardTitle') }}
      </h3>

      <div v-if="dashboardLinks.length > 0" class="flex flex-wrap gap-2">
        <UButton
          v-for="link in dashboardLinks"
          :key="link.key"
          :to="link.to"
          :icon="link.icon"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="outline"
          size="sm"
        >
          {{ link.label }}
        </UButton>
      </div>
      <p v-else class="text-muted text-sm">
        {{ t('supabase.mail.authEmails.noProject') }}
      </p>

      <p v-if="dashboardLinks.length > 0" class="text-muted text-xs">
        {{ t('supabase.mail.authEmails.dashboardNote') }}
      </p>
    </section>

    <UAlert
      :description="t('supabase.mail.authEmails.rateLimitHint')"
      color="neutral"
      variant="subtle"
      icon="lucide:info"
    />
  </div>
</template>
