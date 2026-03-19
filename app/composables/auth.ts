import type { RouteLocationNormalizedGeneric } from 'vue-router'

interface PlutoSupabaseAuthOptions {
  route?: RouteLocationNormalizedGeneric
}

export async function useAuth(authOptions?: PlutoSupabaseAuthOptions) {
  const toast = useToast()

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (error) {
        console.error(`Error signing in user: ${error?.message}`)

        toast.add({
          title: 'Could not log in',
          description: error?.message,
          icon: 'lucide:circle-x',
          color: 'error',
        })

        isSubmitting.value = false

        return
      }

      if (data.user && data.user.user_metadata.is_admin) {
        // Set the first_setup flag in the healthcheck table to false
        const { error: healthcheckError } = await supabase
          .from('healthcheck')
          .update({ config_value: 'false' })
          .eq('config_name', 'first_setup')

        if (healthcheckError) {
          return {
            success: false,
            message: healthcheckError.message,
            error: healthcheckError,
          }
        }
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

      toast.add({
        title: 'Logged out successfully',
        icon: 'lucide:check',
        color: 'success',
      })
    }

    if (options?.redirectTo) {
      return navigateTo(`/admin/login?redirect=${options.redirectTo}`)
    }

    if (authOptions?.route && authOptions.route.path.startsWith('/admin')) {
      return navigateTo('/admin/login')
    }

    return navigateTo('/admin/login')
  }

  return {
    isLoggedIn,
    isSubmitting,
    user,
    login,
    logout,
  }
}
