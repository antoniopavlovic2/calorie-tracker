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
  <v-main class="auth-page">
    <v-row no-gutters class="auth-layout">
      <v-col cols="12" md="7" lg="8" class="brand-panel d-none d-md-flex">
        <div class="brand-orb brand-orb-one" />
        <div class="brand-orb brand-orb-two" />

        <div class="brand-content">
          <div class="brand-mark mb-10">
            <v-avatar class="brand-logo" size="52">
              <v-icon icon="mdi-nutrition" size="29" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">Calorie Tracker</div>
              <div class="text-caption brand-muted">Pametniji dnevnik prehrane</div>
            </div>
          </div>

          <div class="brand-kicker mb-5">
            <v-icon icon="mdi-chart-line" size="18" />
            TVOJ NAPREDAK, JASNO PRIKAZAN
          </div>

          <div class="brand-title mb-5">
            Svaki obrok je korak<br />prema boljoj verziji sebe.
          </div>

          <div class="text-body-1 brand-description mb-10">
            Jednostavno prati kalorije, makronutrijente i dnevne ciljeve na svim svojim uređajima.
          </div>

          <div class="feature-grid">
            <div class="feature-item">
              <v-avatar class="feature-icon" size="42"><v-icon icon="mdi-chart-donut" /></v-avatar>
              <div><strong>Dnevni pregled</strong><span>Kalorije i makronutrijenti</span></div>
            </div>
            <div class="feature-item">
              <v-avatar class="feature-icon" size="42"><v-icon icon="mdi-database-outline" /></v-avatar>
              <div><strong>Baza proizvoda</strong><span>Sve namirnice na jednom mjestu</span></div>
            </div>
          </div>
        </div>

        <div class="brand-footer">Calorie Tracker · Jednostavno. Pregledno. Tvoje.</div>
      </v-col>

      <v-col cols="12" md="5" lg="4" class="form-panel">
        <div class="mobile-brand d-flex d-md-none">
          <v-avatar color="primary" variant="tonal" size="44"><v-icon icon="mdi-nutrition" /></v-avatar>
          <div><div class="font-weight-bold">Calorie Tracker</div><div class="text-caption text-medium-emphasis">Dnevnik prehrane</div></div>
        </div>

        <div class="form-shell">
          <div class="form-heading mb-8">
            <v-avatar color="primary" variant="tonal" size="48" class="mb-5"><v-icon icon="mdi-hand-wave-outline" /></v-avatar>
            <div class="text-h4 font-weight-bold mb-2">Dobrodošao natrag</div>
            <div class="text-body-1 text-medium-emphasis">Prijavi se i nastavi pratiti svoj napredak.</div>
          </div>

          <v-alert v-if="error" type="error" variant="tonal" rounded="lg" class="mb-4">{{ error }}</v-alert>
          <v-alert v-if="info" type="success" variant="tonal" rounded="lg" class="mb-4">{{ info }}</v-alert>

          <v-form @submit.prevent="login">
            <div class="field-label">Email adresa</div>
            <v-text-field v-model="email" type="email" placeholder="ime@primjer.hr" prepend-inner-icon="mdi-email-outline" variant="outlined" autocomplete="email" required class="mb-2" />

            <div class="field-label">Lozinka</div>
            <v-text-field v-model="password" :type="visible ? 'text' : 'password'" placeholder="Unesi lozinku" prepend-inner-icon="mdi-lock-outline" :append-inner-icon="visible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" @click:append-inner="visible = !visible" variant="outlined" autocomplete="current-password" required />

            <div class="d-flex justify-end mb-5">
              <v-btn variant="text" color="primary" size="small" class="text-none" @click="resetPassword">Zaboravljena lozinka?</v-btn>
            </div>

            <v-btn type="submit" color="primary" size="large" block :loading="loading" class="login-button" append-icon="mdi-arrow-right">Prijavi se</v-btn>
          </v-form>

          <div class="auth-divider my-8"><span>ili</span></div>

          <div class="text-center text-body-2 text-medium-emphasis">
            Nemaš račun?
            <router-link to="/register" class="auth-link">Kreiraj račun</router-link>
          </div>
        </div>

        <div class="form-footer">Sigurna prijava putem Firebase Authenticationa</div>
      </v-col>
    </v-row>
  </v-main>
