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

    const isDarkMode = computed(() => weatherStore.isDarkMode)
    const currentWeatherData = computed(() => weatherStore.currentWeatherData)
    const currentLocation = computed(() => weatherStore.currentLocation)

    watch(isDarkMode, (newValue) => {
      if (newValue) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
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
      await this.weatherStore.fetchUserLocation()
    } catch (error) {
      if (this.weatherStore.weatherData && this.weatherStore.location) {
        return
      }

      const defaultLocation = { latitude: 55.9533, longitude: -3.1883 }
      this.weatherStore.setLocation(defaultLocation)

      if (navigator.onLine) {
        await this.weatherStore.fetchWeatherData(defaultLocation)
      } else {
        console.log('Offline, cannot fetch default location data.')
      }
    }
  },
}
</script>

<style>
body {
  font-family: 'Inter', sans-serif;
}
</style>
