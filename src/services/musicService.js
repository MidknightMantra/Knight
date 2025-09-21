/**
 * Knight Music Service
 * Enhanced music search without external APIs
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class MusicService {
  constructor() {
    this.downloadDir = path.join(__dirname, '..', '..', 'downloads', 'music');
    this.ensureDownloadDirectory();
    this.localDatabase = this.loadLocalDatabase();
  }

  ensureDownloadDirectory() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  loadLocalDatabase() {
    // Expanded local music database
    return [
      // Pop
      { title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', genre: 'Pop', year: 2017, duration: '4:41' },
      { title: 'Shape of You', artist: 'Ed Sheeran', genre: 'Pop', year: 2017, duration: '3:53' },
      { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', genre: 'Pop', year: 2014, duration: '4:30' },
      { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop', year: 2019, duration: '3:20' },
      { title: 'Someone Like You', artist: 'Adele', genre: 'Pop', year: 2011, duration: '4:45' },
      
      // Hip-Hop/Rap
      { title: 'God is a Woman', artist: 'Ariana Grande', genre: 'Hip-Hop', year: 2018, duration: '3:17' },
      { title: 'Sicko Mode', artist: 'Travis Scott', genre: 'Hip-Hop', year: 2018, duration: '5:12' },
      { title: 'HUMBLE.', artist: 'Kendrick Lamar', genre: 'Hip-Hop', year: 2017, duration: '2:57' },
      
      // Rock
      { title: 'Sweet but Psycho', artist: 'Ava Max', genre: 'Rock', year: 2018, duration: '3:07' },
      { title: 'Believer', artist: 'Imagine Dragons', genre: 'Rock', year: 2017, duration: '3:24' },
      
      // Electronic/Dance
      { title: 'Titanium', artist: 'David Guetta ft. Sia', genre: 'Electronic', year: 2011, duration: '4:05' },
      { title: 'Lean On', artist: 'Major Lazer & DJ Snake ft. MØ', genre: 'Electronic', year: 2015, duration: '2:56' },
      
      // R&B
      { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', genre: 'R&B', year: 2021, duration: '2:21' },
      { title: 'Best Part', artist: 'Daniel Caesar ft. H.E.R.', genre: 'R&B', year: 2017, duration: '3:30' },
      
      // Afrobeats
      { title: 'Ohangla', artist: 'Various Artists', genre: 'Afrobeats', year: 2020, duration: '3:45' },
      { title: 'Calm Down', artist: 'Rema', genre: 'Afrobeats', year: 2022, duration: '3:40' },
      { title: 'Essence', artist: 'Wizkid ft. Tems', genre: 'Afrobeats', year: 2021, duration: '4:12' },
      
      // Reggae
      { title: 'One Dance', artist: 'Drake ft. Wizkid & Kyla', genre: 'Reggae', year: 2016, duration: '2:54' },
      
      // Country
      { title: 'Old Town Road', artist: 'Lil Nas X ft. Billy Ray Cyrus', genre: 'Country', year: 2019, duration: '2:37' }
    ];
  }

  searchLocalDatabase(query) {
    const results = this.localDatabase.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase()) ||
      song.genre.toLowerCase().includes(query.toLowerCase())
    );
    
    return results.map((song, index) => ({
      id: `local_${index}`,
      title: song.title,
      artist: song.artist,
      album: `${song.artist} - Greatest Hits`,
      duration: song.duration,
      source: 'local',
      url: `https://youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + song.artist)}`,
      thumbnail: 'https://example.com/music-placeholder.jpg',
      genre: song.genre,
      year: song.year,
      popularity: Math.floor(Math.random() * 100) + 1
    }));
  }

  async scrapeMusicSearch(query) {
    try {
      // Simulated scraping results - in real implementation, you would use libraries like puppeteer or cheerio
      Logger.info(`Scraping music for: ${query}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate realistic scraping results
      const artists = ['Various Artists', 'Popular Artist', 'Indie Band', 'Local Musician', 'Cover Artist'];
      const durations = ['3:45', '4:12', '2:58', '5:23', '3:33'];
      const genres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'R&B', 'Afrobeats'];
      
      const results = [];
      for (let i = 1; i <= 5; i++) {
        results.push({
          id: `scrape_${i}`,
          title: `${query} - Option ${i}`,
          artist: artists[Math.floor(Math.random() * artists.length)],
          album: `Album ${String.fromCharCode(64 + i)}`,
          duration: durations[Math.floor(Math.random() * durations.length)],
          source: 'scrape',
          url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}&page=${i}`,
          thumbnail: `https://example.com/thumb${i}.jpg`,
          genre: genres[Math.floor(Math.random() * genres.length)],
          year: 2020 + Math.floor(Math.random() * 5),
          popularity: Math.floor(Math.random() * 100) + 1
        });
      }
      
      return results;
    } catch (error) {
      Logger.error(`Scraping failed: ${error.message}`);
      return this.getFallbackResults(query);
    }
  }

  getFallbackResults(query) {
    // Provide basic fallback results when other methods fail
    return [
      {
        id: 'fallback_1',
        title: `${query} - Official Audio`,
        artist: 'Various Artists',
        album: 'Popular Hits Collection',
        duration: '3:30',
        source: 'fallback',
        url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}`,
        thumbnail: 'https://example.com/fallback-music.jpg',
        genre: 'Pop',
        year: new Date().getFullYear(),
        popularity: 50
      },
      {
        id: 'fallback_2',
        title: `${query} - Cover Version`,
        artist: 'Cover Artist',
        album: 'Cover Songs',
        duration: '4:15',
        source: 'fallback',
        url: `https://youtube.com/results?search_query=${encodeURIComponent(query + ' cover')}`,
        thumbnail: 'https://example.com/fallback-cover.jpg',
        genre: 'Pop',
        year: new Date().getFullYear() - 1,
        popularity: 30
      }
    ];
  }

  async searchMusic(query, method = 'local') {
    try {
      Logger.info(`Searching for music: ${query} using method: ${method}`);
      
      let results = [];
      
      switch (method) {
        case 'local':
          results = this.searchLocalDatabase(query);
          break;
          
        case 'scrape':
          results = await this.scrapeMusicSearch(query);
          break;
          
        case 'all':
        default:
          // Try local first
          results = this.searchLocalDatabase(query);
          // If no results, try scraping
          if (results.length === 0) {
            results = await this.scrapeMusicSearch(query);
          }
          break;
      }
      
      // Sort by popularity
      results.sort((a, b) => b.popularity - a.popularity);
      
      return results.slice(0, 10); // Return top 10 results
      
    } catch (error) {
      Logger.error(`Music search failed: ${error.message}`);
      return this.getFallbackResults(query);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupOldDownloads(maxAge = 24 * 60 * 60 * 1000) {
    try {
      if (!fs.existsSync(this.downloadDir)) return;
      
      const files = fs.readdirSync(this.downloadDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filepath = path.join(this.downloadDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          Logger.info(`Cleaned up old music download: ${file}`);
        }
      });
    } catch (error) {
      Logger.error(`Failed to cleanup music downloads: ${error.message}`);
    }
  }

  // Enhanced search with multiple sources
  async enhancedSearch(query, sources = ['local']) {
    try {
      const allResults = [];
      
      // Search multiple sources
      for (const source of sources) {
        Logger.info(`Searching ${source} for: ${query}`);
        
        let sourceResults = [];
        switch (source) {
          case 'local':
            sourceResults = this.searchLocalDatabase(query);
            break;
          case 'scrape':
            sourceResults = await this.scrapeMusicSearch(query);
            break;
          default:
            sourceResults = this.searchLocalDatabase(query);
        }
        
        sourceResults.forEach(result => {
          result.source = source;
          allResults.push(result);
        });
      }
      
      // Sort by popularity and return top results
      allResults.sort((a, b) => b.popularity - a.popularity);
      return allResults.slice(0, 15);
    } catch (error) {
      Logger.error(`Enhanced search failed: ${error.message}`);
      return this.getFallbackResults(query);
    }
  }
}

module.exports = new MusicService();