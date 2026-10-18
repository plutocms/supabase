<script setup lang="ts">
const { field } = usePlutoSettings()
const { t } = usePlutoI18n()

const websiteTitle = field('website_title')
const websiteDescription = field('website_description')
const websiteUrl = field('website_url')
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <UFormField
      :label="t('supabase.settings.general.websiteTitle')"
      class="w-full lg:w-1/2"
    >
      <UInput
        v-model="websiteTitle"
        :placeholder="t('supabase.settings.general.websiteTitlePlaceholder')"
      />
    </UFormField>

    <UFormField
      :label="t('supabase.settings.general.websiteDescription')"
      class="w-full lg:w-1/2"
    >
      <UInput
        v-model="websiteDescription"
        :placeholder="
          t('supabase.settings.general.websiteDescriptionPlaceholder')
        "
      />
    </UFormField>

    <UFormField
      :label="t('supabase.settings.general.websiteUrl')"
      class="w-full lg:w-1/2"
    >
      <UInput
        v-model="websiteUrl"
        :placeholder="t('supabase.settings.general.websiteUrlPlaceholder')"
        type="url"
      />
    </UFormField>
  </div>
</template>
