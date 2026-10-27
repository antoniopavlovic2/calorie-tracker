<script setup>

import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useDisplay } from 'vuetify'

import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'

import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

import { auth, db } from '@/firebase'



const { smAndDown } = useDisplay()

const products = ref([])

const dialog = ref(false)

const loading = ref(false)

const saving = ref(false)
const deleteDialog = ref(false)
const productToDelete = ref(null)
const deleting = ref(false)

const search = ref('')

const snackbar = ref(false)

const snackbarText = ref('')

const snackbarColor = ref('success')

const emptyForm = () => ({ name: '', brand: '', calories: null, protein: null, carbs: null, sugars: null, fat: null, saturatedFat: null, fiber: null, salt: null })

const form = ref(emptyForm())



const filteredProducts = computed(() => {

const term = search.value.trim().toLocaleLowerCase('hr')

  if (!term) return products.value

  return products.value.filter(product => `${product.name || ''} ${product.brand || ''}`.toLocaleLowerCase('hr').includes(term))

})

const brandsCount = computed(() => new Set(products.value.map(product => product.brand?.trim().toLocaleLowerCase('hr')).filter(Boolean)).size)

const averageCalories = computed(() => products.value.length ? Math.round(products.value.reduce((sum, product) => sum + (Number(product.nutrition?.calories) || 0), 0) / products.value.length) : 0)



function showMessage(text, color = 'success') { snackbarText.value = text; snackbarColor.value = color; snackbar.value = true }

function resetForm() { form.value = emptyForm() }

function openDialog() { resetForm(); dialog.value = true }

function closeDialog() { if (!saving.value) { dialog.value = false; resetForm() } }

function formatValue(value) { const number = Number(value); return Number.isFinite(number) ? (Number.isInteger(number) ? number : number.toFixed(1)) : 0 }



async function getProducts() {

  loading.value = true

  try {

const snapshot = await getDocs(collection(db, 'products'))

    products.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'hr'))

  } catch (error) { console.error(error); showMessage('Greška pri učitavanju proizvoda.', 'error') }

  finally { loading.value = false }

}

async function addProduct() {

const name = form.value.name.trim(); const brand = form.value.brand.trim()

  if (!name) return showMessage('Unesi naziv proizvoda.', 'error')

  if (!brand) return showMessage('Unesi proizvođača.', 'error')

const fields = ['calories', 'protein', 'carbs', 'sugars', 'fat', 'saturatedFat', 'fiber', 'salt']

  if (fields.some(field => form.value[field] === null || form.value[field] === '' || !Number.isFinite(Number(form.value[field])) || Number(form.value[field]) < 0)) return showMessage('Unesi sve nutritivne vrijednosti (0 ako ih nema).', 'error')

  saving.value = true

  try {

    await addDoc(collection(db, 'products'), {

      name, brand, nutrition: Object.fromEntries(fields.map(field => [field, Number(form.value[field])])), createdAt: serverTimestamp()

    })

    dialog.value = false; resetForm(); showMessage('Proizvod je uspješno dodan!'); await getProducts()

  } catch (error) { console.error(error); showMessage('Greška pri spremanju proizvoda.', 'error') }

  finally { saving.value = false }

}



function confirmDelete(product) {
  productToDelete.value = product
  deleteDialog.value = true
}

function cancelDelete() {
  if (deleting.value) return
  deleteDialog.value = false
  productToDelete.value = null
}

async function deleteProduct() {
  if (!productToDelete.value || deleting.value) return
  deleting.value = true
  try {
    await deleteDoc(doc(db, 'products', productToDelete.value.id))
    products.value = products.value.filter(product => product.id !== productToDelete.value.id)
    showMessage('Proizvod je uspješno izbrisan!')
    deleteDialog.value = false
    productToDelete.value = null
  } catch (error) {
    console.error(error)
    showMessage('Greška pri brisanju proizvoda.', 'error')
  } finally {
    deleting.value = false
  }
}

