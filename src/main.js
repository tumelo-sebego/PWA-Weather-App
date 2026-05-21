import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useWeatherStore } from './store/index.js'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(router)

const weatherStore = useWeatherStore()
weatherStore.initializeDarkMode()

async function initializeApp() {
  try {
    await weatherStore.loadStoredData()
  } catch (error) {
    console.warn('Unable to restore stored data from DB:', error)
  }
  app.mount('#app')
}

initializeApp()
