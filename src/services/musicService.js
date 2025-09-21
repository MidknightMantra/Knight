/**
 * Knight Music Service
 * Handles music search and downloading from multiple sources
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class MusicService {
  constructor() {
    this.downloadDir = path.join(__dirname, '..', '..', 'downloads', 'music');
    this.ensureDownloadDirectory();
  }

  ensureDownloadDirectory() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async searchMusic(query) {
    try {
      // This would integrate with music APIs like Spotify, SoundCloud, etc.
      // For now, we'll simulate search results
      Logger.info(`Searching for music: ${query}`);
      
      // Simulated search results
      return [
        {
          id: '1',
          title: `${query} - Official Audio`,
          artist: 'Various Artists',
          duration: '3:45',
          source: 'youtube',
          url: 'https://youtube.com/watch?v=sample1'
        },
        {
          id: '2', 
          title: `${query} - Cover Version`,
          artist: 'Cover Artist',
          duration: '4:12',
          source: 'youtube',
          url: 'https://youtube.com/watch?v=sample2'
        },
        {
          id: '3',
          title: `${query} - Remix`,
          artist: 'Remix Artist',
          duration: '5:23',
          source: 'youtube', 
          url: 'https://youtube.com/watch?v=sample3'
        }
      ];
    } catch (error) {
      Logger.error(`Music search failed: ${error.message}`);
      throw new Error('Failed to search for music');
    }
  }

  async getMusicInfo(url) {
    try {
      // This would fetch actual metadata from music sources
      // For now, simulate music info
      return {
        title: 'Sample Music Title',
        artist: 'Sample Artist',
        album: 'Sample Album',
        duration: '3:45',
        thumbnail: 'https://example.com/thumbnail.jpg',
        genre: 'Pop'
      };
    } catch (error) {
      Logger.error(`Failed to get music info: ${error.message}`);
      throw new Error('Failed to fetch music information');
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
}

module.exports = new MusicService();