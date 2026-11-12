import { defineAsyncComponent } from 'vue'

// The editor widget loads on demand. Tiptap and ProseMirror stay out of the
// entry chunk. Core shows a skeleton while the chunk loads.
const PlutoRichtextField = defineAsyncComponent(
  () => import('../components/PlutoRichtextField.vue')
)

export default defineNuxtPlugin(() => {
  definePlutoExtension({
    id: 'supabase-blog',
    nav: [
      {
        id: 'posts',
        order: 200,
        label: 'supabase-blog.nav.posts',
        icon: 'lucide:file-text',
        to: '/admin/posts',
        defaultOpen: true,
        // The list first, then the create link: the order of core (the Git CMS posts).
        children: [
          {
            label: 'supabase-blog.nav.allPosts',
            to: '/admin/posts',
            icon: 'lucide:list',
          },
          {
            label: 'supabase-blog.nav.createPost',
            to: '/admin/post/new',
            icon: 'lucide:plus',
          },
        ],
      },
    ],
    pages: [
      {
        id: 'posts',
        path: '/admin/posts',
        title: 'supabase-blog.nav.posts',
        icon: 'lucide:file-text',
      },
      {
        id: 'post-new',
        path: '/admin/post/new',
        title: 'supabase-blog.pages.newPost',
        parent: 'supabase-blog:posts',
      },
    ],
    capabilities: [
      {
        id: 'posts-read-drafts',
        key: 'posts:read_drafts',
        label: 'supabase-blog.capabilities.readDrafts',
      },
      {
        id: 'posts-write',
        key: 'posts:write',
        label: 'supabase-blog.capabilities.write',
      },
      {
        id: 'posts-publish',
        key: 'posts:publish',
        label: 'supabase-blog.capabilities.publish',
      },
      {
        id: 'posts-delete',
        key: 'posts:delete',
        label: 'supabase-blog.capabilities.delete',
      },
      {
        id: 'terms-manage',
        key: 'terms:manage',
        label: 'supabase-blog.capabilities.manageTerms',
      },
      {
        id: 'authors-manage',
        key: 'authors:manage',
        label: 'supabase-blog.capabilities.manageAuthors',
      },
    ],
    contentTypes: [
      { id: 'post', type: postType },
      ...blogTermTypes.map((type) => ({ id: type.name, type })),
      { id: 'author', type: blogAuthorType },
    ],
    contentFieldWidgets: [
      { id: 'richtext', fieldType: 'richtext', component: PlutoRichtextField },
    ],
  })
})
