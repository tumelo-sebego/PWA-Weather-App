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
    initializeDarkMode({ commit }) {
      const savedMode = localStorage.getItem('isDarkMode');
      if (savedMode !== null) {
        commit('SET_DARK_MODE', savedMode === 'true');
      } else {
        // If no saved preference, check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        commit('SET_DARK_MODE', prefersDark);
      }
    },
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
      const apiKey = import.meta.env.VITE_APP_OPENWEATHER_API_KEY;
      const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&cnt=40&appid=${apiKey}`;
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

        // Adapt the new API response to the structure our component expects
        const today = weatherData.list[0];
        
        const dailyData = {};
        weatherData.list.forEach(item => {
          const date = new Date(item.dt * 1000).toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = {
              temps: [],
              weather: []
            };
          }
          dailyData[date].temps.push(item.main.temp);
          dailyData[date].weather.push(item.weather[0]);
        });

        const dailyForecasts = Object.keys(dailyData).slice(1, 4).map(date => {
          const day = dailyData[date];
          const temps = day.temps;
          const weather = day.weather[Math.floor(day.weather.length / 2)]; // Get weather from midday
          return {
            date: new Date(date),
            minTemp: Math.round(Math.min(...temps)),
            maxTemp: Math.round(Math.max(...temps)),
            icon: weather.icon,
            description: weather.description
          };
        });

        const formattedData = {
          current: {
            temp: Math.round(today.main.temp),
            description: today.weather[0].description,
            icon: today.weather[0].icon,
            main: today.weather[0].main
          },
          daily: dailyForecasts,
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