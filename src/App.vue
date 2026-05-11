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
    try {
      await this.weatherStore.fetchUserLocation() // Try device location first
    } catch (error) {
      // If device location fails, try stored location
      if (this.currentLocation) {
        console.log('Device location failed, using stored location for fallback.')
        if (navigator.onLine) {
          await this.weatherStore.fetchWeatherData(this.currentLocation)
        } else {
          console.log('Offline, using cached weather data for stored location.')
        }
      } else {
        // If no stored location, use default
        console.log('No stored location, defaulting to Edinburgh.')
        const defaultLocation = { latitude: 55.9533, longitude: -3.1883 }
        this.weatherStore.setLocation(defaultLocation)
        if (navigator.onLine) {
          await this.weatherStore.fetchWeatherData(defaultLocation)
        } else {
          console.log('Offline, cannot fetch default location data.')
          // Optionally, you could load some default cached data or alert the user
        }
      }
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
