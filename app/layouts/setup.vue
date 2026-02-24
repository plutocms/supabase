<script setup lang="ts"></script>

<template>
  <div
    class="dark:bg-admin-content light:bg-white font-outfit flex h-full grow flex-col"
  >
    <div class="flex h-full justify-center">
      <div class="grow overflow-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>
