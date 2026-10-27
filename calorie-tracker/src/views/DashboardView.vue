<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { db } from '@/firebase'

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
  { id: 'breakfast', name: 'Doručak', icon: 'mdi-coffee' },
  { id: 'lunch', name: 'Ručak', icon: 'mdi-food' },
  { id: 'dinner', name: 'Večera', icon: 'mdi-silverware-fork-knife' },
  { id: 'snack', name: 'Međuobroci', icon: 'mdi-food-apple' }
]

const formattedDate = computed(() =>
  dateFromKey(selectedDate.value).toLocaleDateString('hr-HR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
)

const isToday = computed(() => selectedDate.value === todayKey.value)

const meals = computed(() => mealDefinitions.map(meal => ({
  ...meal,
  foods: entries.value.filter(entry => entry.meal === meal.id)
})))

const nutrition = computed(() => entries.value.reduce((total, entry) => {
  for (const key of ['calories', 'protein', 'carbs', 'fat']) {
    total[key] += Number(entry.nutrition?.[key]) || 0
  }
  return total
}, { calories: 0, protein: 0, carbs: 0, fat: 0 }))

const remainingCalories = computed(() => goals.value.calories - nutrition.value.calories)
const calorieProgress = computed(() => goals.value.calories > 0
  ? Math.min((nutrition.value.calories / goals.value.calories) * 100, 100)
  : 0
)

const macros = computed(() => [
  { name: 'Proteini', value: nutrition.value.protein, goal: goals.value.protein, color: 'blue', icon: 'mdi-food-drumstick' },
  { name: 'Ugljikohidrati', value: nutrition.value.carbs, goal: goals.value.carbs, color: 'orange', icon: 'mdi-barley' },
  { name: 'Masti', value: nutrition.value.fat, goal: goals.value.fat, color: 'purple', icon: 'mdi-water' }
])

const productOptions = computed(() => products.value.map(product => ({
  title: `${product.name} ${product.brand ? `(${product.brand})` : ''}`,
  value: product.id
})))

const selectedProduct = computed(() => products.value.find(product => product.id === selectedProductId.value))

const previewNutrition = computed(() => {
  const factor = Number(quantity.value) / 100
  const source = selectedProduct.value?.nutrition || {}
  const result = {}
  for (const key of ['calories', 'protein', 'carbs', 'sugars', 'fat', 'saturatedFat', 'fiber', 'salt']) {
    result[key] = Math.round(((Number(source[key]) || 0) * factor) * 100) / 100
  }
  return result
})

function showMessage(message, color = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

function changeDate(days) {
  const date = dateFromKey(selectedDate.value)
  date.setDate(date.getDate() + days)
  selectedDate.value = localDateKey(date)
  followToday.value = selectedDate.value === todayKey.value
}

function goToToday() {
  selectedDate.value = todayKey.value
  followToday.value = true
}

function getMealCalories(meal) {
  return meal.foods.reduce((total, food) => total + (Number(food.nutrition?.calories) || 0), 0)
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    const snapshot = await getDocs(collection(db, 'products'))
    products.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'hr'))
  } catch (error) {
    console.error('Greška pri učitavanju proizvoda:', error)
    showMessage('Nije moguće učitati proizvode.', 'error')
  } finally {
    loadingProducts.value = false
  }
}

async function addFood(mealId) {
  selectedMeal.value = mealId
  selectedProductId.value = null
  quantity.value = 100
  productSearch.value = ''
  dialog.value = true
  await loadProducts()
}

async function saveFood() {
  if (!selectedProduct.value) {
    showMessage('Odaberi proizvod.', 'error')
    return
  }
  const grams = Number(quantity.value)
  if (!Number.isFinite(grams) || grams <= 0) {
    showMessage('Unesi količinu veću od 0 g.', 'error')
    return
  }
  saving.value = true
  try {
    await addDoc(collection(db, 'foodEntries'), {
      productId: selectedProduct.value.id,
      productName: selectedProduct.value.name,
      brand: selectedProduct.value.brand || '',
      date: selectedDate.value,
      meal: selectedMeal.value,
      quantity: grams,
      nutrition: { ...previewNutrition.value },
      createdAt: serverTimestamp()
    })
    dialog.value = false
    showMessage('Hrana je dodana u obrok.')
  } catch (error) {
    console.error('Greška pri dodavanju hrane:', error)
    showMessage('Nije moguće spremiti unos. Provjeri Firestore Rules.', 'error')
  } finally {
    saving.value = false
  }
}

