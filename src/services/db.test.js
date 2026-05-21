// Fake database environment for our node testing server
import 'fake-indexeddb/auto'; 

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, saveLocationWeather } from './db';


describe('Weather App Storage Pipeline', () => {
  
  beforeEach(async () => {
    // Clear the database before every single test run to keep conditions clean
    await db.locations.clear();
  });

  it('should successfully store weather data without crashing', async () => {
    const mockWeatherData = { current: { temp: 17, main: 'Clear' } };
    
    await saveLocationWeather(-26.18, 28.32, 'Katlehong, ZA', mockWeatherData, true);
    
    const record = await db.locations.get('-26.18,28.32');
    expect(record).toBeDefined();
    expect(record.locationName).toBe('Katlehong, ZA');
    expect(record.weatherData.current.temp).toBe(17);
  });

  it('should strictly limit storage to a maximum of 5 locations', async () => {
    const mockData = { current: { temp: 20 } };

    // Attempt to write 6 completely distinct locations into the system
    await saveLocationWeather(-26.18, 28.32, 'Location 1', mockData, true); // Live GPS
    await saveLocationWeather(10.00, 10.00, 'Location 2', mockData, false);
    await saveLocationWeather(20.00, 20.00, 'Location 3', mockData, false);
    await saveLocationWeather(30.00, 30.00, 'Location 4', mockData, false);
    await saveLocationWeather(40.00, 40.00, 'Location 5', mockData, false);
    
    // This 6th one should push out the oldest non-GPS location (Location 2)
    await saveLocationWeather(50.00, 50.00, 'Location 6', mockData, false);

    const finalCount = await db.locations.count();
    
    // Assert that the length never exceeds our architectural limit
    expect(finalCount).toBe(5);

    // Verify that the initial live GPS track was safely preserved regardless of age
    const gpsRecord = await db.locations.get('-26.18,28.32');
    expect(gpsRecord).toBeDefined();
  });
});