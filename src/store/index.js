import { defineStore } from 'pinia'

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    location: null, // { latitude, longitude }
    weatherData: null,
    isDarkMode: false, // Will be properly initialized by initializeDarkMode()
    previousLocations: JSON.parse(localStorage.getItem('previousLocations') || '[]'), // Initialize from localStorage
    showPreviousLocations: false, // Controls visibility of the list
    forecastRawData: JSON.parse(localStorage.getItem('forecastRawData') || 'null'), // Full 40-point forecast list
    forecastInterval: JSON.parse(localStorage.getItem('forecastInterval') || 'null'), // Update interval in milliseconds (based on 40-point span)
    hourlyTimerId: null, // To store the hourly refresh timer ID
    updateTimerId: null, // To store the interval timer ID
  }),
  actions: {
    setLocation(location) {
      this.location = location
      // Restart hourly freshness checks when location changes
      this.startHourlyRefreshCheck()
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
              console.log('Location obtained:', { latitude, longitude })

              // Check if this location matches the stored location
              const storedLocation = JSON.parse(localStorage.getItem('lastLocation') || 'null')
              const isSameLocation = storedLocation &&
                Math.abs(storedLocation.latitude - latitude) < 0.0001 &&
                Math.abs(storedLocation.longitude - longitude) < 0.0001

              if (isSameLocation) {
                // Use cached weather data if available and fresh
                const storedWeather = JSON.parse(localStorage.getItem('weatherData') || 'null')
                const storedForecastData = JSON.parse(localStorage.getItem('forecastRawData') || 'null')
                
                // Check if data is fresh using the full forecast interval
                // Fallback to 40 hours (144000000ms) if forecastInterval isn't set yet
                const cacheAgeLimit = this.forecastInterval || 144000000
                const isDataFresh = storedWeather && storedWeather.fetchTimestamp && 
                  (Date.now() - storedWeather.fetchTimestamp < cacheAgeLimit)

                if (storedWeather && storedForecastData && isDataFresh) {
                  this.forecastRawData = storedForecastData
                  const formattedData = this.processForecastData(storedForecastData, storedWeather.locationName)
                  formattedData.fetchTimestamp = storedWeather.fetchTimestamp
                  this.setWeatherData(formattedData)
                  console.log('Using cached weather data: It is fresh and location matches. Cache age:', Date.now() - storedWeather.fetchTimestamp, 'ms')
                } else {
                  console.log('Forecast cache expired or missing. Fetching fresh data from API...')
                  await this.fetchWeatherData({ latitude, longitude })
                }
              } else {
                // Fetch new weather data for new location
                await this.fetchWeatherData({ latitude, longitude })
              }

              this.setLocation({ latitude, longitude })
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
    findClosestForecastPoint(forecastList) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      let closestPoint = forecastList[0]
      let closestDiff = Math.abs(forecastList[0].dt - nowSeconds)

      for (const item of forecastList) {
        const diff = Math.abs(item.dt - nowSeconds)
        if (diff < closestDiff) {
          closestDiff = diff
          closestPoint = item
        }
      }

      return closestPoint
    },
    processForecastData(forecastList, locationName) {
      const currentPoint = this.findClosestForecastPoint(forecastList)
      const nowSeconds = Math.floor(Date.now() / 1000)

      // Keep only future-facing forecast points for daily summary.
      const filteredForecasts = forecastList.filter((item) => item.dt >= currentPoint.dt)

      const dailyData = {}
      filteredForecasts.forEach((item) => {
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

      return {
        current: {
          temp: Math.round(currentPoint.main.temp),
          description: currentPoint.weather[0].description,
          icon: currentPoint.weather[0].icon,
          main: currentPoint.weather[0].main,
        },
        daily: dailyForecasts,
        locationName: locationName,
        fetchTimestamp: Date.now(),
      }
    },
    async checkForecastFreshness() {
      if (!this.location || !this.location.latitude || !this.location.longitude) {
        return
      }

      if (!this.forecastRawData || !this.weatherData) {
        console.log('No cached forecast data available, fetching fresh weather data.')
        await this.fetchWeatherData({
          latitude: this.location.latitude,
          longitude: this.location.longitude,
        })
        return
      }

      const cacheAgeLimit = this.forecastInterval || 144000000
      const cacheAge = Date.now() - (this.weatherData.fetchTimestamp || 0)

      if (cacheAge >= cacheAgeLimit) {
        console.log('Forecast cache is stale, fetching fresh weather data from API.')
        await this.fetchWeatherData({
          latitude: this.location.latitude,
          longitude: this.location.longitude,
        })
      } else {
        console.log('Forecast cache is still fresh, refreshing display from local cache.')
        const formattedData = this.processForecastData(this.forecastRawData, this.weatherData.locationName)
        formattedData.fetchTimestamp = this.weatherData.fetchTimestamp || Date.now()
        this.setWeatherData(formattedData)
      }
    },
    startHourlyRefreshCheck() {
      this.stopHourlyRefreshCheck()
      this.checkForecastFreshness()
      this.hourlyTimerId = setInterval(() => {
        this.checkForecastFreshness()
      }, 3600000)
    },
    stopHourlyRefreshCheck() {
      if (this.hourlyTimerId) {
        clearInterval(this.hourlyTimerId)
        this.hourlyTimerId = null
      }
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

        // Calculate and store the forecast interval from the full 40-point span
        if (weatherData.list && weatherData.list.length >= 40) {
          const firstPointTime = weatherData.list[0].dt
          const lastPointTime = weatherData.list[39].dt
          const intervalSeconds = lastPointTime - firstPointTime
          const intervalMs = intervalSeconds * 1000
          this.forecastInterval = intervalMs
          localStorage.setItem('forecastInterval', JSON.stringify(intervalMs))
          console.log('Forecast interval (40-point span) extracted from API:', intervalMs, 'ms (~' + Math.round(intervalMs / 3600000) + ' hours)')
        }

        // Store the full raw forecast data
        this.forecastRawData = weatherData.list
        localStorage.setItem('forecastRawData', JSON.stringify(weatherData.list))

        // Process forecast data for display
        const formattedData = this.processForecastData(weatherData.list, locationName)

        this.setWeatherData(formattedData)
        localStorage.setItem('weatherData', JSON.stringify(formattedData))
        localStorage.setItem('lastLocation', JSON.stringify({ latitude, longitude }))
        console.log('Weather data fetched and stored:', formattedData)
      } catch (error) {
        console.error('Error fetching weather data:', error)
        alert('Could not fetch weather data. Please try again later.')
        localStorage.removeItem('weatherData') // Clear potentially old/bad data
        localStorage.removeItem('forecastRawData')
      }
    },
    startPeriodicUpdate() {
      // Clear any existing timer
      this.stopPeriodicUpdate()

      // Use the forecast interval (40-point span) or default to 40 hours (144000000 ms) if not available
      const interval = this.forecastInterval || 144000000

      console.log('Starting periodic weather updates with forecast interval:', interval, 'ms (~' + Math.round(interval / 3600000) + ' hours)')

      if (this.location && this.location.latitude && this.location.longitude) {
        this.updateTimerId = setInterval(() => {
          console.log('Periodic weather update triggered at forecast interval')
          this.fetchWeatherData({
            latitude: this.location.latitude,
            longitude: this.location.longitude,
          })
        }, interval)
      }
    },
    stopPeriodicUpdate() {
      if (this.updateTimerId) {
        clearInterval(this.updateTimerId)
        this.updateTimerId = null
        console.log('Stopped periodic weather updates')
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
