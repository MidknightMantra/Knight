/**
 * Knight Weather Service
 * Enhanced weather forecasting with alerts and extended forecasts
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
    this.cache = new Map(); // Cache for weather data
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes cache
    this.alerts = new Map(); // Store active weather alerts
  }

  async initialize() {
    try {
      Logger.success('Weather service initialized');
      
      // Start periodic weather alert checking if API key is available
      if (this.apiKey) {
        setInterval(() => {
          this.checkWeatherAlerts();
        }, 30 * 60 * 1000); // Check every 30 minutes
      }
    } catch (error) {
      Logger.error(`Weather service initialization failed: ${error.message}`);
    }
  }

  async getCurrentWeather(location) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      // Check cache first
      const cacheKey = `current_${location}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached current weather for ${location}`);
        return cached.data;
      }

      // First, get coordinates for the location
      const geoResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`
      );
      
      if (!geoResponse || geoResponse.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const { lat, lon, name, country } = geoResponse[0];

      // Get current weather
      const weatherResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );
      
      // Get air pollution data
      const pollutionResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`
      );

      const result = {
        location: name,
        country: country,
        latitude: lat,
        longitude: lon,
        temperature: Math.round(weatherResponse.main.temp),
        feelsLike: Math.round(weatherResponse.main.feels_like),
        humidity: weatherResponse.main.humidity,
        pressure: weatherResponse.main.pressure,
        windSpeed: weatherResponse.wind.speed,
        windDirection: weatherResponse.wind.deg,
        windGust: weatherResponse.wind.gust,
        description: weatherResponse.weather[0].description,
        icon: weatherResponse.weather[0].icon,
        main: weatherResponse.weather[0].main,
        sunrise: new Date(weatherResponse.sys.sunrise * 1000),
        sunset: new Date(weatherResponse.sys.sunset * 1000),
        clouds: weatherResponse.clouds.all,
        visibility: weatherResponse.visibility / 1000, // Convert to km
        uvIndex: null, // Would require separate UV API
        airQuality: pollutionResponse.list[0].main.aqi,
        pollutants: pollutionResponse.list[0].components,
        timezone: weatherResponse.timezone,
        lastUpdated: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      Logger.error(`Weather service error: ${error.message}`);
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  async getExtendedForecast(location, days = 7) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      // Check cache first
      const cacheKey = `forecast_${location}_${days}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached extended forecast for ${location}`);
        return cached.data;
      }

      // Get coordinates
      const geoResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`
      );
      
      if (!geoResponse || geoResponse.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const { lat, lon, name, country } = geoResponse[0];

      // Get 5-day forecast (OpenWeather provides 5-day/3-hour forecast)
      const forecastResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      // Process forecast data
      const dailyForecasts = this.processForecastData(forecastResponse.list, days);
      
      const result = {
        location: name,
        country: country,
        latitude: lat,
        longitude: lon,
        forecasts: dailyForecasts,
        timezone: forecastResponse.city.timezone,
        lastUpdated: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      Logger.error(`Extended forecast error: ${error.message}`);
      throw new Error(`Failed to fetch extended forecast: ${error.message}`);
    }
  }

  processForecastData(forecastList, days) {
    const dailyData = {};
    
    // Group forecasts by day
    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date: new Date(item.dt * 1000),
          temps: [],
          feelsLike: [],
          humidity: [],
          pressure: [],
          windSpeed: [],
          descriptions: [],
          icons: [],
          rain: [],
          clouds: []
        };
      }
      
      dailyData[date].temps.push(item.main.temp);
      dailyData[date].feelsLike.push(item.main.feels_like);
      dailyData[date].humidity.push(item.main.humidity);
      dailyData[date].pressure.push(item.main.pressure);
      dailyData[date].windSpeed.push(item.wind.speed);
      dailyData[date].descriptions.push(item.weather[0].description);
      dailyData[date].icons.push(item.weather[0].icon);
      dailyData[date].rain.push(item.rain ? item.rain['3h'] || 0 : 0);
      dailyData[date].clouds.push(item.clouds.all);
    });
    
    // Calculate daily averages and extremes
    const forecasts = Object.values(dailyData).map(day => ({
      date: day.date,
      minTemp: Math.round(Math.min(...day.temps)),
      maxTemp: Math.round(Math.max(...day.temps)),
      avgTemp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
      avgFeelsLike: Math.round(day.feelsLike.reduce((a, b) => a + b, 0) / day.feelsLike.length),
      avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
      avgPressure: Math.round(day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length),
      avgWindSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length),
      totalRain: Math.round(day.rain.reduce((a, b) => a + b, 0) * 100) / 100,
      avgClouds: Math.round(day.clouds.reduce((a, b) => a + b, 0) / day.clouds.length),
      description: this.getMostCommon(day.descriptions),
      icon: this.getMostCommon(day.icons),
      dayOfWeek: day.date.toLocaleDateString('en-US', { weekday: 'long' })
    })).slice(0, days);
    
    return forecasts;
  }

  getMostCommon(array) {
    return array.sort((a, b) =>
      array.filter(v => v === a).length - array.filter(v => v === b).length
    ).pop();
  }

  async getHourlyForecast(location, hours = 24) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      // Check cache first
      const cacheKey = `hourly_${location}_${hours}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached hourly forecast for ${location}`);
        return cached.data;
      }

      // Get coordinates
      const geoResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`
      );
      
      if (!geoResponse || geoResponse.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const { lat, lon, name, country } = geoResponse[0];

      // Get 5-day forecast (3-hour intervals)
      const forecastResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      // Process hourly data
      const hourlyForecasts = forecastResponse.list.slice(0, Math.min(hours / 3, 40)).map(item => ({
        dateTime: new Date(item.dt * 1000),
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind.speed,
        windDirection: item.wind.deg,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        rain: item.rain ? item.rain['3h'] || 0 : 0,
        clouds: item.clouds.all,
        visibility: item.visibility ? item.visibility / 1000 : null
      }));

      const result = {
        location: name,
        country: country,
        latitude: lat,
        longitude: lon,
        forecasts: hourlyForecasts,
        timezone: forecastResponse.city.timezone,
        lastUpdated: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      Logger.error(`Hourly forecast error: ${error.message}`);
      throw new Error(`Failed to fetch hourly forecast: ${error.message}`);
    }
  }

  async getWeatherAlerts(location) {
    try {
      if (!this.apiKey) {
        throw new Error('Weather API key not configured. Set OPENWEATHER_API_KEY in .env');
      }

      // Get coordinates
      const geoResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`
      );
      
      if (!geoResponse || geoResponse.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const { lat, lon } = geoResponse[0];

      // Get current weather alerts
      const alertsResponse = await this.fetchFromAPI(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${this.apiKey}`
      );

      return alertsResponse.alerts || [];
    } catch (error) {
      Logger.error(`Weather alerts error: ${error.message}`);
      return [];
    }
  }

  async setUserWeatherAlert(userId, location, conditions) {
    try {
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO weather_alerts 
        (user_jid, location, conditions, active, created_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, location, JSON.stringify(conditions)]);
      
      const alertId = result.lastID;
      
      Logger.info(`Set weather alert ${alertId} for ${location}`);
      return alertId;
    } catch (error) {
      Logger.error(`Failed to set weather alert: ${error.message}`);
      throw new Error(`Failed to set weather alert: ${error.message}`);
    }
  }

  async getUserWeatherAlerts(userId) {
    try {
      const alerts = await database.db.all(`
        SELECT * FROM weather_alerts 
        WHERE user_jid = ? AND active = 1
        ORDER BY created_at DESC
      `, [userId]);
      
      return alerts.map(alert => ({
        ...alert,
        conditions: JSON.parse(alert.conditions)
      }));
    } catch (error) {
      Logger.error(`Failed to get user weather alerts: ${error.message}`);
      return [];
    }
  }

  async removeUserWeatherAlert(alertId, userId) {
    try {
      await database.db.run(`
        UPDATE weather_alerts 
        SET active = 0 
        WHERE id = ? AND user_jid = ?
      `, [alertId, userId]);
      
      Logger.info(`Removed weather alert ${alertId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove weather alert ${alertId}: ${error.message}`);
      return false;
    }
  }

  async checkWeatherAlerts() {
    try {
      if (!this.apiKey) {
        Logger.info('No weather API key available, skipping weather alerts check');
        return;
      }

      // Get all active weather alerts
      const alerts = await database.db.all(`
        SELECT * FROM weather_alerts 
        WHERE active = 1
      `);
      
      // Check each alert
      for (const alert of alerts) {
        try {
          const conditions = JSON.parse(alert.conditions);
          const currentWeather = await this.getCurrentWeather(alert.location);
          
          // Check if conditions are met
          let shouldTrigger = false;
          const triggeredConditions = [];
          
          // Temperature alerts
          if (conditions.tempAbove && currentWeather.temperature > conditions.tempAbove) {
            shouldTrigger = true;
            triggeredConditions.push(`Temperature above ${conditions.tempAbove}°C`);
          }
          
          if (conditions.tempBelow && currentWeather.temperature < conditions.tempBelow) {
            shouldTrigger = true;
            triggeredConditions.push(`Temperature below ${conditions.tempBelow}°C`);
          }
          
          // Rain alerts
          if (conditions.rain && currentWeather.description.includes('rain')) {
            shouldTrigger = true;
            triggeredConditions.push('Rain detected');
          }
          
          // Wind alerts
          if (conditions.windAbove && currentWeather.windSpeed > conditions.windAbove) {
            shouldTrigger = true;
            triggeredConditions.push(`Wind speed above ${conditions.windAbove} m/s`);
          }
          
          if (shouldTrigger) {
            // Trigger alert
            await this.sendWeatherAlert(alert, currentWeather, triggeredConditions);
          }
        } catch (checkError) {
          Logger.error(`Failed to check weather alert ${alert.id}: ${checkError.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check weather alerts: ${error.message}`);
    }
  }

  async sendWeatherAlert(alert, currentWeather, triggeredConditions) {
    try {
      Logger.info(`Sending weather alert to ${alert.user_jid} for ${alert.location}`);
      
      // This would use the WhatsApp client to send the alert
      // For now, we'll log it
      Logger.info(`WEATHER ALERT: Conditions triggered for ${alert.location}: ${triggeredConditions.join(', ')}`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(alert.user_jid, {
      //   text: `🌤️ *Weather Alert*
      //   
      //   Location: ${alert.location}
      //   Triggered Conditions: ${triggeredConditions.join(', ')}
      //   Current Weather:
      //   🌡️ Temperature: ${currentWeather.temperature}°C (feels like ${currentWeather.feelsLike}°C)
      //   💧 Humidity: ${currentWeather.humidity}%
      //   💨 Wind: ${currentWeather.windSpeed} m/s
      //   ☁️ Conditions: ${currentWeather.description}
      //   
      //   Set at: ${new Date(alert.created_at).toLocaleString()}`
      // });
      
    } catch (error) {
      Logger.error(`Failed to send weather alert to ${alert.user_jid}: ${error.message}`);
    }
  }

  async fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });
    });
  }

  formatWeatherResponse(weather) {
    const windDirection = this.getWindDirection(weather.windDirection);
    const airQualityLevel = this.getAirQualityLevel(weather.airQuality);
    
    return `🌤️ *Current Weather for ${weather.location}, ${weather.country}*
    
🌡️ Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
💧 Humidity: ${weather.humidity}%
💨 Wind: ${weather.windSpeed} m/s ${windDirection}${weather.windGust ? ` (gusts ${weather.windGust} m/s)` : ''}
📊 Pressure: ${weather.pressure} hPa
☁️ Conditions: ${weather.description}
👁️ Visibility: ${weather.visibility} km
🌍 Air Quality: ${airQualityLevel} (AQI: ${weather.airQuality})

🌅 Sunrise: ${weather.sunrise.toLocaleTimeString()}
🌇 Sunset: ${weather.sunset.toLocaleTimeString()}

📅 Updated: ${weather.lastUpdated.toLocaleString()}`;
  }

  formatExtendedForecast(forecast) {
    let response = `📅 *${forecast.location}, ${forecast.country} - ${forecast.forecasts.length}-Day Forecast*\n\n`;
    
    forecast.forecasts.forEach((day, index) => {
      const dateStr = index === 0 ? 'Today' : 
                     index === 1 ? 'Tomorrow' : 
                     day.dayOfWeek;
                     
      response += `*${dateStr} (${day.date.toLocaleDateString()})*
🌡️ ${day.maxTemp}°/${day.minTemp}°C - ${day.description}
💧 Humidity: ${day.avgHumidity}% | 💨 Wind: ${day.avgWindSpeed} m/s
${day.totalRain > 0 ? `🌧️ Rain: ${day.totalRain}mm | ` : ''}☁️ Clouds: ${day.avgClouds}%

`;
    });
    
    response += `📅 Updated: ${forecast.lastUpdated.toLocaleString()}`;
    return response;
  }

  formatHourlyForecast(forecast) {
    let response = `⏰ *${forecast.location}, ${forecast.country} - Hourly Forecast*\n\n`;
    
    forecast.forecasts.slice(0, 8).forEach((hour, index) => {
      const timeStr = hour.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      response += `${index === 0 ? 'Now' : timeStr}: ${hour.temp}°C - ${hour.description}
💨 ${hour.windSpeed} m/s | 💧 ${hour.humidity}%${hour.rain > 0 ? ` | 🌧️ ${hour.rain}mm` : ''}

`;
    });
    
    response += `⏰ Updated: ${forecast.lastUpdated.toLocaleString()}`;
    return response;
  }

  getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  getAirQualityLevel(aqi) {
    const levels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    return levels[aqi - 1] || 'Unknown';
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up weather cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup weather cache: ${error.message}`);
    }
  }
}

module.exports = new WeatherService();