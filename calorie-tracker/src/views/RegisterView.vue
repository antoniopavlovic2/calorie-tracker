<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
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
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="auth-page">
    <v-row no-gutters class="auth-layout">
      <v-col cols="12" md="5" lg="4" class="form-panel">
        <div class="mobile-brand d-flex d-md-none">
          <v-avatar color="primary" variant="tonal" size="44"><v-icon icon="mdi-nutrition" /></v-avatar>
          <div><div class="font-weight-bold">Calorie Tracker</div><div class="text-caption text-medium-emphasis">Dnevnik prehrane</div></div>
        </div>

        <div class="form-shell">
          <v-btn to="/login" variant="text" prepend-icon="mdi-arrow-left" class="text-none back-button mb-7">Natrag na prijavu</v-btn>

          <div class="form-heading mb-7">
            <v-avatar color="primary" variant="tonal" size="48" class="mb-5"><v-icon icon="mdi-account-plus-outline" /></v-avatar>
            <div class="text-h4 font-weight-bold mb-2">Kreiraj svoj račun</div>
            <div class="text-body-1 text-medium-emphasis">Postavi ciljeve i započni pratiti svoju prehranu.</div>
          </div>

          <v-alert v-if="error" type="error" variant="tonal" rounded="lg" class="mb-4">{{ error }}</v-alert>

          <v-form @submit.prevent="register">
            <div class="field-label">Ime</div>
            <v-text-field v-model="name" placeholder="Tvoje ime" prepend-inner-icon="mdi-account-outline" variant="outlined" autocomplete="name" required class="mb-1" />

            <div class="field-label">Email adresa</div>
            <v-text-field v-model="email" type="email" placeholder="ime@primjer.hr" prepend-inner-icon="mdi-email-outline" variant="outlined" autocomplete="email" required class="mb-1" />

            <v-row dense>
              <v-col cols="12" sm="6">
                <div class="field-label">Lozinka</div>
                <v-text-field v-model="password" type="password" placeholder="Najmanje 6 znakova" prepend-inner-icon="mdi-lock-outline" variant="outlined" autocomplete="new-password" required />
              </v-col>
              <v-col cols="12" sm="6">
                <div class="field-label">Potvrdi lozinku</div>
                <v-text-field v-model="confirmPassword" type="password" placeholder="Ponovi lozinku" prepend-inner-icon="mdi-lock-check-outline" variant="outlined" autocomplete="new-password" required />
              </v-col>
            </v-row>

            <v-btn type="submit" color="primary" size="large" block :loading="loading" class="register-button mt-2" append-icon="mdi-arrow-right">Kreiraj račun</v-btn>
          </v-form>

          <div class="text-center text-body-2 text-medium-emphasis mt-7">
            Već imaš račun?
            <router-link to="/login" class="auth-link">Prijavi se</router-link>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="7" lg="8" class="brand-panel d-none d-md-flex">
        <div class="brand-orb brand-orb-one" />
        <div class="brand-orb brand-orb-two" />

        <div class="brand-content">
          <div class="brand-mark mb-10">
            <v-avatar class="brand-logo" size="52"><v-icon icon="mdi-nutrition" size="29" /></v-avatar>
            <div><div class="text-h6 font-weight-bold">Calorie Tracker</div><div class="text-caption brand-muted">Pametniji dnevnik prehrane</div></div>
          </div>

          <div class="brand-kicker mb-5"><v-icon icon="mdi-target" size="18" /> POSTAVI CILJ. PRATI NAPREDAK.</div>
          <div class="brand-title mb-5">Bolje navike počinju<br />jednim jednostavnim korakom.</div>
          <div class="text-body-1 brand-description mb-10">Napravi besplatan račun i dobij jasan pregled svakog obroka, svakog dana i svakog napretka.</div>

          <div class="benefit-list">
            <div><v-icon icon="mdi-check-circle" /><span>Personalizirani dnevni ciljevi</span></div>
            <div><v-icon icon="mdi-check-circle" /><span>Pregled kalorija i makronutrijenata</span></div>
            <div><v-icon icon="mdi-check-circle" /><span>Responzivno iskustvo na svakom uređaju</span></div>
          </div>
        </div>

        <div class="brand-footer">Calorie Tracker · Tvoj dnevnik, tvoji ciljevi.</div>
      </v-col>
    </v-row>
  </v-main>
</template>

<style scoped>
.auth-page{width:100%;min-height:100vh;background:rgb(var(--v-theme-background))}.auth-layout{width:100%;min-height:100vh;margin:0}.form-panel{position:relative;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:48px clamp(28px,4vw,72px);background:rgb(var(--v-theme-surface))}.form-shell{width:100%;max-width:520px}.back-button{margin-left:-12px}.field-label{margin:0 0 8px 2px;font-size:.8rem;font-weight:700}.register-button{height:54px!important;border-radius:12px}.auth-link{margin-left:5px;color:rgb(var(--v-theme-primary));font-weight:700;text-decoration:none}.auth-link:hover{text-decoration:underline}.mobile-brand{position:absolute;top:24px;left:24px;align-items:center;gap:11px}.brand-panel{position:relative;min-height:100vh;overflow:hidden;flex-direction:column;justify-content:center;padding:clamp(48px,7vw,112px);color:rgb(var(--v-theme-on-primary));background:linear-gradient(215deg,rgb(var(--v-theme-primary)),rgba(var(--v-theme-primary),.76))}.brand-content{position:relative;z-index:2;max-width:760px}.brand-mark{display:flex;align-items:center;gap:14px}.brand-logo{color:rgb(var(--v-theme-on-primary));background:rgba(var(--v-theme-on-primary),.14);border:1px solid rgba(var(--v-theme-on-primary),.18)}.brand-muted,.brand-description{color:rgba(var(--v-theme-on-primary),.72)}.brand-kicker{display:flex;align-items:center;gap:9px;font-size:.75rem;font-weight:800;letter-spacing:.12em;color:rgba(var(--v-theme-on-primary),.8)}.brand-title{font-size:clamp(2.6rem,4.5vw,5rem);font-weight:800;line-height:1.05;letter-spacing:-.045em}.brand-description{max-width:620px;font-size:1.08rem!important;line-height:1.75}.benefit-list{display:grid;gap:15px}.benefit-list div{display:flex;align-items:center;gap:12px;font-weight:600}.benefit-list .v-icon{color:rgba(var(--v-theme-on-primary),.82)}.brand-footer{position:absolute;z-index:2;left:clamp(48px,7vw,112px);bottom:32px;font-size:.75rem;color:rgba(var(--v-theme-on-primary),.55)}.brand-orb{position:absolute;border-radius:50%;background:rgba(var(--v-theme-on-primary),.08)}.brand-orb-one{width:450px;height:450px;right:-140px;top:-150px}.brand-orb-two{width:320px;height:320px;left:-110px;bottom:-120px}@media(max-width:959px){.form-panel{padding:110px 24px 64px}.form-shell{max-width:560px}}@media(max-width:600px){.form-heading .text-h4{font-size:1.8rem!important}.form-panel{padding-left:20px;padding-right:20px}.mobile-brand{left:20px}.back-button{margin-top:20px}}
</style>
