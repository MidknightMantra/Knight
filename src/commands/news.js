/**
 * News Command
 * Real-time news aggregation and alert system
 */

const newsService = require('../services/newsService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'news',
  aliases: ['headline', 'headlines'],
  category: 'information',
  description: 'Real-time news aggregation and alerts',
  usage: '!news <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `📰 *Knight News Aggregator*
        
Available subcommands:
▫️ help - Show this help
▫️ top [category] [country] - Get top headlines
▫️ search <query> - Search news by keyword
▫️ categories - List available categories
▫️ sources - List news sources
▫️ alert <keyword> [category] - Set news alert
▫️ alerts - List your news alerts
▫️ remove <alert_id> - Remove a news alert
▫️ trending - Show trending topics
▫️ market - Show market news
▫️ tech - Show technology news
▫️ sports - Show sports news
▫️ entertainment - Show entertainment news
▫️ health - Show health news
▫️ science - Show science news
▫️ business - Show business news

Examples:
!news top
!news top technology
!news top business us
!news search artificial intelligence
!news categories
!news sources
!news alert bitcoin
!news alerts
!news remove 123
!news trending
!news market
!news tech
!news sports
!news entertainment
!news health
!news science
!news business`;

      case 'top':
        try {
          const options = {
            pageSize: 5,
            page: 1
          };
          
          let category = null;
          let country = 'us';
          
          // Parse arguments
          if (args.length > 1) {
            // Check if first argument is a valid category
            const firstArg = args[1].toLowerCase();
            if (newsService.categories && newsService.categories.includes(firstArg)) {
              category = firstArg;
              // Check if second argument is a country code
              if (args.length > 2 && args[2].length === 2) {
                country = args[2].toLowerCase();
              }
            } else if (firstArg.length === 2) {
              // First argument is country code
              country = firstArg;
            } else {
              // First argument might be category
              category = firstArg;
            }
          }
          
          options.category = category;
          options.country = country;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching top headlines${category ? ` for ${category}` : ''}${country ? ` in ${country.toUpperCase()}` : ''}...` 
          });
          
          const news = await newsService.getTopHeadlines(options);
          
          if (news.articles.length === 0) {
            return `📰 No news articles found${category ? ` for ${category}` : ''}${country ? ` in ${country.toUpperCase()}` : ''}.`;
          }
          
          let response = `📰 *Top Headlines${category ? ` - ${category.charAt(0).toUpperCase() + category.slice(1)}` : ''}${country ? ` (${country.toUpperCase()})` : ''}* (${news.articles.length})\n\n`;
          
          news.articles.slice(0, 5).forEach((article, index) => {
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${article.publishedAt.toLocaleDateString()} at ${article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News top error: ${error.message}`);
          return `❌ Failed to get top headlines: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return `❌ Usage: !news search <query>
          
Examples:
!news search artificial intelligence
!news search climate change
!news search cryptocurrency
!news search space exploration`;
        }
        
        try {
          const query = args.slice(1).join(' ');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔍 Searching news for "${query}"...` 
          });
          
          const searchResults = await newsService.searchNews(query, {
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `🔍 No news articles found for "${query}".`;
          }
          
          let response = `🔍 *Search Results for "${query}"* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          if (searchResults.articles.length > 5) {
            response += `... and ${searchResults.articles.length - 5} more articles`;
          }
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News search error: ${error.message}`);
          return `❌ Failed to search news: ${error.message}`;
        }

      case 'categories':
        try {
          const categories = [
            'business', 'entertainment', 'general', 'health', 
            'science', 'sports', 'technology'
          ];
          
          let response = `📚 *Available News Categories* (${categories.length})\n\n`;
          
          categories.forEach((category, index) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            response += `${index + 1}. ${categoryName}\n`;
          });
          
          response += `\n📝 Usage: !news top <category> [country]
Example: !news top technology us`;
          
          return response;
        } catch (error) {
          Logger.error(`News categories error: ${error.message}`);
          return `❌ Failed to get categories: ${error.message}`;
        }

      case 'sources':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `📡 Fetching news sources...` 
          });
          
          const sources = await newsService.getNewsSources();
          
          if (sources.sources.length === 0) {
            return `📡 No news sources available.`;
          }
          
          let response = `📡 *Available News Sources* (${sources.sources.length})\n\n`;
          
          sources.sources.slice(0, 10).forEach((source, index) => {
            response += `${index + 1}. ${source.name}
📍 ${source.country.toUpperCase()} | ${source.language.toUpperCase()}
📰 ${source.category}
📝 ${source.description.substring(0, 100)}${source.description.length > 100 ? '...' : ''}\n\n`;
          });
          
          if (sources.sources.length > 10) {
            response += `... and ${sources.sources.length - 10} more sources`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`News sources error: ${error.message}`);
          return `❌ Failed to get news sources: ${error.message}`;
        }

      case 'alert':
        if (args.length < 2) {
          return `❌ Usage: !news alert <keyword> [category]
          
Examples:
!news alert bitcoin
!news alert artificial intelligence technology
!news alert football sports
!news alert climate change
!news alert space exploration`;
        }
        
        try {
          const keyword = args[1];
          const category = args.length > 2 ? args[2] : null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting news alert for "${keyword}"${category ? ` in ${category}` : ''}...` 
          });
          
          const alertId = await newsService.setNewsAlert(userId, keyword, category);
          
          return alertId ? 
            `✅ News alert set successfully!
🆔 ID: ${alertId}
🔍 Keyword: "${keyword}"
${category ? `📚 Category: ${category}` : ''}
⏰ You'll be notified when new articles match this criteria.` : 
            `❌ Failed to set news alert.`;
        } catch (error) {
          Logger.error(`News alert error: ${error.message}`);
          return `❌ Failed to set news alert: ${error.message}`;
        }

      case 'alerts':
        try {
          const alerts = await newsService.getNewsAlerts(userId);
          
          if (alerts.length === 0) {
            return `🔔 You have no active news alerts.
            
Set alerts with: !news alert <keyword> [category]

Examples:
!news alert bitcoin
!news alert artificial intelligence technology
!news alert football sports`;
          }
          
          let response = `🔔 *Your Active News Alerts* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            response += `${index + 1}. 🔍 "${alert.keyword}"
${alert.category ? `📚 ${alert.category}` : ''}
🆔 ${alert.id}
📅 Set: ${new Date(alert.created_at).toLocaleString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`News alerts error: ${error.message}`);
          return `❌ Failed to get your news alerts: ${error.message}`;
        }

      case 'remove':
        if (args.length < 2) {
          return '❌ Usage: !news remove <alert_id>';
        }
        
        try {
          const alertId = parseInt(args[1]);
          if (isNaN(alertId)) {
            return '❌ Please provide a valid alert ID.';
          }
          
          const success = await newsService.removeNewsAlert(alertId, userId);
          
          return success ? 
            `✅ Alert ${alertId} removed successfully!` : 
            `❌ Failed to remove alert ${alertId}. Alert not found or access denied.`;
        } catch (error) {
          Logger.error(`News remove error: ${error.message}`);
          return `❌ Failed to remove alert: ${error.message}`;
        }

      case 'trending':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔥 Fetching trending topics...` 
          });
          
          // For trending, we'll search for popular topics
          const trendingTopics = ['technology', 'sports', 'business', 'politics', 'entertainment', 'health', 'science', 'climate'];
          
          let response = `🔥 *Trending Topics*\n\n`;
          
          for (const topic of trendingTopics) {
            try {
              const searchResults = await newsService.searchNews(topic, {
                pageSize: 2,
                sortBy: 'publishedAt'
              });
              
              if (searchResults.articles.length > 0) {
                const latestArticle = searchResults.articles[0];
                response += `📰 *${topic.charAt(0).toUpperCase() + topic.slice(1)}*
