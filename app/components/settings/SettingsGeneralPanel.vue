<script setup lang="ts">
const { field } = usePlutoSettings()

const websiteTitle = field('website_title')
const websiteDescription = field('website_description')
const websiteUrl = field('website_url')
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <UFormField label="Website Title" class="w-full lg:w-1/2">
      <UInput v-model="websiteTitle" placeholder="e.g. My Website" />
    </UFormField>

    <UFormField label="Website Description" class="w-full lg:w-1/2">
      <UInput
        v-model="websiteDescription"
        placeholder="e.g. My Website Description"
      />
    </UFormField>

    <UFormField label="Website URL" class="w-full lg:w-1/2">
      <UInput
        v-model="websiteUrl"
        type="url"
        placeholder="e.g. https://example.com"
      />
    </UFormField>
  </div>
</template>
