import type { MaybeRefOrGetter } from 'vue'

interface PlutoSupabaseAuthOptions {
  /**
   * A safe local path to open after a sign-in. Core checks it with
   * `safeRedirect`. When it is empty, the sign-in opens the admin home.
   */
  redirect?: MaybeRefOrGetter<string | undefined>
}

// Sign-in, password reset and password update for the supabase auth pages.
// The session, the user and the sign-out are in the auth driver
// (app/plugins/pluto-extension.ts), not here.
export function useAuth(authOptions?: PlutoSupabaseAuthOptions) {
  const toast = useToast()
  // Read at setup, while the Nuxt context exists. The functions below run
  // later, after an await, when the context is gone.
  const { t, te } = usePlutoI18n()
  const authErrorText = (error: unknown) =>
    resolveAuthErrorText(error, { t, te })

  const supabase = useSupabaseClient()

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
          title: t('supabase.auth.toasts.loginFailed'),
          description: authErrorText(error),
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
          console.error(`Error saving first setup: ${healthcheckError.message}`)

          toast.add({
            title: t('supabase.auth.toasts.loginFailed'),
            description: authErrorText(healthcheckError),
            icon: 'lucide:circle-x',
            color: 'error',
          })

          isSubmitting.value = false

          return {
            success: false,
            message: healthcheckError.message,
            error: healthcheckError,
          }
        }
      }

      return navigateTo(
        toValue(authOptions?.redirect) || SUPABASE_SIGN_IN_FALLBACK
      )
    } catch (error) {
      if (import.meta.dev) {
        console.error(error)
      }

      console.error(`Error during login: ${error}`)

      isSubmitting.value = false
    }
  }

  async function requestPasswordReset(email: string) {
    isSubmitting.value = true

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/update-password`,
      })

      if (error) {
        toast.add({
          title: t('supabase.auth.toasts.resetFailed'),
          description: authErrorText(error),
          icon: 'lucide:circle-x',
          color: 'error',
        })

        return { success: false }
      }

      return { success: true }
    } catch (error) {
      toast.add({
        title: t('supabase.auth.toasts.resetFailed'),
        description: authErrorText(error),
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return { success: false }
    } finally {
      isSubmitting.value = false
    }
  }

  async function updatePassword(password: string) {
    isSubmitting.value = true

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.add({
          title: t('supabase.auth.toasts.updateFailed'),
          description: authErrorText(error),
          icon: 'lucide:circle-x',
          color: 'error',
        })

        return { success: false }
      }

      toast.add({
        title: t('supabase.auth.toasts.passwordUpdated'),
        icon: 'lucide:check',
        color: 'success',
      })

      return { success: true }
    } catch (error) {
      toast.add({
        title: t('supabase.auth.toasts.updateFailed'),
        description: authErrorText(error),
        icon: 'lucide:circle-x',
        color: 'error',
      })

      return { success: false }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting,
    login,
    requestPasswordReset,
    updatePassword,
  }
}
