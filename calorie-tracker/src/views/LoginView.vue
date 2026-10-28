<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const visible = ref(false)
const loading = ref(false)
const error = ref('')
const info = ref('')

function authError(code) {
  if (code === 'auth/invalid-email') return 'Email adresa nije ispravna.'
  if (code === 'auth/too-many-requests') return 'Previše pokušaja. Pokušaj ponovno kasnije.'
  return 'Prijava nije uspjela. Provjeri email i lozinku.'
}

async function login() {
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    const destination = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/'
    await router.replace(destination)
  } catch (e) {
    error.value = authError(e.code)
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  error.value = ''
  info.value = ''
  if (!email.value.trim()) return (error.value = 'Prvo upiši email adresu.')
  try {
    await sendPasswordResetEmail(auth, email.value.trim())
    info.value = 'Ako je račun registriran, dobit ćeš email za resetiranje lozinke.'
  } catch (e) {
    error.value = e.code === 'auth/invalid-email' ? 'Email adresa nije ispravna.' : 'Slanje emaila nije uspjelo.'
  }
}
</script>

<template>
  <v-container class="d-flex align-center justify-center" style="min-height:100vh;max-width:520px">
    <v-card rounded="xl" elevation="4" class="pa-7 w-100">
      <div class="text-h4 font-weight-bold mb-2">Dobrodošao natrag</div>
      <p class="text-medium-emphasis mb-6">Prijavi se u Calorie Tracker</p>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <v-alert v-if="info" type="success" variant="tonal" class="mb-4">{{ info }}</v-alert>
      <v-form @submit.prevent="login">
        <v-text-field v-model="email" type="email" label="Email" prepend-inner-icon="mdi-email-outline" variant="outlined" autocomplete="email" required />
        <v-text-field v-model="password" :type="visible ? 'text' : 'password'" label="Lozinka" prepend-inner-icon="mdi-lock-outline" :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="visible = !visible" variant="outlined" autocomplete="current-password" required />
        <v-btn type="submit" color="primary" size="large" block :loading="loading">Prijavi se</v-btn>
      </v-form>
      <v-btn variant="text" block class="mt-3" @click="resetPassword">Zaboravljena lozinka?</v-btn>
      <div class="text-center mt-4">Nemaš račun? <router-link to="/register">Registriraj se</router-link></div>
    </v-card>
  </v-container>
</template>
