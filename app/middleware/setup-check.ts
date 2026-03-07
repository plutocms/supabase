export default defineNuxtRouteMiddleware(async (to, _from) => {
  if (!to.path.startsWith('/admin')) {
    return
  }

  try {
    const data = await $fetch('/api/settings/first_setup')

    if (!data.success) {
      // Cannot determine setup state — send to setup page
      if (to.path !== '/admin/setup') {
        return navigateTo('/admin/setup')
      }
      return
    }

    if (data.is_first_setup) {
      // Setup not done yet — only allow the setup page
      if (to.path !== '/admin/setup') {
        return navigateTo('/admin/setup')
      }
    } else {
      // Setup already done — block access to setup page
      if (to.path === '/admin/setup') {
        return navigateTo('/admin/login')
      }
    }
  } catch (error) {
    if (import.meta.dev) {
      console.error('Error checking first setup status:', error)
    }

    if (to.path !== '/admin/setup') {
      return navigateTo('/admin/setup')
    }
  }
})
