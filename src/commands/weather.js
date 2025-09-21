/**
 * Weather Command
 * Get real weather information for any location
 */

const weatherService = require('../services/weatherService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'weather',
  aliases: ['w', 'forecast'],
  category: 'utility',
  description: 'Get real weather information for any location',
  usage: '!weather <location> [forecast]',
  
  async execute(client, message, args) {
    if (args.length === 0) {
      return `🌤️ *Weather Service*
      
Usage: !weather <location> [forecast]

Examples:
!weather Nairobi
!weather London,UK
!weather New York forecast
!weather Tokyo

Features:
▫️ Real-time weather data
▫️ Temperature, humidity, wind info
▫️ Weather forecasts (5-day)
▫️ Sunrise/sunset times

Note: Requires OpenWeatherMap API key in .env`;
    }
    
    try {
      const location = args.filter(arg => arg !== 'forecast').join(' ');
      const showForecast = args.includes('forecast');
      
      await client.sendMessage(message.key.remoteJid, { 
        text: `🔄 Fetching weather data for ${location}...` 
      });
      
      if (showForecast) {
        // Get 5-day forecast
        const forecast = await weatherService.getForecast(location, 5);
        return weatherService.formatForecastResponse(forecast);
      } else {
        // Get current weather
        const weather = await weatherService.getCurrentWeather(location);
        return weatherService.formatWeatherResponse(weather);
      }
    } catch (error) {
      Logger.error(`Weather command error: ${error.message}`);
      
      if (error.message.includes('API key')) {
        return `❌ Weather API key not configured!
        
To enable real weather data:
1. Get free API key from https://openweathermap.org/api
2. Add OPENWEATHER_API_KEY=your_key to .env file
3. Restart Knight bot`;
      }
      
      return `❌ Failed to fetch weather data: ${error.message}`;
    }
  }
};