import axios from 'axios';

export interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

export const fetchWeather = async (latitude: number = 42.6629, longitude: number = 21.1655): Promise<WeatherData> => {
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (response.data && response.data.current_weather) {
      return {
        temperature: response.data.current_weather.temperature,
        windspeed: response.data.current_weather.windspeed,
        weathercode: response.data.current_weather.weathercode,
      };
    }
    throw new Error('Invalid weather data structure returned.');
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    throw error;
  }
};

// Map weather codes to descriptive labels
export const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Mainly clear, partly cloudy, or overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rainy';
  if (code >= 71 && code <= 75) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Cloudy';
};
