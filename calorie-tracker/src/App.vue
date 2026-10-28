<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { useDisplay } from 'vuetify'
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()
const showNav = computed(() => !['login', 'register'].includes(route.name))
async function logout() { await signOut(auth); await router.replace('/login') }
</script>
<template>
  <v-app>
    <v-app-bar v-if="showNav" flat border color="surface">
      <v-app-bar-title class="font-weight-bold"><v-icon color="primary" icon="mdi-fire" class="mr-2" />Calorie Tracker</v-app-bar-title>
      <template v-if="!smAndDown">
        <v-btn to="/" :active="route.name === 'dashboard'" prepend-icon="mdi-view-dashboard-outline">Dashboard</v-btn>
        <v-btn to="/products" :active="route.name === 'products'" prepend-icon="mdi-food-apple-outline">Proizvodi</v-btn>
      </template>
      <v-btn icon="mdi-logout" aria-label="Odjava" title="Odjava" @click="logout" />
    </v-app-bar>
    <v-main><router-view /></v-main>
    <v-bottom-navigation v-if="showNav && smAndDown" grow color="primary" elevation="8">
      <v-btn to="/"><v-icon>mdi-view-dashboard-outline</v-icon><span>Dnevnik</span></v-btn>
      <v-btn to="/products"><v-icon>mdi-food-apple-outline</v-icon><span>Proizvodi</span></v-btn>
    </v-bottom-navigation>
  </v-app>
</template>
