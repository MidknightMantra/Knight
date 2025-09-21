/**
 * Weather Command
 * Enhanced weather forecasting with alerts and extended forecasts
 */

const weatherService = require('../services/weatherService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'weather',
  aliases: ['w', 'forecast', 'climate'],
  category: 'utility',
  description: 'Enhanced weather forecasting with alerts and extended forecasts',
  usage: '!weather <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'current';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `🌤️ *Knight Weather Service*
        
Available subcommands:
▫️ help - Show this help
▫️ current <location> - Get current weather
▫️ forecast <location> [days] - Get extended forecast
▫️ hourly <location> [hours] - Get hourly forecast
▫️ alerts <location> - Get weather alerts
▫️ alert <location> <conditions> - Set weather alert
▫️ alerts-list - List your weather alerts
▫️ remove-alert <alert_id> - Remove a weather alert
▫️ favorites - Show favorite locations
▫️ add-favorite <location> [nickname] - Add location to favorites
▫️ remove-favorite <location> - Remove location from favorites
▫️ radar - Show weather radar (if available)

Examples:
!weather current Nairobi
!weather forecast London 7
!weather hourly New York 24
!weather alerts Tokyo
!weather alert Paris "temp>25,rain"
!weather favorites`;

      case 'current':
        if (args.length < 2) {
          return `❌ Usage: !weather current <location>
          
Examples:
!weather current Nairobi
!weather current London,UK
!weather current "New York,NY"
!weather current Tokyo`;
        }
        
        try {
          const location = args.slice(1).join(' ');
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching current weather for ${location}...` 
          });
          
          const weather = await weatherService.getCurrentWeather(location);
          return weatherService.formatWeatherResponse(weather);
        } catch (error) {
          Logger.error(`Weather current error: ${error.message}`);
          
          if (error.message.includes('API key')) {
            return `❌ Weather API key not configured!
            
To enable real weather data:
1. Get free API key from https://openweathermap.org/api
2. Add OPENWEATHER_API_KEY=your_key to .env file
3. Restart Knight bot`;
          }
          
          return `❌ Failed to fetch weather data: ${error.message}`;
        }

      case 'forecast':
        if (args.length < 2) {
          return `❌ Usage: !weather forecast <location> [days]
          
Examples:
!weather forecast Nairobi
!weather forecast London 7
!weather forecast Tokyo 14
!weather forecast "New York,NY" 5`;
        }
        
        try {
          const location = args[1];
          const days = args[2] ? parseInt(args[2]) : 7;
          
          if (isNaN(days) || days < 1 || days > 16) {
            return '❌ Days must be between 1 and 16';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching ${days}-day forecast for ${location}...` 
          });
          
          const forecast = await weatherService.getExtendedForecast(location, days);
          return weatherService.formatExtendedForecast(forecast);
        } catch (error) {
          Logger.error(`Weather forecast error: ${error.message}`);
          return `❌ Failed to fetch forecast: ${error.message}`;
        }

      case 'hourly':
        if (args.length < 2) {
          return `❌ Usage: !weather hourly <location> [hours]
          
Examples:
!weather hourly Nairobi
!weather hourly London 12
!weather hourly Tokyo 24
!weather hourly "New York,NY" 48`;
        }
        
        try {
          const location = args[1];
          const hours = args[2] ? parseInt(args[2]) : 24;
          
          if (isNaN(hours) || hours < 1 || hours > 120) {
            return '❌ Hours must be between 1 and 120';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching ${hours}-hour forecast for ${location}...` 
          });
          
          const forecast = await weatherService.getHourlyForecast(location, hours);
          return weatherService.formatHourlyForecast(forecast);
        } catch (error) {
          Logger.error(`Weather hourly error: ${error.message}`);
          return `❌ Failed to fetch hourly forecast: ${error.message}`;
        }

      case 'alerts':
        if (args.length < 2) {
          return `❌ Usage: !weather alerts <location>
          
Examples:
!weather alerts Nairobi
!weather alerts London,UK
!weather alerts Tokyo`;
        }
        
        try {
          const location = args.slice(1).join(' ');
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching weather alerts for ${location}...` 
          });
          
          const alerts = await weatherService.getWeatherAlerts(location);
          
          if (alerts.length === 0) {
            return `🌤️ *Weather Alerts for ${location}*
            
No active weather alerts for this location.`;
          }
          
          let response = `⚠️ *Weather Alerts for ${location}* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            response += `${index + 1}. ${alert.event}
📅 From: ${new Date(alert.start * 1000).toLocaleString()}
📅 Until: ${new Date(alert.end * 1000).toLocaleString()}
📝 ${alert.description.substring(0, 200)}${alert.description.length > 200 ? '...' : ''}

`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Weather alerts error: ${error.message}`);
          return `❌ Failed to fetch weather alerts: ${error.message}`;
        }

      case 'alert':
        if (args.length < 3) {
          return `❌ Usage: !weather alert <location> <conditions>
          
Condition format: temp>25,temp<10,rain,wind>10
Examples:
!weather alert Nairobi "temp>30"
!weather alert London "rain,wind>15"
!weather alert Tokyo "temp>25,temp<5"
!weather alert "New York,NY" "snow,temp<-5"`;
        }
        
        try {
          const location = args[1];
          const conditionsStr = args[2];
          
          // Parse conditions
          const conditions = {};
          const conditionParts = conditionsStr.split(',');
          
          conditionParts.forEach(part => {
            const cleanPart = part.trim();
            if (cleanPart.startsWith('temp>')) {
              conditions.tempAbove = parseInt(cleanPart.substring(5));
            } else if (cleanPart.startsWith('temp<')) {
              conditions.tempBelow = parseInt(cleanPart.substring(5));
            } else if (cleanPart === 'rain') {
              conditions.rain = true;
            } else if (cleanPart.startsWith('wind>')) {
              conditions.windAbove = parseInt(cleanPart.substring(5));
            } else if (cleanPart === 'snow') {
              conditions.snow = true;
            }
          });
          
          const alertId = await weatherService.setUserWeatherAlert(userId, location, conditions);
          
          return `✅ Weather alert set successfully!
🆔 ID: ${alertId}
📍 Location: ${location}
🔔 Conditions: ${conditionsStr}
⏰ You'll be notified when these conditions are met.`;
        } catch (error) {
          Logger.error(`Weather alert error: ${error.message}`);
          return `❌ Failed to set weather alert: ${error.message}`;
        }

      case 'alerts-list':
        try {
          const alerts = await weatherService.getUserWeatherAlerts(userId);
          
          if (alerts.length === 0) {
            return '🌤️ You have no active weather alerts.';
          }
          
          let response = `🌤️ *Your Weather Alerts* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            const conditions = JSON.parse(alert.conditions);
            const conditionDesc = Object.entries(conditions)
              .map(([key, value]) => {
                if (key === 'tempAbove') return `Temp > ${value}°C`;
                if (key === 'tempBelow') return `Temp < ${value}°C`;
                if (key === 'windAbove') return `Wind > ${value} m/s`;
                return key.charAt(0).toUpperCase() + key.slice(1);
              })
              .join(', ');
              
            response += `${index + 1}. 📍 ${alert.location}
🔔 ${conditionDesc}
🆔 ${alert.id}
📅 Set: ${new Date(alert.created_at).toLocaleString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Weather alerts-list error: ${error.message}`);
          return `❌ Failed to get your weather alerts: ${error.message}`;
        }

      case 'remove-alert':
        if (args.length < 2) {
          return '❌ Usage: !weather remove-alert <alert_id>';
        }
        
        try {
          const alertId = parseInt(args[1]);
          if (isNaN(alertId)) {
            return '❌ Please provide a valid alert ID.';
          }
          
          const success = await weatherService.removeUserWeatherAlert(alertId, userId);
          
          return success ? 
            `✅ Weather alert ${alertId} removed successfully!` : 
            `❌ Failed to remove weather alert ${alertId}. Alert not found or access denied.`;
        } catch (error) {
          Logger.error(`Weather remove-alert error: ${error.message}`);
          return `❌ Failed to remove weather alert: ${error.message}`;
        }

      case 'favorites':
        try {
          const favorites = await database.db.all(`
            SELECT * FROM weather_favorites 
            WHERE user_jid = ?
            ORDER BY added_at DESC
          `, [userId]);
          
          if (favorites.length === 0) {
            return '⭐ Your weather favorites list is empty.';
          }
          
          let response = `⭐ *Your Weather Favorites* (${favorites.length})\n\n`;
          
          favorites.forEach((favorite, index) => {
            response += `${index + 1}. ${favorite.nickname || favorite.location}
📍 ${favorite.location}
📅 Added: ${new Date(favorite.added_at).toLocaleDateString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Weather favorites error: ${error.message}`);
          return `❌ Failed to get your weather favorites: ${error.message}`;
        }

      case 'add-favorite':
        if (args.length < 2) {
          return `❌ Usage: !weather add-favorite <location> [nickname]
          
Examples:
!weather add-favorite Nairobi
!weather add-favorite "London,UK" "London Office"
!weather add-favorite Tokyo "Home City"`;
        }
        
        try {
          const location = args[1];
          const nickname = args[2] || null;
          
          await database.db.run(`
            INSERT OR IGNORE INTO weather_favorites 
            (user_jid, location, nickname, added_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `, [userId, location, nickname]);
          
          return `✅ Added ${location}${nickname ? ` (${nickname})` : ''} to your weather favorites!`;
        } catch (error) {
          Logger.error(`Weather add-favorite error: ${error.message}`);
          return `❌ Failed to add to weather favorites: ${error.message}`;
        }

      case 'remove-favorite':
        if (args.length < 2) {
          return '❌ Usage: !weather remove-favorite <location>';
        }
        
        try {
          const location = args[1];
          
          await database.db.run(`
            DELETE FROM weather_favorites 
            WHERE user_jid = ? AND location = ?
          `, [userId, location]);
          
          return `✅ Removed ${location} from your weather favorites!`;
        } catch (error) {
          Logger.error(`Weather remove-favorite error: ${error.message}`);
          return `❌ Failed to remove from weather favorites: ${error.message}`;
        }

      case 'radar':
        return `📡 *Weather Radar*
        
Weather radar functionality requires additional setup and specialized APIs.
        
For now, you can use:
- !weather current <location> for current conditions
- !weather forecast <location> for extended forecasts
- !weather alerts <location> for weather alerts`;

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !weather help for available commands`;
    }
  }
};