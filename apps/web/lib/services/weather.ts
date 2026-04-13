/**
 * Weather tool — fetches real-time weather data using the Open-Meteo API (free, no key required).
 */

export interface WeatherResult {
  location: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
}

export async function getWeather(location: string): Promise<WeatherResult | { error: string }> {
  try {
    // 1. Geocode location to get lat/long
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
    const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> };

    if (!geoData.results || geoData.results.length === 0) {
      return { error: `Location '${location}' not found.` };
    }

    const { latitude, longitude, name } = geoData.results[0];

    // 2. Fetch weather data for lat/long
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) });
    const weatherData = await weatherRes.json() as { current_weather: any };

    return {
      location: name,
      ...weatherData.current_weather,
    };
  } catch (error) {
    return { error: "Failed to fetch weather data." };
  }
}