let unsubscribeAuth = null

onMounted(() => {

  unsubscribeAuth = onAuthStateChanged(auth, async user => {

    if (user) await getProducts()

    else try { await signInAnonymously(auth) } catch (error) { console.error(error); showMessage('Prijava nije uspjela.', 'error') }

  })

})

onUnmounted(() => unsubscribeAuth?.())

</script>



<template>

  <v-main class="app-page">

    <v-container class="app-container">

      <header class="page-header">

        <div><div class="eyebrow"><v-icon icon="mdi-database-outline" size="18" /> BAZA NAMIRNICA</div><div class="text-h4 font-weight-bold">Proizvodi</div><div class="text-body-2 text-medium-emphasis mt-1">Upravljaj proizvodima i nutritivnim vrijednostima</div></div>

        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" :block="smAndDown" @click="openDialog">Dodaj proizvod</v-btn>

      </header>



      <v-row class="mb-2">

        <v-col cols="12" sm="4"><v-card class="surface-card pa-5 h-100" rounded="xl" elevation="0"><div class="stat"><div><div class="text-caption text-medium-emphasis">Ukupno proizvoda</div><div class="text-h4 font-weight-bold mt-1">{{ products.length }}</div></div><v-avatar color="primary" variant="tonal"><v-icon icon="mdi-food-variant" /></v-avatar></div></v-card></v-col>

        <v-col cols="12" sm="4"><v-card class="surface-card pa-5 h-100" rounded="xl" elevation="0"><div class="stat"><div><div class="text-caption text-medium-emphasis">Proizvođača</div><div class="text-h4 font-weight-bold mt-1">{{ brandsCount }}</div></div><v-avatar color="info" variant="tonal"><v-icon icon="mdi-domain" /></v-avatar></div></v-card></v-col>

        <v-col cols="12" sm="4"><v-card class="surface-card pa-5 h-100" rounded="xl" elevation="0"><div class="stat"><div><div class="text-caption text-medium-emphasis">Prosječna energija</div><div class="text-h4 font-weight-bold mt-1">{{ averageCalories }} <span class="text-body-2 text-medium-emphasis">kcal</span></div></div><v-avatar color="warning" variant="tonal"><v-icon icon="mdi-fire" /></v-avatar></div></v-card></v-col>

      </v-row>



      <v-card class="surface-card products-card" rounded="xl" elevation="0">

        <div class="toolbar"><div><div class="text-subtitle-1 font-weight-bold">Svi proizvodi</div><div class="text-caption text-medium-emphasis">{{ filteredProducts.length }} od {{ products.length }} proizvoda</div></div><v-text-field v-model="search" label="Pretraži proizvode" placeholder="Naziv ili proizvođač" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable hide-details class="search" /></div>

        <v-progress-linear v-if="loading" indeterminate color="primary" />



        <v-table v-if="!smAndDown" class="products-table">

          <thead><tr><th>Proizvod</th><th>Proizvođač</th><th class="text-right">Kalorije</th><th class="text-right">Proteini</th><th class="text-right">UH</th><th class="text-right">Masti</th><th class="text-right">Akcije</th></tr></thead>

          <tbody><tr v-for="product in filteredProducts" :key="product.id"><td><div class="d-flex align-center ga-3 py-2"><v-avatar color="primary" variant="tonal" size="40"><strong>{{ product.name?.charAt(0)?.toUpperCase() }}</strong></v-avatar><div><div class="font-weight-bold">{{ product.name }}</div><div class="text-caption text-medium-emphasis">Vrijednosti na 100 g</div></div></div></td><td>{{ product.brand }}</td><td class="text-right font-weight-medium">{{ formatValue(product.nutrition?.calories) }} kcal</td><td class="text-right">{{ formatValue(product.nutrition?.protein) }} g</td><td class="text-right">{{ formatValue(product.nutrition?.carbs) }} g</td><td class="text-right">{{ formatValue(product.nutrition?.fat) }} g</td><td class="text-right"><v-btn icon="mdi-delete-outline" color="error" variant="text" size="small" :aria-label="`Izbriši ${product.name}`" @click="confirmDelete(product)" /></td></tr></tbody>

        </v-table>



        <div v-else class="mobile-list">

          <v-card v-for="product in filteredProducts" :key="product.id" rounded="lg" variant="outlined" class="mobile-card">

            <div class="d-flex align-start ga-3 mb-4"><v-avatar color="primary" variant="tonal"><strong>{{ product.name?.charAt(0)?.toUpperCase() }}</strong></v-avatar><div class="flex-grow-1"><div class="font-weight-bold">{{ product.name }}</div><div class="text-caption text-medium-emphasis">{{ product.brand }}</div></div><v-chip color="primary" variant="tonal" size="small">{{ formatValue(product.nutrition?.calories) }} kcal</v-chip><v-btn icon="mdi-delete-outline" color="error" variant="text" size="small" :aria-label="`Izbriši ${product.name}`" @click="confirmDelete(product)" /></div>

            <div class="nutrition-grid"><div><small>Proteini</small><strong>{{ formatValue(product.nutrition?.protein) }} g</strong></div><div><small>Ugljikohidrati</small><strong>{{ formatValue(product.nutrition?.carbs) }} g</strong></div><div><small>Masti</small><strong>{{ formatValue(product.nutrition?.fat) }} g</strong></div></div>

          </v-card>

        </div>



        <div v-if="!loading && !filteredProducts.length" class="empty-state"><v-avatar color="surface-variant" size="64" class="mb-4"><v-icon :icon="search ? 'mdi-magnify-close' : 'mdi-package-variant-closed'" size="30" /></v-avatar><div class="text-subtitle-1 font-weight-bold">{{ search ? 'Nema rezultata pretrage' : 'Još nema proizvoda' }}</div><div class="text-body-2 text-medium-emphasis mt-1 mb-4">{{ search ? 'Pokušaj upisati drugi pojam.' : 'Dodaj prvi proizvod u bazu.' }}</div><v-btn v-if="!search" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openDialog">Dodaj proizvod</v-btn></div>

      </v-card>

    </v-container>



    <v-dialog v-model="dialog" max-width="680" :fullscreen="smAndDown" persistent scrollable>

      <v-card :rounded="smAndDown ? 0 : 'xl'">

        <v-toolbar color="transparent"><v-toolbar-title class="font-weight-bold">Novi proizvod</v-toolbar-title><v-btn icon="mdi-close" variant="text" :disabled="saving" @click="closeDialog" /></v-toolbar><v-divider />

        <v-card-text class="pa-5">

          <div class="form-title"><v-avatar color="primary" variant="tonal" size="38"><v-icon icon="mdi-package-variant" size="20" /></v-avatar><div><div class="font-weight-bold">Osnovni podaci</div><div class="text-caption text-medium-emphasis">Naziv i proizvođač</div></div></div>

          <v-row><v-col cols="12" sm="7"><v-text-field v-model="form.name" label="Naziv proizvoda" placeholder="npr. Zobene pahuljice" prepend-inner-icon="mdi-food-outline" variant="outlined" /></v-col><v-col cols="12" sm="5"><v-text-field v-model="form.brand" label="Proizvođač" placeholder="npr. Bio marka" prepend-inner-icon="mdi-domain" variant="outlined" /></v-col></v-row>

          <div class="form-title mt-2"><v-avatar color="info" variant="tonal" size="38"><v-icon icon="mdi-chart-box-outline" size="20" /></v-avatar><div><div class="font-weight-bold">Nutritivne vrijednosti</div><div class="text-caption text-medium-emphasis">Vrijednosti na 100 g proizvoda</div></div></div>

          <v-alert color="info" variant="tonal" density="compact" class="mb-5">Ako proizvod ne sadrži nutrijent, unesi 0.</v-alert>

          <v-row>

            <v-col v-for="field in [{k:'calories',l:'Kalorije',u:'kcal',i:'mdi-fire'},{k:'protein',l:'Proteini',u:'g',i:'mdi-food-drumstick-outline'},{k:'carbs',l:'Ugljikohidrati',u:'g',i:'mdi-barley'},{k:'sugars',l:'Od toga šećeri',u:'g',i:'mdi-cube-outline'},{k:'fat',l:'Masti',u:'g',i:'mdi-water-outline'},{k:'saturatedFat',l:'Zasićene masti',u:'g',i:'mdi-water-percent'},{k:'fiber',l:'Vlakna',u:'g',i:'mdi-sprout-outline'},{k:'salt',l:'Sol',u:'g',i:'mdi-shaker-outline'}]" :key="field.k" cols="12" sm="6"><v-text-field v-model.number="form[field.k]" :label="field.l" :suffix="field.u" :prepend-inner-icon="field.i" type="number" min="0" step="0.01" variant="outlined" /></v-col>

          </v-row>

        </v-card-text>

        <v-divider /><v-card-actions class="pa-5"><v-btn variant="text" :disabled="saving" @click="closeDialog">Odustani</v-btn><v-spacer /><v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" :loading="saving" @click="addProduct">Spremi proizvod</v-btn></v-card-actions>

      </v-card>

    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="440" persistent>
    <v-card rounded="xl">
      <v-card-title class="pt-5 px-5">Izbrisati proizvod?</v-card-title>
      <v-card-text>Jesi li siguran da želiš trajno izbrisati proizvod <strong>{{ productToDelete?.name }}</strong>? Ova radnja se ne može poništiti.</v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="deleting" @click="cancelDelete">Odustani</v-btn>
        <v-btn color="error" variant="flat" prepend-icon="mdi-delete" :loading="deleting" @click="deleteProduct">Izbriši</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom center" rounded="lg">{{ snackbarText }}<template #actions><v-btn variant="text" @click="snackbar = false">Zatvori</v-btn></template></v-snackbar>

  </v-main>

