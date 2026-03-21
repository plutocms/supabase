import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isLoggedIn, logout } = await useAuth({
    route: to as RouteLocationNormalizedGeneric,
  })

  const allowedUnauthenticatedPaths = [
    '/admin/login',
    '/admin/signup',
    '/admin/confirm',
    '/admin/setup',
    '/admin/forgot-password',
  ]

  if (isLoggedIn.value && allowedUnauthenticatedPaths.includes(to.path)) {
    return navigateTo(
      to.query.redirect
        ? decodeURIComponent(to.query.redirect as string)
        : '/admin/home'
    )
  }

  if (
    !isLoggedIn.value &&
    to.path.startsWith('/admin') &&
    !allowedUnauthenticatedPaths.includes(to.path)
  ) {
    if (from.query.redirect) {
      return logout({
        redirectTo: from.query.redirect as string,
        showToast: true,
      })
    } else {
      return logout()
    }
  }
})
