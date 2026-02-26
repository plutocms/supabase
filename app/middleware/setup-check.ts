export default defineNuxtRouteMiddleware(async (to, from) => {
  if (to.path !== '/admin/setup' && to.path.startsWith('/admin')) {
    try {
      const data = await $fetch('/api/settings/first_setup')
  
      if (
        data.is_first_setup === true &&
        from.path.startsWith('/admin') &&
        to.path !== '/admin/setup'
      ) {
        return navigateTo('/admin/setup')
      }
  
      if (
        data.is_first_setup === false &&
        from.path.startsWith('/admin') &&
        to.path === '/admin/setup'
      ) {
        return navigateTo('/')
      }
    } catch(error) {
      return navigateTo('/admin/setup')
    }
  }
})
