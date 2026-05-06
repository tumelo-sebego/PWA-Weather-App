<template>
  <div
    id="app"
    class="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
  >
    <router-view />
  </div>
</template>

<script>
import { useWeatherStore } from './store/index.js'
import { computed, watch } from 'vue'

export default {
  name: 'App',
  setup() {
    const weatherStore = useWeatherStore()

    const isDarkMode = computed(() => {
      console.log('isDarkMode computed property updated:', weatherStore.isDarkMode)
      return weatherStore.isDarkMode
    })
    const currentWeatherData = computed(() => weatherStore.currentWeatherData)
    const currentLocation = computed(() => weatherStore.currentLocation)

    // Watch isDarkMode and update the HTML element's class
    watch(isDarkMode, (newValue) => {
      console.log('Watch: isDarkMode changed to', newValue)
      if (newValue) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      console.log('HTML classes:', document.documentElement.classList)
    })

    return {
      weatherStore,
      isDarkMode,
      currentWeatherData,
      currentLocation,
    }
  },
  async created() {
    // Check if weather data exists in store (from local storage)
    if (!this.currentWeatherData) {
      await this.weatherStore.fetchUserLocation() // Will fetch weather data after getting location
    } else if (this.currentLocation) {
      // If weather data is present (from local storage), but also a location
      // We can re-fetch for freshness. You might want to add a timestamp check here.
      console.log('Weather data found in local storage. Re-fetching for freshness...')
      await this.weatherStore.fetchWeatherData(this.currentLocation)
    } else {
      // If no location, prompt for it
      await this.weatherStore.fetchUserLocation()
    }
  },
}
</script>

<style>
/* You can define global font styles here if not using @import in main.css */
body {
  font-family: 'Inter', sans-serif; /* Or another clean font */
}
</style>
