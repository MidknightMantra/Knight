/**
 * Enhanced Music Search Command
 * Multiple search methods without external APIs
 */

const musicService = require('../services/musicService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'music',
  aliases: ['song', 'audio', 'search'],
  category: 'media',
  description: 'Search music using multiple methods',
  usage: '!music <search_query> [--method local|scrape|all]',
  
  async execute(client, message, args) {
    if (args.length === 0) {
      return `🎵 *Music Search*
      
Usage: !music <search_query> [--method METHOD]

Methods:
▫️ local - Search local database (default)
▫️ scrape - Web scraping search
▫️ all - Try all methods

Examples:
!music despacito
!music ohangla --method local
!music shape of you --method all

Features:
▫️ No external API keys required
▫️ Multiple search methods
▫️ Local music database
▫️ Smart fallback handling`;
    }
    
    try {
      // Parse arguments
      let query = '';
      let method = 'local';
      
      const methodIndex = args.indexOf('--method');
      if (methodIndex !== -1 && args[methodIndex + 1]) {
        method = args[methodIndex + 1];
        query = args.slice(0, methodIndex).join(' ');
      } else {
        query = args.join(' ');
      }
      
      await client.sendMessage(message.key.remoteJid, { 
        text: `🔄 Searching for "${query}" using ${method} method...` 
      });
      
      let searchResults = [];
      
      // Use different search methods based on --method flag
      switch (method) {
        case 'local':
          searchResults = musicService.searchLocalDatabase(query);
          break;
          
        case 'scrape':
          // In real implementation, this would scrape actual websites
          searchResults = await musicService.scrapeMusicSearch(query);
          break;
          
        case 'all':
        default:
          // Try local first, then fall back to other methods
          searchResults = musicService.searchLocalDatabase(query);
          if (searchResults.length === 0) {
            searchResults = await musicService.scrapeMusicSearch(query);
          }
          break;
      }
      
      if (searchResults.length === 0) {
        return `❌ No music found for "${query}".
        
💡 Try:
- Different search terms
- !music --method all ${query}
- Check spelling`;
      }
      
      // Format results
      let response = `🎵 *Music Search Results for "${query}"*\n\n`;
      
      searchResults.slice(0, 5).forEach((result, index) => {
        const sourceIcon = {
          'local': '💾',
          'scrape': '🌐',
          'youtube': '📺'
        }[result.source] || '🎧';
        
        response += `${index + 1}. ${result.title}
${sourceIcon} ${result.artist}
⏱️ ${result.duration}
${result.year ? `📅 ${result.year}` : ''}
📥 Download: !youtube ${result.url} audio\n\n`;
      });
      
      if (searchResults.length > 5) {
        response += `... and ${searchResults.length - 5} more results\n\n`;
      }
      
      response += `📱 *To download:* Use !youtube with any link above
Example: !youtube ${searchResults[0].url} audio`;
      
      return response;
      
    } catch (error) {
      Logger.error(`Music command error: ${error.message}`);
      return `❌ Failed to search for music: ${error.message}`;
    }
  }
};