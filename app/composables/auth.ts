export async function useAuth() {
  const supabase = useSupabaseClient()
  const user =
    (await supabase.auth.getUser()).data.user?.identities?.[0]?.identity_data ??
    null
  const route = useRoute()

  const isLoggedIn = computed<boolean>(() => !!user)
  const isSubmitting = ref<boolean>(false)

  interface LoginForm {
    email: string
    password: string
  }

  async function login(form: LoginForm) {
    isSubmitting.value = true

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (error) {
        console.error(`Error signing in user: ${error?.message}`)

        isSubmitting.value = false

        return
      }

      navigateTo((route.query.redirect as string) ?? '/admin/home')
    } catch (error) {
      if (import.meta.dev) {
        console.error(error)
      }

      console.error(`Error during login: ${error}`)

      isSubmitting.value = false
    }
  }

  interface LogoutOptions {
    redirectTo?: string
    showToast?: boolean
  }

  async function logout(options?: LogoutOptions) {
    await supabase.auth.signOut()

    await nextTick()

    if (options?.showToast) {
      console.warn(`User logged out`)
    }

    if (options?.redirectTo) {
      return navigateTo(`/admin/login?redirect=${options.redirectTo}`)
    }

    if (route && route.path.startsWith('/admin')) {
      navigateTo('/admin/login')
    }
  }

  return {
    isLoggedIn,
    isSubmitting,
    user,
    login,
    logout,
  }
}
