<template>
  <div
    id="app"
    :class="{ dark: isDarkMode }"
    class="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
  >
    <router-view />
  </div>
</template>

<script>
import { useWeatherStore } from './store/index.js'

export default {
  name: 'App',
  setup() {
    const weatherStore = useWeatherStore()
    return {
      weatherStore,
    }
  },
  computed: {
    isDarkMode() {
      return this.weatherStore.isDarkMode
    },
    currentWeatherData() {
      return this.weatherStore.currentWeatherData
    },
    currentLocation() {
      return this.weatherStore.currentLocation
    },
  },
  async created() {
    this.weatherStore.initializeDarkMode()
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
