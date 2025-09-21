/**
 * Knight Weather Service
 * Fetches real weather data from OpenWeatherMap API
 */

const Logger = require('../utils/logger');
const config = require('../config');

class WeatherService {
  constructor() {
    this.apiKey = config.api.openai || config.api.weather; // Use either API key
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getCurrentWeather(location) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      // First, get coordinates for the location
      const geoResponse = await fetch(
        `${this.baseUrl}/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}`
      );
      
      if (!geoResponse.ok) {
        const errorData = await geoResponse.json();
        throw new Error(errorData.message || 'Location not found');
      }
      
      const weatherData = await geoResponse.json();
      
      return {
        location: weatherData.name,
        country: weatherData.sys.country,
        temperature: Math.round(weatherData.main.temp - 273.15), // Convert Kelvin to Celsius
        feelsLike: Math.round(weatherData.main.feels_like - 273.15),
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        windSpeed: weatherData.wind.speed,
        windDirection: weatherData.wind.deg,
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        sunrise: new Date(weatherData.sys.sunrise * 1000),
        sunset: new Date(weatherData.sys.sunset * 1000),
        clouds: weatherData.clouds.all,
        visibility: weatherData.visibility / 1000 // Convert to km
      };
    } catch (error) {
      Logger.error(`Weather service error: ${error.message}`);
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  async getForecast(location, days = 5) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      const response = await fetch(
        `${this.baseUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&cnt=${days * 8}` // 8 forecasts per day
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Location not found');
      }
      
      const forecastData = await response.json();
      
      // Group forecasts by day
      const dailyForecasts = {};
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date: date,
            temps: [],
            descriptions: [],
            humidity: [],
            windSpeed: []
          };
        }
        dailyForecasts[date].temps.push(item.main.temp - 273.15);
        dailyForecasts[date].descriptions.push(item.weather[0].description);
        dailyForecasts[date].humidity.push(item.main.humidity);
        dailyForecasts[date].windSpeed.push(item.wind.speed);
      });
      
      // Calculate daily averages
      const forecasts = Object.values(dailyForecasts).map(day => ({
        date: day.date,
        avgTemp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
        minTemp: Math.round(Math.min(...day.temps)),
        maxTemp: Math.round(Math.max(...day.temps)),
        description: this.getMostCommon(day.descriptions),
        avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        avgWindSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length)
      })).slice(0, days);
      
      return {
        location: forecastData.city.name,
        country: forecastData.city.country,
        forecasts: forecasts
      };
    } catch (error) {
      Logger.error(`Forecast service error: ${error.message}`);
      throw new Error(`Failed to fetch forecast data: ${error.message}`);
    }
  }

  getMostCommon(array) {
    return array.sort((a, b) =>
      array.filter(v => v === a).length - array.filter(v => v === b).length
    ).pop();
  }

  formatWeatherResponse(weather) {
    return `🌤️ *Current Weather for ${weather.location}, ${weather.country}*
    
🌡️ Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
💧 Humidity: ${weather.humidity}%
💨 Wind: ${weather.windSpeed} m/s
☁️ Conditions: ${weather.description}
👁️ Visibility: ${weather.visibility} km
📊 Pressure: ${weather.pressure} hPa

🌅 Sunrise: ${weather.sunrise.toLocaleTimeString()}
🌇 Sunset: ${weather.sunset.toLocaleTimeString()}

*Updated: ${new Date().toLocaleString()}*`;
  }

  formatForecastResponse(forecast) {
    let response = `📅 *${forecast.location}, ${forecast.country} - ${forecast.forecasts.length}-Day Forecast*\n\n`;
    
    forecast.forecasts.forEach((day, index) => {
      const date = index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
      response += `*${date}*: ${day.maxTemp}°/${day.minTemp}°C - ${day.description}\n`;
    });
    
    response += `\n*Updated: ${new Date().toLocaleString()}*`;
    return response;
  }

  // Convert temperature units
  convertTemperature(temp, toUnit) {
    if (toUnit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  }
}

module.exports = new WeatherService();