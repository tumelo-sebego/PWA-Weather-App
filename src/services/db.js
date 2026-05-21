import Dexie from 'dexie';

// 1. Initialize the Database
export const db = new Dexie('WeatherDatabase');

// Define stores: 'id' is our primary key
db.version(1).stores({
  locations: 'id, timestamp, isCurrentGPS'
});

// 2. Safe Save Function (Limits database to maximum 5 locations)
export async function saveLocationWeather(lat, lon, name, data, isGPS = false) {
  // Use a rounded string coordinate as a unique identifier to prevent duplicate entries close by
  const id = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // If this is the active live GPS location, turn off the GPS flag on any older entry
  if (isGPS) {
    await db.locations.where('isCurrentGPS').equals(1).modify({ isCurrentGPS: false });
  }

  // Save or Update the current location dataset
  await db.locations.put({
    id,
    latitude: lat,
    longitude: lon,
    locationName: name,
    weatherData: data,
    timestamp: Date.now(),
    isCurrentGPS: isGPS ? true : false
  });

  // Strict Cleanup: Keep only the 5 freshest locations
  const count = await db.locations.count();
  if (count > 5) {
    // Find the oldest record that is NOT our current GPS location
    const oldest = await db.locations
      .where('isCurrentGPS')
      .equals(0)
      .sortBy('timestamp');
    
    if (oldest.length > 0) {
      await db.locations.delete(oldest[0].id);
    }
  }
}