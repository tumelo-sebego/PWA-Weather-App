import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useWeatherStore } from './store/index.js'
import './assets/main.css' // Import your Tailwind CSS

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router)

const weatherStore = useWeatherStore()

// Initialize dark mode (checks localStorage and system preferences)
weatherStore.initializeDarkMode()

// Attempt to load weather data from local storage
const storedWeatherData = localStorage.getItem('weatherData')
if (storedWeatherData) {
  weatherStore.setWeatherData(JSON.parse(storedWeatherData))
  console.log('Loaded weather data from local storage:', JSON.parse(storedWeatherData))
}

// Attempt to load last known location from local storage
const storedLocation = localStorage.getItem('lastLocation')
if (storedLocation) {
  weatherStore.setLocation(JSON.parse(storedLocation))
  console.log('Loaded last location from local storage:', JSON.parse(storedLocation))
}

app.mount('#app')
