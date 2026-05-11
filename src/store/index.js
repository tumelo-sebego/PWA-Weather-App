import { defineStore } from 'pinia'

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    location: null, // { latitude, longitude }
    weatherData: null,
    isDarkMode: false, // Will be properly initialized by initializeDarkMode()
    previousLocations: JSON.parse(localStorage.getItem('previousLocations') || '[]'), // Initialize from localStorage
    showPreviousLocations: false, // Controls visibility of the list
  }),
  actions: {
    setLocation(location) {
      this.location = location
      // Only add to history if locationName is available and it's a new location
      if (this.weatherData && this.weatherData.locationName) {
        this.addLocationToHistory({
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: this.weatherData.locationName,
        })
      }
    },
    setWeatherData(data) {
      this.weatherData = data
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('isDarkMode', this.isDarkMode.toString())
      console.log('Dark mode toggled:', this.isDarkMode)
    },
    setDarkMode(value) {
      this.isDarkMode = Boolean(value)
      localStorage.setItem('isDarkMode', this.isDarkMode.toString())
    },
    initializeDarkMode() {
      // Check localStorage first
      const savedMode = localStorage.getItem('isDarkMode')
      if (savedMode !== null) {
        this.isDarkMode = savedMode === 'true'
      } else {
        // If no saved preference, check system preference
        const prefersDark =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        this.isDarkMode = prefersDark
      }
      // Apply the dark mode to the DOM (will be picked up by Vue watcher)
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    addLocationToHistory({ latitude, longitude, locationName }) {
      console.log('addLocationToHistory called. this:', this);
      console.log('this.previousLocations:', this.previousLocations);
      const isDuplicate = this.previousLocations.some(
        (loc) => loc.latitude === latitude && loc.longitude === longitude,
      )
      if (!isDuplicate && locationName !== 'Unknown Location') {
        this.previousLocations.unshift({ latitude, longitude, locationName }) // Add to the beginning
        // Keep history to a reasonable size, e.g., last 5 locations
        if (this.previousLocations.length > 5) {
          this.previousLocations.pop()
        }
        localStorage.setItem('previousLocations', JSON.stringify(this.previousLocations))
      }
    },
    togglePreviousLocationsList() {
      this.showPreviousLocations = !this.showPreviousLocations
    },
    async loadLocationFromHistory({ latitude, longitude }) {
      this.showPreviousLocations = false // Hide list after selection
      await this.fetchWeatherData({ latitude, longitude })
      this.setLocation({ latitude, longitude }) // This will also update the current location in state
    },
    async fetchUserLocation() {
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              this.setLocation({ latitude, longitude })
              console.log('Location obtained:', { latitude, longitude })
              await this.fetchWeatherData({ latitude, longitude })
              resolve({ latitude, longitude })
            },
            (error) => {
              console.error('Error getting location:', error.message)
              reject(error)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            },
          )
        } else {
          console.error('Geolocation is not supported by this browser.')
          reject(new Error('Geolocation not supported'))
        }
      })
    },
    async fetchWeatherData({ latitude, longitude }) {
      if (!latitude || !longitude) {
        console.error('Latitude or longitude missing for weather fetch.')
        return
      }
      const apiKey = import.meta.env.VITE_APP_OPENWEATHER_API_KEY
      const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&cnt=40&appid=${apiKey}`
      const geocodingApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`

      try {
        // Fetch location name first
        const geoResponse = await fetch(geocodingApiUrl)
        if (!geoResponse.ok) throw new Error(`HTTP error! tuti status: ${geoResponse.status}`)
        const geoData = await geoResponse.json()
        const locationName = geoData[0]
          ? `${geoData[0].name}, ${geoData[0].country}`
          : 'Unknown Location'

        // Fetch weather data
        const weatherResponse = await fetch(apiUrl)
        if (!weatherResponse.ok) throw new Error(`HTTP error! status: ${weatherResponse.status}`)
        const weatherData = await weatherResponse.json()

        // Adapt the new API response to the structure our component expects
        const today = weatherData.list[0]

        const dailyData = {}
        weatherData.list.forEach((item) => {
          const date = new Date(item.dt * 1000).toISOString().split('T')[0]
          if (!dailyData[date]) {
            dailyData[date] = {
              temps: [],
              weather: [],
            }
          }
          dailyData[date].temps.push(item.main.temp)
          dailyData[date].weather.push(item.weather[0])
        })

        const dailyForecasts = Object.keys(dailyData)
          .slice(1, 4)
          .map((date) => {
            const day = dailyData[date]
            const temps = day.temps
            const weather = day.weather[Math.floor(day.weather.length / 2)] // Get weather from midday
            return {
              date: new Date(date),
              minTemp: Math.round(Math.min(...temps)),
              maxTemp: Math.round(Math.max(...temps)),
              icon: weather.icon,
              description: weather.description,
            }
          })

        const formattedData = {
          current: {
            temp: Math.round(today.main.temp),
            description: today.weather[0].description,
            icon: today.weather[0].icon,
            main: today.weather[0].main,
          },
          daily: dailyForecasts,
          locationName: locationName,
        }

        this.setWeatherData(formattedData)
        localStorage.setItem('weatherData', JSON.stringify(formattedData))
        localStorage.setItem('lastLocation', JSON.stringify({ latitude, longitude }))
        console.log('Weather data fetched and stored:', formattedData)
      } catch (error) {
        console.error('Error fetching weather data:', error)
        alert('Could not fetch weather data. Please try again later.')
        localStorage.removeItem('weatherData') // Clear potentially old/bad data
      }
    },
  },
  getters: {
    currentLocation: (state) => state.location,
    currentWeatherData: (state) => state.weatherData,
    getPreviousLocations: (state) => state.previousLocations,
    showPreviousLocations: (state) => state.showPreviousLocations,
  },
})
