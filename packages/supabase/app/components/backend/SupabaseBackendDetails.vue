<script setup lang="ts">
// The popover body of the backend badge of core (`backend.details`): the
// Supabase project that holds the content, with a link to its dashboard. A
// local Supabase (or a custom domain) has no project ref, so the host shows.
import {
  supabaseDashboardLinks,
  supabaseProjectRef,
} from '../../utils/supabase-project'

const { t } = usePlutoI18n()
const url = String(
  (useRuntimeConfig().public.supabase as { url?: string } | undefined)?.url ??
    ''
)
const projectRef = supabaseProjectRef(url)
const dashboard = projectRef ? supabaseDashboardLinks(projectRef).project : ''
const host = (() => {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
})()
</script>

<template>
  <div class="space-y-3">
    <p class="text-muted">{{ t('supabase.backend.description') }}</p>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <dt class="text-muted">
        {{
          projectRef
            ? t('supabase.backend.project')
            : t('supabase.backend.host')
        }}
      </dt>
      <dd class="text-highlighted truncate font-mono text-xs/5">
        {{ projectRef || host }}
      </dd>
    </dl>
    <UButton
      v-if="dashboard"
      :label="t('supabase.backend.openDashboard')"
      :to="dashboard"
      color="neutral"
      trailing-icon="i-lucide-arrow-up-right"
      size="xs"
      target="_blank"
      variant="outline"
    />
  </div>
</template>
