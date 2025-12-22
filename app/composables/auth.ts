import type { RouteLocationNormalizedGeneric } from 'vue-router'

interface PlutoSupabaseAuthOptions {
  route?: RouteLocationNormalizedGeneric
}

export async function useAuth(authOptions?: PlutoSupabaseAuthOptions) {
  const supabase = useSupabaseClient()
  const supabaseSession = useSupabaseSession()

  const supabaseUser = await supabase.auth.getUser()

  const user = computed(() => supabaseUser.data.user?.user_metadata ?? null)
  const isLoggedIn = computed<boolean>(() => !!supabaseSession.value)
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

      return navigateTo(
        (authOptions?.route?.query.redirect as string) ?? '/admin/home'
      )
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

    if (options?.showToast) {
      console.warn(`User logged out`)
    }

    if (options?.redirectTo) {
      return navigateTo(`/admin/login?redirect=${options.redirectTo}`)
    }

    if (authOptions?.route && authOptions.route.path.startsWith('/admin')) {
      return navigateTo('/admin/login')
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