</template>



<style scoped>

.app-page{min-height:100%;background:radial-gradient(circle at top right,rgba(var(--v-theme-primary),.08),transparent 34%),rgb(var(--v-theme-background))}.app-container{max-width:1200px;padding-top:32px;padding-bottom:56px}.page-header{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}.eyebrow{display:flex;align-items:center;gap:7px;color:rgb(var(--v-theme-primary));font-size:.75rem;font-weight:800;letter-spacing:.08em;margin-bottom:8px}.surface-card{border:1px solid rgba(var(--v-border-color),var(--v-border-opacity));background:rgb(var(--v-theme-surface))}.stat,.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px}.products-card{overflow:hidden}.toolbar{padding:20px}.search{max-width:340px}.products-table :deep(th){font-size:.75rem;font-weight:700;text-transform:uppercase;color:rgba(var(--v-theme-on-surface),.62);background:rgba(var(--v-theme-surface-variant),.35)}.products-table :deep(tbody tr:hover){background:rgba(var(--v-theme-primary),.04)}.mobile-list{display:grid;gap:12px;padding:16px}.mobile-card{padding:16px}.nutrition-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.nutrition-grid div{display:flex;flex-direction:column;gap:3px;padding:10px;border-radius:12px;background:rgba(var(--v-theme-surface-variant),.5)}.nutrition-grid small{color:rgba(var(--v-theme-on-surface),.62)}.empty-state{min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center}.form-title{display:flex;align-items:center;gap:12px;margin-bottom:18px}@media(max-width:600px){.app-container{padding-top:20px;padding-bottom:32px}.page-header,.toolbar{flex-direction:column;align-items:stretch}.search{max-width:none}.nutrition-grid div{padding:8px}.nutrition-grid strong{font-size:.82rem}}

</style>


