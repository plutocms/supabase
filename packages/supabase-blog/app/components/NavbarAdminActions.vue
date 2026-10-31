<script setup lang="ts">
// The navbar actions of this layer. Each one uses the core PlutoNavbarButton,
// so it looks like every other action in the admin navbar.
interface NavbarAction {
  label: string
  icon: string
  to: string
  show: boolean
}

const route = useRoute()
const { t } = usePlutoI18n()

// `can()` only hides these actions from a user who cannot use them. It is
// a UI convenience, not a security boundary. The real enforcement is the
// posts:publish RLS policy and the requireCapability guard on the
// create/edit server routes.
const { can } = usePlutoPermissions()

const items = computed<NavbarAction[]>(() => [
  {
    label: t('supabase-blog.navbar.createPost'),
    icon: 'lucide:file-plus-2',
    to: '/admin/post/new',
    show: !route.path.startsWith('/admin/post/new') && can('posts:publish'),
  },

  {
    label: t('supabase-blog.navbar.editPost'),
    icon: 'lucide:file-pen-line',
    to: `/admin/post/edit/${
      ('id' in route.params && route.params.id) ||
      ('slug' in route.params && route.params.slug) ||
      ''
    }`,
    show: route.path.startsWith('/posts/') && can('posts:publish'),
  },
])
</script>

<template>
  <template v-for="item in items" :key="item.label">
    <PlutoNavbarButton
      v-if="item.show"
      :label="item.label"
      :icon="item.icon"
      :to="item.to"
    />
  </template>
</template>