</template>

<style scoped>
.auth-page{width:100%;min-height:100vh;background:rgb(var(--v-theme-background))}.auth-layout{width:100%;min-height:100vh;margin:0}.brand-panel{position:relative;min-height:100vh;overflow:hidden;flex-direction:column;justify-content:center;padding:clamp(48px,7vw,112px);color:rgb(var(--v-theme-on-primary));background:linear-gradient(145deg,rgb(var(--v-theme-primary)),rgba(var(--v-theme-primary),.76))}.brand-content{position:relative;z-index:2;max-width:760px}.brand-mark{display:flex;align-items:center;gap:14px}.brand-logo,.feature-icon{color:rgb(var(--v-theme-on-primary));background:rgba(var(--v-theme-on-primary),.14);border:1px solid rgba(var(--v-theme-on-primary),.18)}.brand-muted,.brand-description{color:rgba(var(--v-theme-on-primary),.72)}.brand-kicker{display:flex;align-items:center;gap:9px;font-size:.75rem;font-weight:800;letter-spacing:.12em;color:rgba(var(--v-theme-on-primary),.8)}.brand-title{font-size:clamp(2.6rem,4.5vw,5rem);font-weight:800;line-height:1.05;letter-spacing:-.045em}.brand-description{max-width:610px;font-size:1.08rem!important;line-height:1.75}.feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:680px}.feature-item{display:flex;align-items:center;gap:13px;padding:17px;border:1px solid rgba(var(--v-theme-on-primary),.14);border-radius:18px;background:rgba(var(--v-theme-on-primary),.08);backdrop-filter:blur(12px)}.feature-item div{display:flex;flex-direction:column}.feature-item span{font-size:.78rem;color:rgba(var(--v-theme-on-primary),.64)}.brand-footer{position:absolute;z-index:2;left:clamp(48px,7vw,112px);bottom:32px;font-size:.75rem;color:rgba(var(--v-theme-on-primary),.55)}.brand-orb{position:absolute;border-radius:50%;background:rgba(var(--v-theme-on-primary),.08);filter:blur(2px)}.brand-orb-one{width:420px;height:420px;right:-130px;top:-130px}.brand-orb-two{width:300px;height:300px;left:-100px;bottom:-100px}.form-panel{position:relative;display:flex;min-height:100vh;flex-direction:column;align-items:center;justify-content:center;padding:48px clamp(28px,4vw,72px);background:rgb(var(--v-theme-surface))}.form-shell{width:100%;max-width:480px}.field-label{margin:0 0 8px 2px;font-size:.8rem;font-weight:700}.login-button{height:54px!important;border-radius:12px}.auth-divider{display:flex;align-items:center;gap:14px;color:rgba(var(--v-theme-on-surface),.45);font-size:.75rem}.auth-divider::before,.auth-divider::after{content:"";height:1px;flex:1;background:rgba(var(--v-border-color),var(--v-border-opacity))}.auth-link{margin-left:5px;color:rgb(var(--v-theme-primary));font-weight:700;text-decoration:none}.auth-link:hover{text-decoration:underline}.form-footer{position:absolute;bottom:24px;font-size:.72rem;color:rgba(var(--v-theme-on-surface),.44)}.mobile-brand{position:absolute;top:24px;left:24px;align-items:center;gap:11px}@media(max-width:959px){.form-panel{padding:110px 24px 64px}.form-shell{max-width:520px}.form-footer{position:static;margin-top:48px;text-align:center}}@media(max-width:600px){.form-heading .text-h4{font-size:1.8rem!important}.form-panel{padding-left:20px;padding-right:20px}.mobile-brand{left:20px}}
</style>
