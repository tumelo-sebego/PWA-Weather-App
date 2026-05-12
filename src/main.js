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
const storedForecastData = localStorage.getItem('forecastRawData')

if (storedForecastData) {
  weatherStore.forecastRawData = JSON.parse(storedForecastData)
  console.log('Loaded raw forecast data from local storage (', weatherStore.forecastRawData.length, 'points)')
}

if (storedWeatherData && storedForecastData) {
  const parsedWeatherData = JSON.parse(storedWeatherData)
  const formattedData = weatherStore.processForecastData(weatherStore.forecastRawData, parsedWeatherData.locationName)
  formattedData.fetchTimestamp = parsedWeatherData.fetchTimestamp
  weatherStore.setWeatherData(formattedData)
  console.log('Restored weather data from local storage and refreshed current conditions.')
} else if (storedWeatherData) {
  weatherStore.setWeatherData(JSON.parse(storedWeatherData))
  console.log('Loaded weather data from local storage:', JSON.parse(storedWeatherData))
}

// Load forecast interval from localStorage
const storedForecastInterval = localStorage.getItem('forecastInterval')
if (storedForecastInterval) {
  weatherStore.forecastInterval = JSON.parse(storedForecastInterval)
  console.log('Loaded forecast interval from local storage:', weatherStore.forecastInterval, 'ms (~' + Math.round(weatherStore.forecastInterval / 3600000) + ' hours)')
}

// Attempt to load last known location from local storage
const storedLocation = localStorage.getItem('lastLocation')
if (storedLocation) {
  weatherStore.setLocation(JSON.parse(storedLocation))
  console.log('Loaded last location from local storage:', JSON.parse(storedLocation))
  // Hourly refresh checks will be started by setLocation()
}

app.mount('#app')
