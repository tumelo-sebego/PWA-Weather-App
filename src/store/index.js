// (Vuex module for weather and location)
import { createStore } from 'vuex';

export default createStore({
  state: {
    location: null, // { latitude, longitude }
    weatherData: null,
    isDarkMode: false,
  },
  mutations: {
    SET_LOCATION(state, location) {
      state.location = location;
    },
    SET_WEATHER_DATA(state, data) {
      state.weatherData = data;
    },
    TOGGLE_DARK_MODE(state) {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('isDarkMode', state.isDarkMode);
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    SET_DARK_MODE(state, value) {
      state.isDarkMode = value;
      localStorage.setItem('isDarkMode', value);
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  actions: {
    async fetchUserLocation({ commit, dispatch }) {
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              commit('SET_LOCATION', { latitude, longitude });
              console.log('Location obtained:', { latitude, longitude });
              await dispatch('fetchWeatherData', { latitude, longitude });
              resolve({ latitude, longitude });
            },
            (error) => {
              console.error("Error getting location:", error.message);
              alert("Please allow location access to get weather updates for your current location. Defaulting to Edinburgh.");
              // Fallback to a default location (e.g., Edinburgh)
              const defaultLocation = { latitude: 55.9533, longitude: -3.1883 };
              commit('SET_LOCATION', defaultLocation);
              dispatch('fetchWeatherData', defaultLocation);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          console.error("Geolocation is not supported by this browser.");
          alert("Geolocation is not supported by your browser. Defaulting to Edinburgh.");
          const defaultLocation = { latitude: 55.9533, longitude: -3.1883 };
          commit('SET_LOCATION', defaultLocation);
          dispatch('fetchWeatherData', defaultLocation);
          reject(new Error("Geolocation not supported"));
        }
      });
    },
    // Other actions will be added here
  },
  getters: {
    currentLocation: state => state.location,
    currentWeatherData: state => state.weatherData,
    isDarkMode: state => state.isDarkMode
  }
});