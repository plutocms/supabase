<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Account Verification',
})
</script>

<template>
  <div class="grid h-full place-items-center">
    <UCard class="w-100">
      <div class="space-y-6 py-10">
        <div class="text-center space-y-4">
          <hgroup class="flex flex-col gap-y-1">
            <span class="text-5xl">
              <UIcon name="lucide:mail-check" class="inline-block" />
            </span>

            <h1 class="text-3xl font-bold">Account verified!</h1>
          </hgroup>

          <p>
            Your account has been successfully verified. You can now start using
            the Dashboard.
          </p>

          <div class="flex items-center justify-center gap-x-4">
            <UButton to="/admin" color="primary" icon="lucide:layout-dashboard">
              Go to Dashboard
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
