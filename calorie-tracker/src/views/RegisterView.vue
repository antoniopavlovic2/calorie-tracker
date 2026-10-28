<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function register() {
  error.value = ''
  if (!name.value.trim()) return (error.value = 'Unesi ime.')
  if (password.value.length < 6) return (error.value = 'Lozinka mora imati barem 6 znakova.')
  if (password.value !== confirmPassword.value) return (error.value = 'Lozinke se ne podudaraju.')
  loading.value = true
  try {
    const result = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
    await updateProfile(result.user, { displayName: name.value.trim() })
    await setDoc(doc(db, 'users', result.user.uid), {
      email: result.user.email,
      displayName: name.value.trim(),
      createdAt: serverTimestamp()
    })
    await setDoc(doc(db, 'users', result.user.uid, 'settings', 'goals'), {
      caloriesGoal: 2500, proteinGoal: 180, carbsGoal: 250, fatGoal: 80
    })
    await router.replace('/')
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') error.value = 'Ova email adresa već je registrirana.'
    else if (e.code === 'auth/invalid-email') error.value = 'Email adresa nije ispravna.'
    else if (e.code === 'auth/weak-password') error.value = 'Odaberi jaču lozinku.'
    else error.value = 'Registracija nije dovršena. Pokušaj ponovno.'
    // Ako je Auth račun kreiran, ali Firestore nije uspio, ostavi ga za popravak nakon prijave.
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="d-flex align-center justify-center" style="min-height:100vh;max-width:520px">
    <v-card rounded="xl" elevation="4" class="pa-7 w-100">
      <div class="text-h4 font-weight-bold mb-2">Kreiraj račun</div>
      <p class="text-medium-emphasis mb-6">Započni pratiti svoju prehranu</p>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <v-form @submit.prevent="register">
        <v-text-field v-model="name" label="Ime" variant="outlined" autocomplete="name" required />
        <v-text-field v-model="email" type="email" label="Email" variant="outlined" autocomplete="email" required />
        <v-text-field v-model="password" type="password" label="Lozinka" variant="outlined" autocomplete="new-password" required />
        <v-text-field v-model="confirmPassword" type="password" label="Potvrdi lozinku" variant="outlined" autocomplete="new-password" required />
        <v-btn type="submit" color="primary" size="large" block :loading="loading">Registriraj se</v-btn>
      </v-form>
      <div class="text-center mt-5">Već imaš račun? <router-link to="/login">Prijavi se</router-link></div>
    </v-card>
  </v-container>
</template>
