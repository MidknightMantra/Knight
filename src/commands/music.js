/**
 * Music Search & Download Command
 * Search and download music from multiple sources
 */

const musicService = require('../services/musicService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'music',
  aliases: ['song', 'audio'],
  category: 'media',
  description: 'Search and download music from multiple sources',
  usage: '!music <search_query> or !music <url>',
  
  async execute(client, message, args) {
    if (args.length === 0) {
      return `🎵 *Music Search & Download*
      
Usage: !music <search_query> or !music <url>

Examples:
!music ohangla
!music https://youtube.com/watch?v=xyz123
!music despacito

Features:
▫️ Search music from multiple sources
▫️ Download audio files
▫️ Get music metadata
▫️ Multiple quality options

Note: This is an enhanced version with search capabilities.`;
    }
    
    const query = args.join(' ');
    
    try {
      // Check if it's a URL
      if (query.includes('http')) {
        // Handle URL download (delegate to YouTube command for now)
        return `🎵 *Music URL Detected*
        
URL: ${query}

To download this music, please use:
!youtube ${query} audio

This will download the audio file directly!`;
      } else {
        // Handle search query
        await client.sendMessage(message.key.remoteJid, { 
          text: `🔄 Searching for music: "${query}"...` 
        });
        
        const searchResults = await musicService.searchMusic(query);
        
        if (searchResults.length === 0) {
          return `❌ No music found for "${query}". Try a different search term.`;
        }
        
        // Format search results
        let response = `🎵 *Music Search Results for "${query}"*\n\n`;
        
        searchResults.forEach((result, index) => {
          response += `${index + 1}. ${result.title}
👤 Artist: ${result.artist}
⏱️ Duration: ${result.duration}
🔗 Source: ${result.source}
💡 Download: !youtube ${result.url} audio\n\n`;
        });
        
        response += `📱 *To download:* Use the !youtube command with any link above
Example: !youtube ${searchResults[0].url} audio`;
        
        return response;
      }
    } catch (error) {
      Logger.error(`Music command error: ${error.message}`);
      return `❌ Failed to process music request: ${error.message}`;
    }
  }
};