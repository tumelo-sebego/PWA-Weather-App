import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './assets/main.css' // Import your Tailwind CSS

const app = createApp(App)

// Initialize dark mode from local storage
const storedDarkMode = localStorage.getItem('isDarkMode');
if (storedDarkMode !== null) {
  store.commit('SET_DARK_MODE', JSON.parse(storedDarkMode));
}

// Attempt to load weather data from local storage
const storedWeatherData = localStorage.getItem('weatherData');
if (storedWeatherData) {
  store.commit('SET_WEATHER_DATA', JSON.parse(storedWeatherData));
  console.log('Loaded weather data from local storage:', JSON.parse(storedWeatherData));
}

// Attempt to load last known location from local storage
const storedLocation = localStorage.getItem('lastLocation');
if (storedLocation) {
  store.commit('SET_LOCATION', JSON.parse(storedLocation));
  console.log('Loaded last location from local storage:', JSON.parse(storedLocation));
}


app.use(store).use(router).mount('#app')