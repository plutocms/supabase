import NavbarAdminProvider from '../components/navbar/NavbarAdminProvider.vue'

export default defineNuxtPlugin(() => {
  definePlutoExtension({
    id: 'supabase',
    navbar: { id: 'admin-navbar', component: NavbarAdminProvider },
  })
})
