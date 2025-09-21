/**
 * Entertainment Command
 * Comprehensive movie and TV show tracking system
 */

const entertainmentService = require('../services/entertainmentService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'entertainment',
  aliases: ['movie', 'tv', 'show', 'film'],
  category: 'entertainment',
  description: 'Comprehensive movie and TV show tracking system',
  usage: '!entertainment <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `🎬 *Knight Entertainment Tracker*
        
Available subcommands:
▫️ help - Show this help
▫️ movie <title> [year] - Search for movies
▫️ tv <title> [year] - Search for TV shows
▫️ trending [type] [time] - Get trending movies/TV shows
▫️ upcoming [region] - Get upcoming movie releases
▫️ details <type> <id> - Get detailed information
▫️ watchlist - Show your watchlist
▫️ watchlist add <type> <id> - Add to watchlist
▫️ watchlist remove <id> - Remove from watchlist
▫️ watched - Show your watched list
▫️ watched add <type> <id> [rating] - Mark as watched
▫️ recommendations - Get personalized recommendations
▫️ remind <show_id> <season> <episode> <date> - Set episode reminder
▫️ reminders - Show your episode reminders
▫️ genres - Show available genres
▫️ top [type] [genre] - Get top-rated movies/TV shows
▫️ popular [type] - Get popular movies/TV shows
▫️ search <query> [type] - Advanced search

Examples:
!entertainment movie The Dark Knight
!entertainment tv Game of Thrones
!entertainment trending movie
!entertainment upcoming US
!entertainment details movie tt0468569
!entertainment watchlist
!entertainment watchlist add movie tt0111161
!entertainment watched
!entertainment watched add tv 1399 9.5
!entertainment recommendations
!entertainment remind 1399 8 6 2025-12-25
!entertainment reminders
!entertainment genres
!entertainment top movie action
!entertainment popular tv
!entertainment search star wars movie`;

      case 'movie':
        if (args.length < 2) {
          return `❌ Usage: !entertainment movie <title> [year]
          
Examples:
!entertainment movie The Dark Knight
!entertainment movie Avatar 2009
!entertainment movie Star Wars --year 1977
!entertainment movie Avengers --genre action`;
        }
        
        try {
          const title = args[1];
          const year = args[2] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Searching for movie: ${title}${year ? ` (${year})` : ''}...` 
          });
          
          const movies = await entertainmentService.searchMovies(title, { year });
          
          if (movies.length === 0) {
            return `🎬 No movies found for "${title}"${year ? ` (${year})` : ''}.`;
          }
          
          return entertainmentService.formatSearchResults(movies, 'movies');
        } catch (error) {
          Logger.error(`Entertainment movie search error: ${error.message}`);
          return `❌ Failed to search for movies: ${error.message}`;
        }

      case 'tv':
        if (args.length < 2) {
          return `❌ Usage: !entertainment tv <title> [year]
          
Examples:
!entertainment tv Game of Thrones
!entertainment tv Breaking Bad 2008
!entertainment tv Friends --genre comedy
!entertainment tv Stranger Things --year 2016`;
        }
        
        try {
          const title = args[1];
          const year = args[2] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Searching for TV show: ${title}${year ? ` (${year})` : ''}...` 
          });
          
          const tvShows = await entertainmentService.searchTVShows(title, { year });
          
          if (tvShows.length === 0) {
            return `📺 No TV shows found for "${title}"${year ? ` (${year})` : ''}.`;
          }
          
          return entertainmentService.formatSearchResults(tvShows, 'tv shows');
        } catch (error) {
          Logger.error(`Entertainment TV search error: ${error.message}`);
          return `❌ Failed to search for TV shows: ${error.message}`;
        }

      case 'trending':
        try {
          const mediaType = args[1] || 'all'; // all, movie, tv
          const timeWindow = args[2] || 'week'; // day, week
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting trending ${mediaType} for ${timeWindow}...` 
          });
          
          const trending = await entertainmentService.getTrending({ mediaType, timeWindow });
          
          if (trending.length === 0) {
            return `🎬 No trending ${mediaType} found for ${timeWindow}.`;
          }
          
          return entertainmentService.formatSearchResults(trending, `trending ${mediaType}`);
        } catch (error) {
          Logger.error(`Entertainment trending error: ${error.message}`);
          return `❌ Failed to get trending items: ${error.message}`;
        }

      case 'upcoming':
        try {
          const region = args[1] || 'US';
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting upcoming movies for ${region}...` 
          });
          
          const upcoming = await entertainmentService.getUpcomingMovies({ region });
          
          if (upcoming.length === 0) {
            return `🎬 No upcoming movies found for ${region}.`;
          }
          
          let response = `🎬 *Upcoming Movies* (${upcoming.length})\n\n`;
          
          upcoming.slice(0, 10).forEach((movie, index) => {
            response += `${index + 1}. ${movie.title}
📅 ${movie.releaseDate || 'TBA'}
⭐ ${movie.voteAverage ? `${movie.voteAverage}/10` : 'N/A'}
${movie.overview ? `${movie.overview.substring(0, 100)}${movie.overview.length > 100 ? '...' : ''}\n\n` : ''}`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Entertainment upcoming error: ${error.message}`);
          return `❌ Failed to get upcoming movies: ${error.message}`;
        }

      case 'details':
        if (args.length < 3) {
          return `❌ Usage: !entertainment details <type> <id>
          
Types: movie, tv
          
Examples:
!entertainment details movie tt0468569
!entertainment details tv 1399
!entertainment details movie 157336
!entertainment details tv 60735`;
        }
        
        try {
          const type = args[1].toLowerCase();
          const id = args[2];
          
          if (!['movie', 'tv'].includes(type)) {
            return '❌ Type must be "movie" or "tv".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting details for ${type}: ${id}...` 
          });
          
          let details;
          if (type === 'movie') {
            details = await entertainmentService.getMovieDetails(id);
          } else {
            details = await entertainmentService.getTVShowDetails(id);
          }
          
          if (type === 'movie') {
            return entertainmentService.formatMovie(details);
          } else {
            return entertainmentService.formatTVShow(details);
          }
        } catch (error) {
          Logger.error(`Entertainment details error: ${error.message}`);
          return `❌ Failed to get details: ${error.message}`;
        }

      case 'watchlist':
        try {
          const watchlist = await entertainmentService.getWatchlist(userId);
          
          return entertainmentService.formatWatchlist(watchlist);
        } catch (error) {
          Logger.error(`Entertainment watchlist error: ${error.message}`);
          return `❌ Failed to get watchlist: ${error.message}`;
        }

      case 'watchlist-add':
      case 'watchlist_add':
        if (args.length < 3) {
          return `❌ Usage: !entertainment watchlist add <type> <id>
          
Types: movie, tv
          
Examples:
!entertainment watchlist add movie tt0111161
!entertainment watchlist add tv 1399
!entertainment watchlist add movie 157336
!entertainment watchlist add tv 60735`;
        }
        
        try {
          const type = args[1].toLowerCase();
          const id = args[2];
          
          if (!['movie', 'tv'].includes(type)) {
            return '❌ Type must be "movie" or "tv".';
          }
          
          const watchlistId = await entertainmentService.addToWatchlist(userId, id, type);
          
          return `✅ Added to watchlist successfully!
🆔 ID: ${watchlistId}
🎬 ${type.toUpperCase()}: ${id}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Entertainment watchlist add error: ${error.message}`);
          return `❌ Failed to add to watchlist: ${error.message}`;
        }

      case 'watchlist-remove':
      case 'watchlist_remove':
        if (args.length < 2) {
          return '❌ Usage: !entertainment watchlist remove <id>';
        }
        
        try {
          const id = args[1];
          
          const success = await entertainmentService.removeFromWatchlist(userId, id);
          
          return success ? 
            `✅ Removed from watchlist successfully!` : 
            `❌ Failed to remove from watchlist. Item not found.`;
        } catch (error) {
          Logger.error(`Entertainment watchlist remove error: ${error.message}`);
          return `❌ Failed to remove from watchlist: ${error.message}`;
        }

      case 'watched':
        try {
          const watched = await entertainmentService.getWatched(userId);
          
          if (watched.length === 0) {
            return `✅ Your watched list is empty.
            
Mark items as watched with:
!entertainment watched add <type> <id> [rating]

Examples:
!entertainment watched add movie tt0111161 9.5
!entertainment watched add tv 1399 8.5`;
          }
          
          let response = `✅ *Your Watched List* (${watched.length})\n\n`;
          
          watched.slice(0, 15).forEach((item, index) => {
            response += `${index + 1}. ${item.media_id}
🎬 ${item.media_type.toUpperCase()} | ⭐ ${item.rating || 'N/A'}${item.rating ? '/10' : ''}
📅 Watched: ${new Date(item.watched_at).toLocaleDateString()}\n\n`;
          });
          
          if (watched.length > 15) {
            response += `... and ${watched.length - 15} more items`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Entertainment watched error: ${error.message}`);
          return `❌ Failed to get watched list: ${error.message}`;
        }

      case 'watched-add':
      case 'watched_add':
        if (args.length < 3) {
          return `❌ Usage: !entertainment watched add <type> <id> [rating]
          
Types: movie, tv
          
Examples:
!entertainment watched add movie tt0111161 9.5
!entertainment watched add tv 1399 8.5
!entertainment watched add movie 157336 7.8
!entertainment watched add tv 60735 9.2`;
        }
        
        try {
          const type = args[1].toLowerCase();
          const id = args[2];
          const rating = args[3] ? parseFloat(args[3]) : null;
          
          if (!['movie', 'tv'].includes(type)) {
            return '❌ Type must be "movie" or "tv".';
          }
          
          if (rating && (isNaN(rating) || rating < 0 || rating > 10)) {
            return '❌ Rating must be a number between 0 and 10.';
          }
          
          const success = await entertainmentService.markAsWatched(userId, id, type, rating);
          
          return success ? 
            `✅ Marked as watched successfully!
🎬 ${type.toUpperCase()}: ${id}
${rating ? `⭐ Rating: ${rating}/10` : ''}
📅 Watched: ${new Date().toLocaleString()}` : 
            `❌ Failed to mark as watched.`;
        } catch (error) {
          Logger.error(`Entertainment watched add error: ${error.message}`);
          return `❌ Failed to mark as watched: ${error.message}`;
        }

      case 'recommendations':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting personalized recommendations...` 
          });
          
          const recommendations = await entertainmentService.getRecommendations(userId);
          
          return entertainmentService.formatRecommendations(recommendations);
        } catch (error) {
          Logger.error(`Entertainment recommendations error: ${error.message}`);
          return `❌ Failed to get recommendations: ${error.message}`;
        }

      case 'remind':
        if (args.length < 5) {
          return `❌ Usage: !entertainment remind <show_id> <season> <episode> <air_date>
          
Example:
!entertainment remind 1399 8 6 2025-12-25`;
        }
        
        try {
          const showId = args[1];
          const seasonNumber = parseInt(args[2]);
          const episodeNumber = parseInt(args[3]);
          const airDate = args[4];
          
          if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
            return '❌ Season and episode must be numbers.';
          }
          
          if (!/^\d{4}-\d{2}-\d{2}$/.test(airDate)) {
            return '❌ Air date must be in YYYY-MM-DD format.';
          }
          
          const reminderId = await entertainmentService.setEpisodeReminder(userId, showId, seasonNumber, episodeNumber, airDate);
          
          return `✅ Episode reminder set successfully!
🆔 ID: ${reminderId}
📺 Show: ${showId}
シーズン ${seasonNumber} | Episode ${episodeNumber}
📅 Air Date: ${airDate}
⏰ Reminder will be sent before the episode airs.`;
        } catch (error) {
          Logger.error(`Entertainment remind error: ${error.message}`);
          return `❌ Failed to set episode reminder: ${error.message}`;
        }

      case 'reminders':
        try {
          const reminders = await entertainmentService.getEpisodeReminders(userId);
          
          if (reminders.length === 0) {
            return `⏰ No episode reminders set.
            
Set reminders with:
!entertainment remind <show_id> <season> <episode> <air_date>

Example:
!entertainment remind 1399 8 6 2025-12-25`;
          }
          
          let response = `⏰ *Your Episode Reminders* (${reminders.length})\n\n`;
          
          reminders.slice(0, 10).forEach((reminder, index) => {
            response += `${index + 1}. Show ${reminder.show_id}
シーズン ${reminder.season_number} | Episode ${reminder.episode_number}
📅 Air Date: ${new Date(reminder.air_date).toLocaleDateString()}
🆔 ${reminder.id}
📅 Set: ${new Date(reminder.created_at).toLocaleDateString()}\n\n`;
          });
          
          if (reminders.length > 10) {
            response += `... and ${reminders.length - 10} more reminders`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Entertainment reminders error: ${error.message}`);
          return `❌ Failed to get episode reminders: ${error.message}`;
        }

      case 'genres':
        try {
          const movieGenres = [
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 
            'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
            'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
            'TV Movie', 'Thriller', 'War', 'Western'
          ];
          
          const tvGenres = [
            'Action & Adventure', 'Animation', 'Comedy', 'Crime', 
            'Documentary', 'Drama', 'Family', 'Kids', 'Mystery',
            'News', 'Reality', 'Sci-Fi & Fantasy', 'Soap',
            'Talk', 'War & Politics', 'Western'
          ];
          
          let response = `🎭 *Available Genres*\n\n`;
          
          response += `🎬 *Movie Genres* (${movieGenres.length})\n`;
          response += movieGenres.map((genre, index) => `${index + 1}. ${genre}`).join('\n');
          response += `\n\n`;
          
          response += `📺 *TV Show Genres* (${tvGenres.length})\n`;
          response += tvGenres.map((genre, index) => `${index + 1}. ${genre}`).join('\n');
          
          response += `\n\n📝 Usage: !entertainment search <query> --genre <genre_name>
Example: !entertainment search superhero --genre Action`;
          
          return response;
        } catch (error) {
          Logger.error(`Entertainment genres error: ${error.message}`);
          return `❌ Failed to get genres: ${error.message}`;
        }

      case 'top':
        try {
          const type = args[1] || 'movie';
          const genre = args[2] || null;
          
          if (!['movie', 'tv'].includes(type)) {
            return '❌ Type must be "movie" or "tv".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting top ${type}${genre ? ` ${genre}` : ''}...` 
          });
          
          // This would fetch top-rated items from API
          // For now, we'll use local data
          const topItems = type === 'movie' ? 
            entertainmentService.searchMoviesLocal('all').slice(0, 10) :
            entertainmentService.searchTVShowsLocal('all').slice(0, 10);
          
          return entertainmentService.formatSearchResults(topItems, `top ${type}${genre ? ` ${genre}` : ''}`);
        } catch (error) {
          Logger.error(`Entertainment top error: ${error.message}`);
          return `❌ Failed to get top items: ${error.message}`;
        }

      case 'popular':
        try {
          const type = args[1] || 'movie';
          
          if (!['movie', 'tv'].includes(type)) {
            return '❌ Type must be "movie" or "tv".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting popular ${type}...` 
          });
          
          // This would fetch popular items from API
          // For now, we'll use local data
          const popularItems = type === 'movie' ? 
            entertainmentService.searchMoviesLocal('all').slice(0, 10) :
            entertainmentService.searchTVShowsLocal('all').slice(0, 10);
          
          return entertainmentService.formatSearchResults(popularItems, `popular ${type}`);
        } catch (error) {
          Logger.error(`Entertainment popular error: ${error.message}`);
          return `❌ Failed to get popular items: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return `❌ Usage: !entertainment search <query> [type] [filters]
          
Types: movie, tv
Filters: --year <year>, --genre <genre>, --rating <min_rating>
          
Examples:
!entertainment search batman movie
!entertainment search friends tv --year 1994
!entertainment search superhero --genre Action --rating 7.5
!entertainment search horror movie --year 2025`;
        }
        
        try {
          const query = args[1];
          const type = args[2] || 'all';
          
          // Parse filters
          const filters = {};
          for (let i = 2; i < args.length; i++) {
            if (args[i] === '--year' && args[i + 1]) {
              filters.year = args[i + 1];
              i++;
            } else if (args[i] === '--genre' && args[i + 1]) {
              filters.genre = args[i + 1];
              i++;
            } else if (args[i] === '--rating' && args[i + 1]) {
              filters.minRating = parseFloat(args[i + 1]);
              i++;
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Searching for ${type}: ${query}${filters.year ? ` (${filters.year})` : ''}...` 
          });
          
          let results;
          if (type === 'movie' || type === 'all') {
            results = await entertainmentService.searchMovies(query, filters);
          } else {
            results = await entertainmentService.searchTVShows(query, filters);
          }
          
          if (results.length === 0) {
            return `🎬 No ${type} found for "${query}"${filters.year ? ` (${filters.year})` : ''}.`;
          }
          
          return entertainmentService.formatSearchResults(results, type);
        } catch (error) {
          Logger.error(`Entertainment search error: ${error.message}`);
          return `❌ Failed to search: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !entertainment help for available commands`;
    }
  }
};