async function removeFood(entry) {
  deletingId.value = entry.id
  try {
    await deleteDoc(doc(db, 'foodEntries', entry.id))
    showMessage('Unos je obrisan.')
  } catch (error) {
    console.error('Greška pri brisanju:', error)
    showMessage('Nije moguće obrisati unos. Provjeri Firestore Rules.', 'error')
  } finally {
    deletingId.value = null
  }
}

let unsubscribeEntries = null
let unsubscribeSettings = null
let dateInterval = null

watch(selectedDate, date => {
  if (unsubscribeEntries) unsubscribeEntries()
  entries.value = []
  loadingEntries.value = true
  const entriesQuery = query(collection(db, 'foodEntries'), where('date', '==', date))
  unsubscribeEntries = onSnapshot(entriesQuery, snapshot => {
    entries.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    loadingEntries.value = false
  }, error => {
    console.error('Greška pri učitavanju unosa:', error)
    loadingEntries.value = false
    showMessage('Nije moguće učitati dnevne unose. Provjeri Firestore Rules.', 'error')
  })
}, { immediate: true })

onMounted(() => {
  unsubscribeSettings = onSnapshot(doc(db, 'settings', 'default'), snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      goals.value = {
        calories: Number(data.caloriesGoal) || 0,
        protein: Number(data.proteinGoal) || 0,
        carbs: Number(data.carbsGoal) || 0,
        fat: Number(data.fatGoal) || 0
      }
    }
  }, error => {
    console.error('Greška pri učitavanju ciljeva:', error)
    showMessage('Ciljevi nisu učitani; prikazane su početne vrijednosti.', 'warning')
  })

  dateInterval = window.setInterval(() => {
    const current = localDateKey()
    if (current !== todayKey.value) {
      todayKey.value = current
      if (followToday.value) selectedDate.value = current
    }
  }, 30000)
})

onUnmounted(() => {
  if (unsubscribeEntries) unsubscribeEntries()
  if (unsubscribeSettings) unsubscribeSettings()
  if (dateInterval) window.clearInterval(dateInterval)
})
</script>

