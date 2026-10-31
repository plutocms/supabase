<script setup lang="ts">
// Shown when a migration (or the setup wizard) applied successfully but
// could not write DATABASE_URL to .env — see server/utils/env-file.ts for
// why this can happen (process.cwd() may not be the project root in a
// production build).
//
// `connectionString` is never sent here from the server — it is the value
// the admin already typed into this page's own form. Showing it back to
// the same browser that just typed it does not violate the "never send it
// back" rule that applies to the server's response; it is only saying it
// out loud so the admin can finish the one manual step themselves.
const props = defineProps<{
  connectionString: string
}>()

const toast = useToast()
const { t } = usePlutoI18n()

const envLine = computed(() => `DATABASE_URL="${props.connectionString}"`)

async function copyEnvLine() {
  try {
    await navigator.clipboard.writeText(envLine.value)

    toast.add({
      title: t('supabase.envWarning.copied'),
      description: t('supabase.envWarning.copiedDescription'),
      icon: 'lucide:check-circle',
      color: 'success',
    })
  } catch {
    toast.add({
      title: t('supabase.envWarning.copyFailed'),
      description: t('supabase.envWarning.copyFailedDescription'),
      icon: 'lucide:circle-x',
      color: 'error',
    })
  }
}
</script>

<template>
  <UAlert
    :title="t('supabase.envWarning.title')"
    color="warning"
    variant="outline"
    icon="lucide:triangle-alert"
  >
    <template #description>
      <div class="flex flex-col gap-y-3">
        <p>
          <SupabaseMessageParts :message="t('supabase.envWarning.intro')">
            <template #variable>
              <code>DATABASE_URL</code>
            </template>
            <template #file>
              <code>.env</code>
            </template>
          </SupabaseMessageParts>
        </p>

        <ol class="list-inside list-decimal">
          <li>
            <SupabaseMessageParts :message="t('supabase.envWarning.step1')">
              <template #file>
                <code>.env</code>
              </template>
            </SupabaseMessageParts>
          </li>
          <li>
            <SupabaseMessageParts :message="t('supabase.envWarning.step2')">
              <template #variable>
                <code>DATABASE_URL</code>
              </template>
            </SupabaseMessageParts>
          </li>
          <li>{{ t('supabase.envWarning.step3') }}</li>
        </ol>

        <div class="flex items-center gap-x-2">
          <code
            class="bg-muted grow overflow-x-auto rounded-md px-2 py-1.5 text-xs whitespace-nowrap"
          >
            {{ envLine }}
          </code>

          <UButton
            :aria-label="t('supabase.envWarning.copyLine')"
            icon="lucide:copy"
            variant="soft"
            color="neutral"
            size="sm"
            @click="copyEnvLine"
          />
        </div>
      </div>
    </template>
  </UAlert>
</template>
