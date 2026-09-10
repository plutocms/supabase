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

const envLine = computed(() => `DATABASE_URL="${props.connectionString}"`)

async function copyEnvLine() {
  try {
    await navigator.clipboard.writeText(envLine.value)

    toast.add({
      title: 'Copied',
      description: 'The DATABASE_URL line is on your clipboard.',
      icon: 'lucide:check-circle',
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Could not copy',
      description: 'Select and copy the line by hand instead.',
      icon: 'lucide:circle-x',
      color: 'error',
    })
  }
}
</script>

<template>
  <UAlert
    color="warning"
    variant="outline"
    icon="lucide:triangle-alert"
    title="Connection string not saved automatically"
  >
    <template #description>
      <div class="flex flex-col gap-y-3">
        <p>
          The database change already succeeded. Pluto could not write
          <code>DATABASE_URL</code> to your project's
          <code>.env</code> file, so it will ask again next time unless you
          add it by hand:
        </p>

        <ol class="list-inside list-decimal">
          <li>Open (or create) <code>.env</code> in your project's root folder.</li>
          <li>Add this line. Replace any existing <code>DATABASE_URL</code> line with it.</li>
          <li>Restart the server.</li>
        </ol>

        <div class="flex items-center gap-x-2">
          <code
            class="bg-muted grow overflow-x-auto rounded-md px-2 py-1.5 text-xs whitespace-nowrap"
          >
            {{ envLine }}
          </code>

          <UButton
            icon="lucide:copy"
            variant="soft"
            color="neutral"
            size="sm"
            aria-label="Copy the DATABASE_URL line"
            @click="copyEnvLine"
          />
        </div>
      </div>
    </template>
  </UAlert>
</template>
