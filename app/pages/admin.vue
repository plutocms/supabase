<script setup lang="ts">
definePageMeta({
  middleware: ['setup-check', 'auth'],
  layout: 'admin',
})

const route = useRoute()
const { isLoggedIn, logout, allowedUnauthenticatedPaths } = await useAuth()
const toast = useToast()

// Loading/clearing permissions on login/logout lives in
// app/plugins/pluto-permissions-sync.ts now, not here — that plugin runs
// on every page, not just this one, so a signed-in admin browsing a public
// page directly (no prior visit to /admin/** this session) still gets
// their capabilities loaded.

const visibility = useDocumentVisibility()

watch(visibility, async (current, previous) => {
  if (current === 'visible' && previous === 'hidden') {
    if (
      !isLoggedIn.value &&
      !route.path.startsWith('/admin/setup') &&
      !allowedUnauthenticatedPaths.includes(route.path)
    ) {
      await logout({ redirectTo: route.path })

      toast.add({
        title: 'You are not logged in',
        description: 'Please log in to continue.',
        icon: 'lucide:circle-x',
        color: 'error',
      })
    }
  }
})
</script>

<template>
  <div class="light:text-zinc-800 h-full dark:text-white">
    <ClientOnly>
      <Container
        v-if="
          isLoggedIn
            && !route.path.startsWith('/admin/setup')
            && !route.path.startsWith('/admin/migrations')
        "
        class="pt-4"
      >
        <MigrationsBanner />
      </Container>
    </ClientOnly>

    <NuxtPage />
  </div>
</template>
