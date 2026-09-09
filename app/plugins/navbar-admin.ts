import NavbarAdminProvider from '../components/navbar/NavbarAdminProvider.vue'

export default defineNuxtPlugin(() => {
  const { registerNavbar } = useNavbarAdmin()

  registerNavbar(NavbarAdminProvider)
})
