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
    async fetchWeatherData({ commit, state }, { latitude, longitude }) {
      if (!latitude || !longitude) {
        console.error("Latitude or longitude missing for weather fetch.");
        return;
      }
      const apiKey = process.env.VUE_APP_OPENWEATHER_API_KEY;
      const apiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`;
      const geocodingApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`;

      try {
        // Fetch location name first
        const geoResponse = await fetch(geocodingApiUrl);
        if (!geoResponse.ok) throw new Error(`HTTP error! status: ${geoResponse.status}`);
        const geoData = await geoResponse.json();
        const locationName = geoData[0] ? `${geoData[0].name}, ${geoData[0].country}` : "Unknown Location";

        // Fetch weather data
        const weatherResponse = await fetch(apiUrl);
        if (!weatherResponse.ok) throw new Error(`HTTP error! status: ${weatherResponse.status}`);
        const weatherData = await weatherResponse.json();

        const formattedData = {
          current: {
            temp: Math.round(weatherData.current.temp),
            description: weatherData.current.weather[0].description,
            icon: weatherData.current.weather[0].icon,
            main: weatherData.current.weather[0].main // e.g., 'Clouds', 'Rain', 'Thunderstorm'
          },
          daily: weatherData.daily.slice(0, 3).map(day => ({ // Get next 3 days
            date: new Date(day.dt * 1000),
            minTemp: Math.round(day.temp.min),
            maxTemp: Math.round(day.temp.max),
            icon: day.weather[0].icon,
            description: day.weather[0].description
          })),
          locationName: locationName
        };

        commit('SET_WEATHER_DATA', formattedData);
        localStorage.setItem('weatherData', JSON.stringify(formattedData));
        localStorage.setItem('lastLocation', JSON.stringify({ latitude, longitude }));
        console.log('Weather data fetched and stored:', formattedData);
      } catch (error) {
        console.error("Error fetching weather data:", error);
        alert("Could not fetch weather data. Please try again later.");
        localStorage.removeItem('weatherData'); // Clear potentially old/bad data
      }
    },

  },
  getters: {
    currentLocation: state => state.location,
    currentWeatherData: state => state.weatherData,
    isDarkMode: state => state.isDarkMode
  }
});