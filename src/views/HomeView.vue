<template>
  <div class="p-4 flex flex-col items-center justify-between min-h-screen pt-10 pb-6 font-sans">
    <div class="w-full text-center flex items-center justify-between px-4">
      <button @click="$router.go(-1)" class="text-2xl cursor-pointer">
        <svg v-if="$router.currentRoute.path !== '/'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <div class="text-xl font-medium flex-grow">
        {{ weatherData ? weatherData.locationName : 'Loading Location...' }}
      </div>
      <button @click="toggleDarkMode" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200">
        <svg v-if="isDarkMode" class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 00-.707-.293H15a1 1 0 000-2h-.293a1 1 0 00-.707.293l-.707.707a1 1 0 001.414 1.414l.707-.707zM10 18a1 1 0 01-1 1v1a1 1 0 112 0v-1a1 1 0 01-1-1zM5.95 14.05l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zm-4.243-2.12a1 1 0 01-.293-.707V10a1 1 0 012 0v.293a1 1 0 01-.293.707l-.707.707a1 1 0 01-1.414-1.414l.707-.707zm-.707-1.414a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707z"></path></svg>
        <svg v-else class="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
      </button>
    </div>

    <div v-if="weatherData" class="flex flex-col items-center justify-center flex-grow py-8">
      <img :src="weatherIconUrl(weatherData.current.icon)" alt="Weather Icon" class="w-32 h-32 mb-4">
      <p class="text-8xl font-light mb-4">{{ weatherData.current.temp }}&deg;</p>
      <p class="text-3xl font-medium capitalize">So, it's {{ weatherData.current.description }}.</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center flex-grow py-8">
      <p class="text-xl text-gray-600 dark:text-gray-300">Fetching weather data...</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Please allow location access.</p>
    </div>


    <div v-if="weatherData" class="w-full flex flex-col items-start px-8 py-4 space-y-4">
      <div v-for="day in weatherData.daily" :key="day.date" class="flex justify-between items-center w-full">
        <span class="text-lg font-medium">{{ formatDate(day.date) }}</span>
        <span class="text-lg font-medium">{{ day.maxTemp }}&deg; {{ day.minTemp }}&deg;</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from 'vuex';

export default {
  name: 'HomeView',
  computed: {
    ...mapGetters(['currentWeatherData', 'isDarkMode', 'currentLocation']),
    weatherData() {
      return this.currentWeatherData;
    }
  },
  methods: {
    ...mapMutations(['TOGGLE_DARK_MODE']),
    ...mapActions(['fetchUserLocation', 'fetchWeatherData']),
    weatherIconUrl(iconCode) {
      return `http://openweathermap.org/img/wn/${iconCode}@4x.png`;
    },
    formatDate(date) {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      return new Date(date).toLocaleDateString('en-US', options);
    },
    toggleDarkMode() {
      this.TOGGLE_DARK_MODE();
    }
  }
}
</script>

<style scoped>
/* No specific scoped styles needed if Tailwind is configured well */
</style>