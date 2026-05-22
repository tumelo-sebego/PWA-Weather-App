<template>
  <div class="p-4 flex flex-col items-center justify-between min-h-screen pt-10 pb-6 font-sans" @click="handleClickAnywhere">
    <!-- Error Notification Pill -->
    <transition name="slide-down">
      <div
        v-if="showErrorNotification"
        class="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 mt-4 px-6 py-3 bg-yellow-300 dark:bg-yellow-400 text-gray-900 rounded-full shadow-lg font-medium text-sm max-w-md mx-auto transition-all"
      >
        {{ errorMessage }}
      </div>
    </transition>

    <div class="w-full text-center flex items-center justify-between px-4 relative">
      <button @click="togglePreviousLocationsList" class="text-2xl cursor-pointer">
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="showPreviousLocations ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'"
          ></path>
        </svg>
      </button>
      <div class="text-xl font-medium flex-grow">
        {{ weatherData ? weatherData.locationName : 'Loading Location...' }}
      </div>
      <button
        @click="toggleDarkMode"
        class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200"
      >
        <svg
          v-if="isDarkMode"
          class="w-6 h-6 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 00-.707-.293H15a1 1 0 000-2h-.293a1 1 0 00-.707.293l-.707.707a1 1 0 001.414 1.414l.707-.707zM10 18a1 1 0 01-1 1v1a1 1 0 112 0v-1a1 1 0 01-1-1zM5.95 14.05l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zm-4.243-2.12a1 1 0 01-.293-.707V10a1 1 0 012 0v.293a1 1 0 01-.293.707l-.707.707a1 1 0 01-1.414-1.414l.707-.707zm-.707-1.414a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707z"
          ></path>
        </svg>
        <svg
          v-else
          class="w-6 h-6 text-gray-700"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      </button>
    </div>

    <div v-if="showPreviousLocations" class="fixed inset-0 z-40 bg-black/60" @click="togglePreviousLocationsList"></div>
    <div
      v-if="showPreviousLocations"
      class="fixed inset-x-4 top-24 z-50 mx-auto max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
      @click.stop
    >
      <div class="px-4 py-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">
        Previous locations
      </div>
      <ul class="max-h-80 overflow-y-auto">
        <li
          v-for="location in previousLocations"
          :key="`${location.latitude}-${location.longitude}`"
          @click="loadLocationFromHistory(location)"
          class="block px-4 py-3 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        >
          <div class="font-medium">{{ location.locationName }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">{{ location.latitude.toFixed(4) }}, {{ location.longitude.toFixed(4) }}</div>
        </li>
        <li v-if="previousLocations.length === 0" class="block px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          No previous locations
        </li>
      </ul>
    </div>

    <div v-if="weatherData" class="flex flex-col items-center justify-center flex-grow py-8">
      <img
        :src="weatherIconUrl(weatherData.current.icon)"
        alt="Weather Icon"
        class="w-32 h-32 mb-4"
      />
      <p class="text-8xl font-light mb-4">{{ weatherData.current.temp }}&deg;</p>
      <p class="text-3xl font-medium capitalize">{{ weatherData.current.description }}.</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center flex-grow py-8">
      <p class="text-xl text-gray-600 dark:text-gray-300">Fetching weather data...</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Please allow location access.</p>
    </div>

    <div v-if="weatherData" class="w-full flex flex-col items-start px-8 py-4 space-y-4">
      <div
        v-for="day in weatherData.daily"
        :key="day.date"
        class="flex justify-between items-center w-full"
      >
        <span class="text-lg font-medium">{{ formatDate(day.date) }}</span>
        <span class="text-lg font-medium">{{ day.maxTemp }}&deg; {{ day.minTemp }}&deg;</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useWeatherStore } from '../store/index.js'
import { computed } from 'vue'

export default {
  name: 'HomeView',
  setup() {
    const weatherStore = useWeatherStore()

    const weatherData = computed(() => weatherStore.currentWeatherData)
    const isDarkMode = computed(() => weatherStore.isDarkMode)
    const currentLocation = computed(() => weatherStore.currentLocation)
    const previousLocations = computed(() => weatherStore.getPreviousLocations)
    const showPreviousLocations = computed(() => weatherStore.showPreviousLocations)
    const showErrorNotification = computed(() => weatherStore.showErrorNotification)
    const errorMessage = computed(() => weatherStore.errorMessage)

    const weatherIconUrl = (iconCode) => {
      return `http://openweathermap.org/img/wn/${iconCode}@4x.png`
    }

    const formatDate = (date) => {
      const options = { weekday: 'short', month: 'short', day: 'numeric' }
      return new Date(date).toLocaleDateString('en-US', options)
    }

    const toggleDarkMode = () => {
      weatherStore.toggleDarkMode()
    }

    const togglePreviousLocationsList = () => {
      weatherStore.togglePreviousLocationsList()
    }

    const loadLocationFromHistory = (location) => {
      weatherStore.loadLocationFromHistory(location)
    }

    const handleClickAnywhere = () => {
      if (showErrorNotification.value) {
        weatherStore.clearErrorNotification()
      }
    }

    return {
      weatherStore,
      weatherData,
      isDarkMode,
      currentLocation,
      weatherIconUrl,
      formatDate,
      toggleDarkMode,
      previousLocations,
      showPreviousLocations,
      togglePreviousLocationsList,
      loadLocationFromHistory,
      showErrorNotification,
      errorMessage,
      handleClickAnywhere,
    }
  },
}
</script>

<style scoped>
.slide-down-enter-active {
  animation: slide-down-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-down-leave-active {
  animation: slide-down-out 0.4s ease-out;
}

@keyframes slide-down-in {
  from {
    transform: translate(-50%, -150%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

@keyframes slide-down-out {
  from {
    transform: translate(-50%, 0);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -150%);
    opacity: 0;
  }
}
</style>
