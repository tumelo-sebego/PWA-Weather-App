import { defineStore } from 'pinia'
import { saveLocationWeather, getLocationById, getRecentLocations, getMostRecentLocation } from '../services/db'

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    location: null,
    weatherData: null,
    isDarkMode: false,
    previousLocations: [],
    showPreviousLocations: false,
    forecastRawData: null,
    forecastInterval: null,
    hourlyTimerId: null,
    updateTimerId: null,
  }),
  actions: {
    async loadStoredData() {
      const recentLocations = await getRecentLocations(5)
      this.previousLocations = recentLocations.map((loc) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationName: loc.locationName,
      }))

      const latest = await getMostRecentLocation()
      if (latest) {
        this.location = { latitude: latest.latitude, longitude: latest.longitude }
        this.forecastRawData = latest.forecastRawData || null
        this.forecastInterval = latest.forecastInterval ?? null
        this.weatherData = latest.weatherData || null
        this.startHourlyRefreshCheck()
        console.log('Restored stored location and weather from DB:', latest.locationName)
      }
    },
    setLocation(location) {
      this.location = location
      this.startHourlyRefreshCheck()
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
      const savedMode = localStorage.getItem('isDarkMode')
      if (savedMode !== null) {
        this.isDarkMode = savedMode === 'true'
      } else {
        const prefersDark =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        this.isDarkMode = prefersDark
      }

      if (this.isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    addLocationToHistory({ latitude, longitude, locationName }) {
      const isDuplicate = this.previousLocations.some(
        (loc) => loc.latitude === latitude && loc.longitude === longitude,
      )
      if (!isDuplicate && locationName !== 'Unknown Location') {
        this.previousLocations.unshift({ latitude, longitude, locationName })
        if (this.previousLocations.length > 5) {
          this.previousLocations.pop()
        }
      }
    },
    togglePreviousLocationsList() {
      this.showPreviousLocations = !this.showPreviousLocations
    },
    async reloadPreviousLocations() {
      const recentLocations = await getRecentLocations(5)
      this.previousLocations = recentLocations.map((loc) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationName: loc.locationName,
      }))
    },
    async loadLocationFromHistory({ latitude, longitude }) {
      this.showPreviousLocations = false

      const storedRecord = await getLocationById(latitude, longitude)
      if (storedRecord && storedRecord.weatherData) {
        this.forecastRawData = storedRecord.forecastRawData || null
        this.forecastInterval = storedRecord.forecastInterval ?? this.forecastInterval
        this.setWeatherData(storedRecord.weatherData)
        this.setLocation({ latitude, longitude })
        await this.reloadPreviousLocations()
        return
      }

      await this.fetchWeatherData({ latitude, longitude })
      this.setLocation({ latitude, longitude })
    },
    async fetchUserLocation() {
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              console.log('Location obtained:', { latitude, longitude })

              try {
                const storedRecord = await getLocationById(latitude, longitude)
                const isOnline = navigator.onLine
                const cacheAgeLimit =
                  (storedRecord && storedRecord.forecastInterval) || this.forecastInterval || 144000000
                const isDataFresh = storedRecord && storedRecord.weatherData && storedRecord.weatherData.fetchTimestamp &&
                  Date.now() - storedRecord.weatherData.fetchTimestamp < cacheAgeLimit

                if (storedRecord && storedRecord.weatherData && (isDataFresh || !isOnline)) {
                  this.forecastRawData = storedRecord.forecastRawData || null
                  this.forecastInterval = storedRecord.forecastInterval ?? this.forecastInterval
                  this.setWeatherData(storedRecord.weatherData)
                  console.log('Using stored DB weather data for current GPS location')
                } else if (isOnline) {
                  console.log('Fetching fresh weather data for current GPS location')
                  await this.fetchWeatherData({ latitude, longitude, isGPS: true })
                } else if (storedRecord && storedRecord.weatherData) {
                  this.forecastRawData = storedRecord.forecastRawData || null
                  this.forecastInterval = storedRecord.forecastInterval ?? this.forecastInterval
                  this.setWeatherData(storedRecord.weatherData)
                  console.log('Offline and using stale stored DB weather data')
                } else {
                  throw new Error('No stored weather data available and offline')
                }

                this.setLocation({ latitude, longitude })
                resolve({ latitude, longitude })
              } catch (error) {
                reject(error)
              }
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
          const weather = day.weather[Math.floor(day.weather.length / 2)]
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
    async fetchWeatherData({ latitude, longitude, isGPS = false }) {
      if (!latitude || !longitude) {
        console.error('Latitude or longitude missing for weather fetch.')
        return
      }
      const apiKey = import.meta.env.VITE_APP_OPENWEATHER_API_KEY
      const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&cnt=40&appid=${apiKey}`

      const emailForNominatim = import.meta.env.VITE_APP_NOMINATIM_EMAIL || 'youridentity@example.com'
      const osmGeocodingUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&email=${emailForNominatim}`

      try {
        const osmResponse = await fetch(osmGeocodingUrl)
        if (!osmResponse.ok) throw new Error(`OSM Geocoding HTTP error! status: ${osmResponse.status}`)
        const osmData = await osmResponse.json()

        const address = osmData.address || {}
        const townshipName = address.suburb || address.town || address.village || address.neighbourhood || address.city || 'Unknown Location'
        const countryCode = address.country_code ? address.country_code.toUpperCase() : 'ZA'
        const locationName = `${townshipName}, ${countryCode}`
        console.log('OSM Nominatim Found Local Name:', locationName)

        const weatherResponse = await fetch(apiUrl)
        if (!weatherResponse.ok) throw new Error(`Weather HTTP error! status: ${weatherResponse.status}`)
        const weatherData = await weatherResponse.json()

        let intervalMs = this.forecastInterval || 144000000
        if (weatherData.list && weatherData.list.length >= 40) {
          const firstPointTime = weatherData.list[0].dt
          const lastPointTime = weatherData.list[39].dt
          const intervalSeconds = lastPointTime - firstPointTime
          intervalMs = intervalSeconds * 1000
          this.forecastInterval = intervalMs
          console.log('Forecast interval (40-point span) extracted from API:', intervalMs, 'ms (~' + Math.round(intervalMs / 3600000) + ' hours)')
        }

        this.forecastRawData = weatherData.list

        const formattedData = this.processForecastData(weatherData.list, locationName)
        formattedData.fetchTimestamp = Date.now()

        this.setWeatherData(formattedData)
        await saveLocationWeather(latitude, longitude, locationName, {
          weatherData: formattedData,
          forecastRawData: weatherData.list,
          forecastInterval: intervalMs,
        }, isGPS)
        await this.reloadPreviousLocations()

        console.log('Weather data fetched and stored in DB:', formattedData)
      } catch (error) {
        console.error('Error fetching weather data:', error)
        alert('Could not fetch weather data. Please try again later.')
      }
    },
    startPeriodicUpdate() {
      this.stopPeriodicUpdate()
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
  },
})
