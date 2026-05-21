import Dexie from 'dexie';

// 1. Initialize the Database
export const db = new Dexie('WeatherDatabase');

// Define stores: 'id' is our primary key
db.version(1).stores({
  locations: 'id, timestamp, isCurrentGPS'
});

function createId(lat, lon) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// 2. Safe Save Function (Limits database to maximum 5 locations)
export async function saveLocationWeather(lat, lon, name, data, isGPS = false) {
  const id = createId(lat, lon);
  const weatherData = data.weatherData || data;
  const forecastRawData = data.forecastRawData ?? null;
  const forecastInterval = data.forecastInterval ?? null;

  if (isGPS) {
    await db.locations.where('isCurrentGPS').equals(1).modify({ isCurrentGPS: false });
  }

  

  await db.locations.put({
    id,
    latitude: lat,
    longitude: lon,
    locationName: name,
    weatherData,
    forecastRawData,
    forecastInterval,
    timestamp: Date.now(),
    isCurrentGPS: isGPS ? 1 : 0,
  });

  const count = await db.locations.count();
  if (count > 5) {
    const oldest = await db.locations
      .where('isCurrentGPS')
      .equals(0)
      .sortBy('timestamp');

    if (oldest.length > 0) {
      await db.locations.delete(oldest[0].id);
    }
  }
}

export async function getLocationById(lat, lon) {
  return db.locations.get(createId(lat, lon));
}

export async function getMostRecentLocation() {
  return db.locations.orderBy('timestamp').reverse().first();
}

export async function getRecentLocations(limit = 5) {
  return db.locations.orderBy('timestamp').reverse().limit(limit).toArray();
}
