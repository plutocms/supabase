const sidebarActions = [
  {
    label: 'Media Library',
    href: '/admin/media',
    icon: 'lucide:images',
  },
]

export default defineNuxtPlugin(() => {
  const { addAction: addSidebarAdminActions } = useSidebarAdminActions()

  addSidebarAdminActions(sidebarActions)
})
