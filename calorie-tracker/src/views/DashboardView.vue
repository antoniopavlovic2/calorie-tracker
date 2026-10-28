<script setup>

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useDisplay } from 'vuetify'

import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'

import { auth, db } from '@/firebase'



const { smAndDown } = useDisplay()



function localDateKey(date = new Date()) {

const year = date.getFullYear()

const month = String(date.getMonth() + 1).padStart(2, '0')

const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`

}

function dateFromKey(key) {

const [year, month, day] = key.split('-').map(Number)

  return new Date(year, month - 1, day, 12)

}



const todayKey = ref(localDateKey())

const selectedDate = ref(todayKey.value)

const followToday = ref(true)

const goals = ref({ calories: 2500, protein: 180, carbs: 250, fat: 80 })

const entries = ref([])

const products = ref([])

const loadingEntries = ref(true)

const loadingProducts = ref(false)

const saving = ref(false)

const deletingId = ref(null)

const dialog = ref(false)

const selectedMeal = ref('breakfast')

const selectedProductId = ref(null)

const quantity = ref(100)

const productSearch = ref('')

const snackbar = ref(false)

const snackbarText = ref('')

const snackbarColor = ref('success')



const mealDefinitions = [

  { id: 'breakfast', name: 'Doručak', icon: 'mdi-coffee-outline' },

  { id: 'lunch', name: 'Ručak', icon: 'mdi-food-outline' },

  { id: 'dinner', name: 'Večera', icon: 'mdi-silverware-fork-knife' },

  { id: 'snack', name: 'Međuobroci', icon: 'mdi-food-apple-outline' }

]



const formattedDate = computed(() => dateFromKey(selectedDate.value).toLocaleDateString('hr-HR', {

  weekday: smAndDown.value ? undefined : 'long', day: 'numeric', month: smAndDown.value ? 'short' : 'long', year: 'numeric'

}))

const isToday = computed(() => selectedDate.value === todayKey.value)

const meals = computed(() => mealDefinitions.map(meal => ({ ...meal, foods: entries.value.filter(entry => entry.meal === meal.id) })))

const nutrition = computed(() => entries.value.reduce((total, entry) => {

  for (const key of ['calories', 'protein', 'carbs', 'fat']) total[key] += Number(entry.nutrition?.[key]) || 0

  return total

}, { calories: 0, protein: 0, carbs: 0, fat: 0 }))

const remainingCalories = computed(() => goals.value.calories - nutrition.value.calories)

const calorieProgress = computed(() => goals.value.calories > 0 ? Math.min((nutrition.value.calories / goals.value.calories) * 100, 100) : 0)

const macros = computed(() => [

  { name: 'Proteini', value: nutrition.value.protein, goal: goals.value.protein, color: 'info', icon: 'mdi-food-drumstick-outline' },

  { name: 'Ugljikohidrati', value: nutrition.value.carbs, goal: goals.value.carbs, color: 'warning', icon: 'mdi-barley' },

  { name: 'Masti', value: nutrition.value.fat, goal: goals.value.fat, color: 'secondary', icon: 'mdi-water-outline' }

])

const productOptions = computed(() => products.value.map(product => ({

  title: product.brand ? `${product.name} (${product.brand})` : product.name,

  subtitle: `${Number(product.nutrition?.calories) || 0} kcal / 100 g`, value: product.id

})))

const selectedProduct = computed(() => products.value.find(product => product.id === selectedProductId.value))

const previewNutrition = computed(() => {

const factor = Number(quantity.value) / 100

const source = selectedProduct.value?.nutrition || {}

  return Object.fromEntries(['calories', 'protein', 'carbs', 'sugars', 'fat', 'saturatedFat', 'fiber', 'salt']

    .map(key => [key, Math.round((Number(source[key]) || 0) * factor * 100) / 100]))

})



function showMessage(message, color = 'success') {

  snackbarText.value = message; snackbarColor.value = color; snackbar.value = true

}

function changeDate(days) {

const date = dateFromKey(selectedDate.value); date.setDate(date.getDate() + days)

  selectedDate.value = localDateKey(date); followToday.value = selectedDate.value === todayKey.value

}

function goToToday() { selectedDate.value = todayKey.value; followToday.value = true }

function getMealCalories(meal) { return meal.foods.reduce((total, food) => total + (Number(food.nutrition?.calories) || 0), 0) }

function macroProgress(macro) { return macro.goal > 0 ? Math.min((macro.value / macro.goal) * 100, 100) : 0 }



async function loadProducts() {

  loadingProducts.value = true

  try {

const snapshot = await getDocs(collection(db, 'products'))

    products.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'hr'))

  } catch (error) { console.error(error); showMessage('Nije moguće učitati proizvode.', 'error') }

  finally { loadingProducts.value = false }

}

async function addFood(mealId) {

  selectedMeal.value = mealId; selectedProductId.value = null; quantity.value = 100; productSearch.value = ''; dialog.value = true

  if (!products.value.length) await loadProducts()

}

async function saveFood() {

  if (!selectedProduct.value) return showMessage('Odaberi proizvod.', 'error')

const grams = Number(quantity.value)

  if (!Number.isFinite(grams) || grams <= 0) return showMessage('Unesi količinu veću od 0 g.', 'error')

  saving.value = true

  try {

    await addDoc(collection(db, 'users', auth.currentUser.uid, 'foodEntries'), {

      productId: selectedProduct.value.id, productName: selectedProduct.value.name, brand: selectedProduct.value.brand || '',

      date: selectedDate.value, meal: selectedMeal.value, quantity: grams, nutrition: { ...previewNutrition.value }, createdAt: serverTimestamp()

    })

    dialog.value = false; showMessage('Hrana je dodana u obrok.')

  } catch (error) { console.error(error); showMessage('Nije moguće spremiti unos. Provjeri Firestore Rules.', 'error') }

  finally { saving.value = false }

}

async function removeFood(entry) {

  deletingId.value = entry.id

  try { await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'foodEntries', entry.id)); showMessage('Unos je obrisan.') }

  catch (error) { console.error(error); showMessage('Nije moguće obrisati unos.', 'error') }

  finally { deletingId.value = null }

}



let unsubscribeEntries = null

let unsubscribeSettings = null

let dateInterval = null

watch(selectedDate, date => {
  if (!auth.currentUser) return

  if (unsubscribeEntries) unsubscribeEntries()

  entries.value = []; loadingEntries.value = true

  unsubscribeEntries = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'foodEntries'), where('date', '==', date)), snapshot => {

    entries.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))

    loadingEntries.value = false

  }, error => { console.error(error); loadingEntries.value = false; showMessage('Nije moguće učitati dnevne unose.', 'error') })

}, { immediate: true })



onMounted(() => {

  unsubscribeSettings = onSnapshot(doc(db, 'users', auth.currentUser.uid, 'settings', 'goals'), snapshot => {

    if (!snapshot.exists()) return

const data = snapshot.data()

    goals.value = { calories: Number(data.caloriesGoal) || 0, protein: Number(data.proteinGoal) || 0, carbs: Number(data.carbsGoal) || 0, fat: Number(data.fatGoal) || 0 }

  }, error => { console.error(error); showMessage('Ciljevi nisu učitani.', 'warning') })

  dateInterval = window.setInterval(() => {

const current = localDateKey()

    if (current !== todayKey.value) { todayKey.value = current; if (followToday.value) selectedDate.value = current }

  }, 30000)

})

onUnmounted(() => { unsubscribeEntries?.(); unsubscribeSettings?.(); if (dateInterval) window.clearInterval(dateInterval) })

</script>



<template>

  <v-main class="app-page">

    <v-container class="app-container">

      <header class="page-header">

        <div>

          <div class="eyebrow"><v-icon icon="mdi-view-dashboard-outline" size="18" /> PREGLED PREHRANE</div>

          <div class="text-h4 font-weight-bold">Moj dnevnik</div>

          <div class="text-body-2 text-medium-emphasis mt-1">Prati kalorije i makronutrijente tijekom dana</div>

        </div>

        <v-chip v-if="isToday" color="primary" variant="tonal" prepend-icon="mdi-calendar-check-outline">Danas</v-chip>

        <v-btn v-else color="primary" variant="tonal" prepend-icon="mdi-calendar-today-outline" @click="goToToday">Danas</v-btn>

      </header>



      <v-card class="date-card mb-6" rounded="xl" elevation="0">

        <v-btn icon="mdi-chevron-left" variant="text" aria-label="Prethodni dan" @click="changeDate(-1)" />

        <div class="date-label"><v-icon icon="mdi-calendar-blank-outline" color="primary" /><span class="text-capitalize font-weight-bold">{{ formattedDate }}</span></div>

        <v-btn icon="mdi-chevron-right" variant="text" aria-label="Sljedeći dan" @click="changeDate(1)" />

      </v-card>

      <v-progress-linear v-if="loadingEntries" indeterminate color="primary" rounded class="mb-4" />



      <v-row>

        <v-col cols="12" lg="7">

          <v-card class="calorie-card h-100" rounded="xl" elevation="0">

            <div class="d-flex justify-space-between align-start">

              <div><div class="muted-light">Danas uneseno</div><div class="calorie-number">{{ Math.round(nutrition.calories) }}</div><div class="muted-light">od {{ goals.calories }} kcal</div></div>

              <v-avatar class="fire-avatar" size="56"><v-icon icon="mdi-fire" size="32" /></v-avatar>

            </div>

            <v-progress-linear :model-value="calorieProgress" color="white" bg-color="white" bg-opacity="0.25" height="10" rounded class="my-5" />

            <div class="calorie-stats">

              <div><small>Ostvareno</small><strong>{{ Math.round(calorieProgress) }}%</strong></div>

              <div><small>Preostalo</small><strong>{{ Math.round(remainingCalories) }} kcal</strong></div>

              <div><small>Unosa</small><strong>{{ entries.length }}</strong></div>

            </div>

          </v-card>

        </v-col>

        <v-col cols="12" lg="5">

          <v-card class="surface-card pa-5 h-100" rounded="xl" elevation="0">

            <div class="text-subtitle-1 font-weight-bold mb-1">Dnevni cilj</div>

            <div class="text-caption text-medium-emphasis mb-5">Trenutno stanje makronutrijenata</div>

            <div v-for="macro in macros" :key="macro.name" class="goal-row">

              <v-avatar :color="macro.color" variant="tonal" size="38"><v-icon :icon="macro.icon" size="20" /></v-avatar>

              <div class="flex-grow-1"><div class="d-flex justify-space-between text-body-2 mb-2"><span>{{ macro.name }}</span><strong>{{ Math.round(macro.value) }} / {{ macro.goal }} g</strong></div><v-progress-linear :model-value="macroProgress(macro)" :color="macro.color" height="7" rounded /></div>

            </div>

          </v-card>

        </v-col>

      </v-row>



      <div class="section-title"><div><div class="text-h6 font-weight-bold">Makronutrijenti</div><div class="text-body-2 text-medium-emphasis">Raspodjela današnjeg unosa</div></div></div>

      <v-row>

        <v-col v-for="macro in macros" :key="macro.name" cols="12" sm="4">

          <v-card class="surface-card pa-5 h-100" rounded="xl" elevation="0">

            <div class="d-flex justify-space-between mb-4"><v-avatar :color="macro.color" variant="tonal"><v-icon :icon="macro.icon" /></v-avatar><v-chip :color="macro.color" variant="tonal" size="small">{{ Math.round(macroProgress(macro)) }}%</v-chip></div>

            <div class="text-body-2 text-medium-emphasis">{{ macro.name }}</div>

            <div class="text-h5 font-weight-bold my-2">{{ Math.round(macro.value) }} <span class="text-body-2 text-medium-emphasis">/ {{ macro.goal }} g</span></div>

            <v-progress-linear :model-value="macroProgress(macro)" :color="macro.color" height="8" rounded />

          </v-card>

        </v-col>

      </v-row>



      <div class="section-title"><div><div class="text-h6 font-weight-bold">Dnevni obroci</div><div class="text-body-2 text-medium-emphasis">Dodaj proizvode u odgovarajući obrok</div></div></div>

      <v-row>

        <v-col v-for="meal in meals" :key="meal.id" cols="12" md="6">

          <v-card class="surface-card meal-card h-100" rounded="xl" elevation="0">

            <div class="meal-header">

              <div class="d-flex align-center ga-3"><v-avatar color="primary" variant="tonal"><v-icon :icon="meal.icon" /></v-avatar><div><div class="font-weight-bold">{{ meal.name }}</div><div class="text-caption text-medium-emphasis">{{ Math.round(getMealCalories(meal)) }} kcal · {{ meal.foods.length }} stavki</div></div></div>

              <v-btn color="primary" variant="tonal" size="small" :icon="smAndDown ? 'mdi-plus' : undefined" :prepend-icon="smAndDown ? undefined : 'mdi-plus'" @click="addFood(meal.id)"><span v-if="!smAndDown">Dodaj</span></v-btn>

            </div>

            <v-divider />

            <div v-if="meal.foods.length" class="food-list">

              <div v-for="food in meal.foods" :key="food.id" class="food-row">

                <v-avatar color="surface-variant" size="40"><v-icon icon="mdi-food-variant" size="20" /></v-avatar>

                <div class="flex-grow-1 min-width-0"><div class="text-body-2 font-weight-bold">{{ food.productName }}</div><div class="text-caption text-medium-emphasis">{{ food.quantity }} g<span v-if="food.brand"> · {{ food.brand }}</span></div></div>

                <strong class="text-body-2 text-no-wrap">{{ Math.round(Number(food.nutrition?.calories) || 0) }} kcal</strong>

                <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" :loading="deletingId === food.id" @click="removeFood(food)" />

              </div>

            </div>

            <div v-else class="empty-state"><v-avatar color="surface-variant" size="54" class="mb-3"><v-icon icon="mdi-food-off-outline" /></v-avatar><div class="font-weight-medium">Obrok je trenutno prazan</div><div class="text-caption text-medium-emphasis mb-4">Dodaj prvu namirnicu u ovaj obrok</div><v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" @click="addFood(meal.id)">Dodaj namirnicu</v-btn></div>

          </v-card>

        </v-col>

      </v-row>

    </v-container>



    <v-dialog v-model="dialog" max-width="560" :fullscreen="smAndDown" persistent>

      <v-card :rounded="smAndDown ? 0 : 'xl'">

        <v-toolbar color="transparent"><v-toolbar-title class="font-weight-bold">Dodaj hranu</v-toolbar-title><v-btn icon="mdi-close" variant="text" :disabled="saving" @click="dialog = false" /></v-toolbar><v-divider />

        <v-card-text class="pa-5">

          <v-chip color="primary" variant="tonal" class="mb-5">{{ mealDefinitions.find(meal => meal.id === selectedMeal)?.name }}</v-chip>

          <v-autocomplete v-model="selectedProductId" v-model:search="productSearch" :items="productOptions" :loading="loadingProducts" label="Odaberi proizvod" placeholder="Pretraži proizvode" prepend-inner-icon="mdi-magnify" variant="outlined" clearable no-data-text="Nema proizvoda" />

          <v-text-field v-model.number="quantity" type="number" min="0.01" step="1" label="Količina" suffix="g" prepend-inner-icon="mdi-scale" variant="outlined" />

          <v-alert v-if="selectedProduct && Number(quantity) > 0" color="primary" variant="tonal"><div class="font-weight-bold mb-2">Vrijednosti za {{ quantity }} g</div><div class="preview-grid"><span><small>Energija</small><strong>{{ Math.round(previewNutrition.calories) }} kcal</strong></span><span><small>Proteini</small><strong>{{ previewNutrition.protein }} g</strong></span><span><small>UH</small><strong>{{ previewNutrition.carbs }} g</strong></span><span><small>Masti</small><strong>{{ previewNutrition.fat }} g</strong></span></div></v-alert>

        </v-card-text>

        <v-card-actions class="pa-5"><v-btn variant="text" :disabled="saving" @click="dialog = false">Odustani</v-btn><v-spacer /><v-btn color="primary" variant="flat" prepend-icon="mdi-plus" :loading="saving" :disabled="!selectedProduct || !(Number(quantity) > 0)" @click="saveFood">Dodaj u obrok</v-btn></v-card-actions>

      </v-card>

    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom center" rounded="lg">{{ snackbarText }}<template #actions><v-btn variant="text" @click="snackbar = false">Zatvori</v-btn></template></v-snackbar>

  </v-main>

</template>



<style scoped>

.app-page{min-height:100%;background:radial-gradient(circle at top right,rgba(var(--v-theme-primary),.08),transparent 34%),rgb(var(--v-theme-background))}.app-container{max-width:100%;padding-top:32px;padding-bottom:56px}.page-header,.section-title{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-header{margin-bottom:24px}.eyebrow{display:flex;align-items:center;gap:7px;color:rgb(var(--v-theme-primary));font-size:.75rem;font-weight:800;letter-spacing:.08em;margin-bottom:8px}.date-card{display:flex;align-items:center;justify-content:center;gap:12px;padding:8px;border:1px solid rgba(var(--v-border-color),var(--v-border-opacity))}.date-label{display:flex;align-items:center;justify-content:center;gap:10px;min-width:320px}.surface-card{border:1px solid rgba(var(--v-border-color),var(--v-border-opacity));background:rgb(var(--v-theme-surface))}.calorie-card{padding:28px;color:rgb(var(--v-theme-on-primary));background:radial-gradient(circle at top right,rgba(var(--v-theme-on-primary),.2),transparent 40%),linear-gradient(135deg,rgb(var(--v-theme-primary)),rgba(var(--v-theme-primary),.76))}.muted-light,.calorie-stats small{color:rgba(var(--v-theme-on-primary),.74)}.calorie-number{font-size:clamp(2.7rem,7vw,4rem);font-weight:800;line-height:1.1;letter-spacing:-.04em}.fire-avatar{background:rgba(var(--v-theme-on-primary),.16)}.calorie-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.calorie-stats div,.preview-grid span{display:flex;flex-direction:column}.goal-row{display:flex;align-items:center;gap:12px}.goal-row+.goal-row{margin-top:20px}.section-title{margin:30px 0 16px}.meal-card{overflow:hidden}.meal-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px}.food-list{padding:6px 20px}.food-row{display:flex;align-items:center;gap:12px;padding:12px 0}.food-row+.food-row{border-top:1px solid rgba(var(--v-border-color),var(--v-border-opacity))}.min-width-0{min-width:0}.empty-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}.preview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.preview-grid small{opacity:.7}@media(max-width:600px){.app-container{padding-top:20px;padding-bottom:32px}.page-header{align-items:flex-start}.date-label{min-width:0;flex:1;font-size:.875rem}.calorie-card{padding:22px}.calorie-stats{gap:6px}.meal-header,.food-list{padding-left:16px;padding-right:16px}.food-row{gap:8px}.preview-grid{grid-template-columns:repeat(2,1fr)}}

</style>


