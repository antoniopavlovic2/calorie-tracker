<script setup>
import { ref, onMounted } from 'vue'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'

import { db } from '@/firebase'

// Proizvodi iz baze
const products = ref([])

// Dialog za dodavanje proizvoda
const dialog = ref(false)

// Loading
const loading = ref(false)
const saving = ref(false)

// Poruke
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Forma
const form = ref({
  name: '',
  brand: '',
  calories: null,
  protein: null,
  carbs: null,
  sugars: null,
  fat: null,
  saturatedFat: null,
  fiber: null,
  salt: null
})

// Dohvati proizvode iz Firebasea
async function getProducts() {
  loading.value = true

  try {
    const snapshot = await getDocs(
      collection(db, 'products')
    )

    products.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

  } catch (error) {
    console.error(error)
    showMessage('Greška pri učitavanju proizvoda.', 'error')
  } finally {
    loading.value = false
  }
}

// Dodaj proizvod
async function addProduct() {
  if (!form.value.name.trim()) {
    showMessage('Unesi naziv proizvoda.', 'error')
    return
  }

  if (!form.value.brand.trim()) {
    showMessage('Unesi proizvođača.', 'error')
    return
  }

  const nutritionFields = [
    'calories',
    'protein',
    'carbs',
    'sugars',
    'fat',
    'saturatedFat',
    'fiber',
    'salt'
  ]

  for (const field of nutritionFields) {
    const value = form.value[field]

    if (
      value === null ||
      value === '' ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      showMessage('Unesi sve nutritivne vrijednosti (0 ako ih nema).', 'error')
      return
    }
  }

  saving.value = true

  try {
    const product = {
      name: form.value.name.trim(),
      brand: form.value.brand.trim(),

      nutrition: {
        calories: Number(form.value.calories),
        protein: Number(form.value.protein),
        carbs: Number(form.value.carbs),
        sugars: Number(form.value.sugars),
        fat: Number(form.value.fat),
        saturatedFat: Number(form.value.saturatedFat),
        fiber: Number(form.value.fiber),
        salt: Number(form.value.salt)
      },

      createdAt: serverTimestamp()
    }

    await addDoc(collection(db, 'products'), product)

    showMessage('Proizvod je uspješno dodan!', 'success')

    dialog.value = false

    resetForm()

    await getProducts()

  } catch (error) {
    console.error(error)
    showMessage('Greška pri spremanju proizvoda.', 'error')
  } finally {
    saving.value = false
  }
}

// Reset forme
function resetForm() {
  form.value = {
    name: '',
    brand: '',
    calories: null,
    protein: null,
    carbs: null,
    sugars: null,
    fat: null,
    saturatedFat: null,
    fiber: null,
    salt: null
  }
}

// Snackbar
function showMessage(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// Učitaj proizvode
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Moj Firebase UID:', user.uid)

      await getProducts()
    } else {
      try {
        await signInAnonymously(auth)
      } catch (error) {
        console.error('Greška pri prijavi:', error)
      }
    }
  })
})
</script>

<template>
  <v-container class="py-6" style="max-width: 1200px">

    <!-- HEADER -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">
          Proizvodi
        </h1>

        <p class="text-medium-emphasis">
          Baza prehrambenih proizvoda
        </p>
      </div>

      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="dialog = true"
      >
        Dodaj proizvod
      </v-btn>
    </div>

    <!-- POPIS PROIZVODA -->
    <v-card rounded="xl" elevation="2">
      <v-card-title class="pa-4">
        Svi proizvodi ({{ products.length }})
      </v-card-title>

      <v-divider />

      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
      />

      <v-table>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Proizvođač</th>
            <th>Kalorije</th>
            <th>Proteini</th>
            <th>UH</th>
            <th>Masti</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="product in products"
            :key="product.id"
          >
            <td>{{ product.name }}</td>
            <td>{{ product.brand }}</td>
            <td>{{ product.nutrition.calories }} kcal</td>
            <td>{{ product.nutrition.protein }} g</td>
            <td>{{ product.nutrition.carbs }} g</td>
            <td>{{ product.nutrition.fat }} g</td>
          </tr>

          <tr v-if="!loading && products.length === 0">
            <td colspan="6" class="text-center py-6">
              Nema dodanih proizvoda.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- DIALOG ZA DODAVANJE -->
    <v-dialog
      v-model="dialog"
      max-width="650"
      scrollable
    >
      <v-card rounded="xl">

        <v-card-title class="pa-5">
          Dodaj novi proizvod
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">

          <v-form @submit.prevent="addProduct">

            <v-text-field
              v-model="form.name"
              label="Naziv artikla"
              variant="outlined"
              class="mb-2"
            />

            <v-text-field
              v-model="form.brand"
              label="Proizvođač"
              variant="outlined"
              class="mb-4"
            />

            <div class="text-subtitle-1 font-weight-bold mb-4">
              Nutritivne vrijednosti na 100 g
            </div>

            <v-row>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.calories"
                  label="Kalorije (kcal)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.protein"
                  label="Proteini (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.carbs"
                  label="Ugljikohidrati (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.sugars"
                  label="Od toga šećeri (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.fat"
                  label="Masti (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.saturatedFat"
                  label="Zasićene masti (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.fiber"
                  label="Vlakna (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.salt"
                  label="Sol (g)"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                />
              </v-col>

            </v-row>

          </v-form>

        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />

          <v-btn
            variant="text"
            @click="dialog = false"
          >
            Odustani
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            @click="addProduct"
          >
            Spremi proizvod
          </v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- SNACKBAR -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarText }}

      <template #actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          Zatvori
        </v-btn>
      </template>
    </v-snackbar>

  </v-container>
</template>