${latestArticle.title}
📅 ${latestArticle.publishedAt.toLocaleDateString()}
🔗 ${latestArticle.url}\n\n`;
              }
            } catch (error) {
              // Continue with next topic
            }
          }
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News trending error: ${error.message}`);
          return `❌ Failed to get trending topics: ${error.message}`;
        }

      case 'market':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `💹 Fetching market news...` 
          });
          
          const searchResults = await newsService.searchNews('market', {
            category: 'business',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `💹 No market news found.`;
          }
          
          let response = `💹 *Market News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News market error: ${error.message}`);
          return `❌ Failed to get market news: ${error.message}`;
        }

      case 'tech':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `💻 Fetching technology news...` 
          });
          
          const searchResults = await newsService.searchNews('technology', {
            category: 'technology',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `💻 No technology news found.`;
          }
          
          let response = `💻 *Technology News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News tech error: ${error.message}`);
          return `❌ Failed to get technology news: ${error.message}`;
        }

      case 'sports':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `⚽ Fetching sports news...` 
          });
          
          const searchResults = await newsService.searchNews('sports', {
            category: 'sports',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `⚽ No sports news found.`;
          }
          
          let response = `⚽ *Sports News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News sports error: ${error.message}`);
          return `❌ Failed to get sports news: ${error.message}`;
        }

      case 'entertainment':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🎬 Fetching entertainment news...` 
          });
          
          const searchResults = await newsService.searchNews('entertainment', {
            category: 'entertainment',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `🎬 No entertainment news found.`;
          }
          
          let response = `🎬 *Entertainment News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News entertainment error: ${error.message}`);
          return `❌ Failed to get entertainment news: ${error.message}`;
        }

      case 'health':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🏥 Fetching health news...` 
          });
          
          const searchResults = await newsService.searchNews('health', {
            category: 'health',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `🏥 No health news found.`;
          }
          
          let response = `🏥 *Health News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News health error: ${error.message}`);
          return `❌ Failed to get health news: ${error.message}`;
        }

      case 'science':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔬 Fetching science news...` 
          });
          
          const searchResults = await newsService.searchNews('science', {
            category: 'science',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `🔬 No science news found.`;
          }
          
          let response = `🔬 *Science News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News science error: ${error.message}`);
          return `❌ Failed to get science news: ${error.message}`;
        }

      case 'business':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `💼 Fetching business news...` 
          });
          
          const searchResults = await newsService.searchNews('business', {
            category: 'business',
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          if (searchResults.articles.length === 0) {
            return `💼 No business news found.`;
          }
          
          let response = `💼 *Business News* (${searchResults.articles.length})\n\n`;
          
          searchResults.articles.slice(0, 5).forEach((article, index) => {
            const dateStr = article.publishedAt.toLocaleDateString();
            const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. *${article.title}*
📰 ${article.source}${article.author ? ` | ${article.author}` : ''}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 ${article.url}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`News business error: ${error.message}`);
          return `❌ Failed to get business news: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !news help for available commands`;
    }
  }
};