<template>
  <v-container class="py-6" style="max-width: 1200px">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Dashboard</h1>
        <div class="d-flex align-center ga-2">
          <v-btn icon="mdi-chevron-left" variant="text" size="small" aria-label="Prethodni dan" @click="changeDate(-1)" />
          <span class="text-body-1 text-capitalize">{{ formattedDate }}</span>
          <v-btn icon="mdi-chevron-right" variant="text" size="small" aria-label="Sljedeći dan" @click="changeDate(1)" />
        </div>
      </div>
      <v-btn v-if="!isToday" variant="tonal" color="primary" prepend-icon="mdi-calendar-today" @click="goToToday">Danas</v-btn>
      <v-chip v-else color="primary" variant="tonal">Danas</v-chip>
    </div>

    <v-progress-linear v-if="loadingEntries" indeterminate color="primary" class="mb-4" />

    <v-card rounded="xl" elevation="2" class="pa-6 mb-6">
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="text-body-2 text-medium-emphasis">Unesene kalorije</div>
          <div class="text-h3 font-weight-bold mt-2">
            {{ Math.round(nutrition.calories) }}
            <span class="text-h6 text-medium-emphasis">/ {{ goals.calories }}</span>
          </div>
        </div>
        <v-avatar color="primary" size="56" variant="tonal">
          <v-icon icon="mdi-fire" size="32" />
        </v-avatar>
      </div>
      <v-progress-linear :model-value="calorieProgress" color="primary" height="12" rounded />
      <div class="d-flex justify-space-between mt-4">
        <div>
          <div class="text-caption text-medium-emphasis">Uneseno</div>
          <div class="text-h6 font-weight-bold">{{ Math.round(nutrition.calories) }} kcal</div>
        </div>
        <div class="text-right">
          <div class="text-caption text-medium-emphasis">Preostalo</div>
          <div class="text-h6 font-weight-bold" :class="remainingCalories < 0 ? 'text-error' : 'text-success'">
            {{ Math.round(remainingCalories) }} kcal
          </div>
        </div>
      </div>
    </v-card>

    <h2 class="text-h6 font-weight-bold mb-4">Makronutrijenti</h2>
    <v-row class="mb-4">
      <v-col v-for="macro in macros" :key="macro.name" cols="12" sm="4">
        <v-card rounded="xl" elevation="2" class="pa-5 h-100">
          <div class="d-flex align-center mb-4">
            <v-avatar :color="macro.color" variant="tonal" size="42" class="mr-3">
              <v-icon :icon="macro.icon" />
            </v-avatar>
            <span class="font-weight-medium">{{ macro.name }}</span>
          </div>
          <div class="text-h5 font-weight-bold mb-3">
            {{ Math.round(macro.value) }}
            <span class="text-body-2 text-medium-emphasis">/ {{ macro.goal }} g</span>
          </div>
          <v-progress-linear
            :model-value="macro.goal > 0 ? Math.min((macro.value / macro.goal) * 100, 100) : 0"
            :color="macro.color" height="8" rounded
          />
        </v-card>
      </v-col>
    </v-row>

    <h2 class="text-h6 font-weight-bold mb-4">Obroci</h2>
    <v-row>
      <v-col v-for="meal in meals" :key="meal.id" cols="12" md="6">
        <v-card rounded="xl" elevation="2" class="h-100">
          <v-card-title class="d-flex align-center pa-4">
            <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
              <v-icon :icon="meal.icon" />
            </v-avatar>
            <div class="flex-grow-1">
              <div class="text-subtitle-1 font-weight-bold">{{ meal.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ Math.round(getMealCalories(meal)) }} kcal</div>
            </div>
            <v-btn icon="mdi-plus" variant="tonal" color="primary" size="small"
              :aria-label="`Dodaj hranu: ${meal.name}`" @click="addFood(meal.id)" />
          </v-card-title>
          <v-divider />
          <v-card-text>
            <template v-if="meal.foods.length">
              <div v-for="food in meal.foods" :key="food.id" class="d-flex align-center justify-space-between ga-2 py-2">
                <div class="flex-grow-1">
                  <div class="font-weight-medium">{{ food.productName }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ food.quantity }} g<span v-if="food.brand"> · {{ food.brand }}</span>
                  </div>
                </div>
                <div class="font-weight-medium text-no-wrap">{{ Math.round(Number(food.nutrition?.calories) || 0) }} kcal</div>
                <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small"
                  :loading="deletingId === food.id" :aria-label="`Obriši ${food.productName}`" @click="removeFood(food)" />
              </div>
            </template>
            <div v-else class="text-center text-medium-emphasis py-6">
              <v-icon icon="mdi-food-off" size="32" class="mb-2" />
              <div>Nema unesenih namirnica</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="540">
      <v-card rounded="xl">
        <v-card-title class="pa-5">Dodaj hranu — {{ mealDefinitions.find(meal => meal.id === selectedMeal)?.name }}</v-card-title>
        <v-card-text>
          <v-autocomplete v-model="selectedProductId" v-model:search="productSearch"
            :items="productOptions" :loading="loadingProducts" label="Odaberi proizvod"
            placeholder="Pretraži proizvode" variant="outlined" clearable no-data-text="Nema proizvoda" />
          <v-text-field v-model.number="quantity" type="number" min="0.01" step="1"
            label="Količina (g)" variant="outlined" />
          <v-alert v-if="selectedProduct && Number(quantity) > 0" type="info" variant="tonal" density="compact">
            <div class="font-weight-medium mb-1">Nutritivne vrijednosti za {{ quantity }} g</div>
            <div>{{ Math.round(previewNutrition.calories) }} kcal</div>
            <div>Proteini: {{ previewNutrition.protein }} g · UH: {{ previewNutrition.carbs }} g · Masti: {{ previewNutrition.fat }} g</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="dialog = false">Odustani</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="!selectedProduct || !(Number(quantity) > 0)" @click="saveFood">Dodaj</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
      <template #actions><v-btn variant="text" @click="snackbar = false">Zatvori</v-btn></template>
    </v-snackbar>
  </v-container>
</template>
