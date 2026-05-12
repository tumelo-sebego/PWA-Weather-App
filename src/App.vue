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
      // If device location fails, try to get current location and check against previousLocations
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        })
        const { latitude, longitude } = position.coords
        const isInPrevious = this.weatherStore.previousLocations.some(
          (loc) => loc.latitude === latitude && loc.longitude === longitude
        )
        if (!isInPrevious) {
          // User location not in previousLocations, don't load lastLocation, use default
          console.log('Current location not in previous locations, defaulting to Edinburgh.')
          const defaultLocation = { latitude: 55.9533, longitude: -3.1883 }
          this.weatherStore.setLocation(defaultLocation)
          if (navigator.onLine) {
            await this.weatherStore.fetchWeatherData(defaultLocation)
          } else {
            console.log('Offline, cannot fetch default location data.')
          }
        } else {
          // Is in previous, load lastLocation
          const storedLocation = JSON.parse(localStorage.getItem('lastLocation') || 'null')
          if (storedLocation) {
            this.weatherStore.setLocation(storedLocation)
            if (navigator.onLine) {
              await this.weatherStore.fetchWeatherData(storedLocation)
            } else {
              const storedWeather = JSON.parse(localStorage.getItem('weatherData') || 'null')
              if (storedWeather) {
                this.weatherStore.setWeatherData(storedWeather)
              }
            }
          } else {
            // No stored, use default
            const defaultLocation = { latitude: 55.9533, longitude: -3.1883 }
            this.weatherStore.setLocation(defaultLocation)
            if (navigator.onLine) {
              await this.weatherStore.fetchWeatherData(defaultLocation)
            } else {
              console.log('Offline, cannot fetch default location data.')
            }
          }
        }
      } catch (geoError) {
        // Geolocation failed, load lastLocation
        const storedLocation = JSON.parse(localStorage.getItem('lastLocation') || 'null')
        if (storedLocation) {
          this.weatherStore.setLocation(storedLocation)
          if (navigator.onLine) {
            await this.weatherStore.fetchWeatherData(storedLocation)
          } else {
            const storedWeather = JSON.parse(localStorage.getItem('weatherData') || 'null')
            if (storedWeather) {
              this.weatherStore.setWeatherData(storedWeather)
            }
          }
        } else {
          // Use default
          console.log('No stored location, defaulting to Edinburgh.')
          const defaultLocation = { latitude: 55.9533, longitude: -3.1883 }
          this.weatherStore.setLocation(defaultLocation)
          if (navigator.onLine) {
            await this.weatherStore.fetchWeatherData(defaultLocation)
          } else {
            console.log('Offline, cannot fetch default location data.')
          }
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
