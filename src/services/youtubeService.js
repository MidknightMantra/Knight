/**
 * Knight YouTube Download Service
 * Handles actual YouTube video/audio downloading with proper filenames
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const Logger = require('../utils/logger');

class YouTubeService {
  constructor() {
    this.downloadDir = path.join(__dirname, '..', '..', 'downloads');
    this.ensureDownloadDirectory();
  }

  ensureDownloadDirectory() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async getVideoInfo(url) {
    try {
      const { default: ytDlp } = await import('yt-dlp-exec');
      
      const info = await ytDlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true
      });
      
      return {
        title: info.title,
        duration: info.duration,
        uploader: info.uploader,
        views: info.view_count,
        thumbnail: info.thumbnail,
        formats: info.formats || [],
        id: info.id
      };
    } catch (error) {
      Logger.error(`Failed to get video info: ${error.message}`);
      throw new Error('Failed to fetch video information');
    }
  }

  sanitizeFilename(title, maxLength = 100) {
    // Remove invalid characters and limit length
    let cleanName = sanitize(title);
    if (cleanName.length > maxLength) {
      cleanName = cleanName.substring(0, maxLength);
    }
    return cleanName || 'youtube_download';
  }

  async downloadVideo(url, options = {}) {
    try {
      const { default: ytDlp } = await import('yt-dlp-exec');
      
      // Get video info first to use title in filename
      const videoInfo = await this.getVideoInfo(url);
      const format = options.format || 'best';
      const timestamp = Date.now();
      
      // Create filename based on title
      const baseFilename = this.sanitizeFilename(videoInfo.title);
      const filename = `${baseFilename}_${timestamp}`;
      const outputPath = path.join(this.downloadDir, filename);
      
      Logger.info(`Starting YouTube download: ${videoInfo.title}`);
      
      // Download with progress tracking
      await ytDlp(url, {
        output: outputPath,
        format: format,
        noWarnings: true,
        preferFreeFormats: true,
        progress: true
      });
      
      // Find the actual downloaded file (yt-dlp adds extension)
      const downloadedFiles = fs.readdirSync(this.downloadDir)
        .filter(file => file.startsWith(filename));
      
      if (downloadedFiles.length === 0) {
        throw new Error('Download completed but file not found');
      }
      
      const downloadedFile = downloadedFiles[0];
      const fullPath = path.join(this.downloadDir, downloadedFile);
      const stats = fs.statSync(fullPath);
      
      Logger.success(`Download completed: ${downloadedFile}`);
      
      return {
        filepath: fullPath,
        filename: downloadedFile,
        size: stats.size,
        timestamp: timestamp,
        title: videoInfo.title,
        uploader: videoInfo.uploader
      };
    } catch (error) {
      Logger.error(`YouTube download failed: ${error.message}`);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async downloadAudio(url, tryConversion = true) {
    try {
      const { default: ytDlp } = await import('yt-dlp-exec');
      
      // Get video info first to use title in filename
      const videoInfo = await this.getVideoInfo(url);
      const timestamp = Date.now();
      
      // Create filename based on title
      const baseFilename = this.sanitizeFilename(videoInfo.title);
      const filename = `${baseFilename}_audio_${timestamp}`;
      const outputPath = path.join(this.downloadDir, filename);
      
      Logger.info(`Starting YouTube audio download: ${videoInfo.title}`);
      
      if (tryConversion) {
        try {
          // Try with ffmpeg conversion first
          Logger.info('Attempting audio download with ffmpeg conversion...');
          await ytDlp(url, {
            output: outputPath,
            format: 'bestaudio/best',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '0',
            noWarnings: true,
            preferFreeFormats: true
          });
        } catch (conversionError) {
          // If ffmpeg conversion fails, fall back to original format
          Logger.warn(`FFmpeg conversion failed: ${conversionError.message}`);
          Logger.info('Falling back to original audio format download...');
          await ytDlp(url, {
            output: outputPath,
            format: 'bestaudio',
            noWarnings: true,
            preferFreeFormats: true
          });
        }
      } else {
        // Direct original format download
        await ytDlp(url, {
          output: outputPath,
          format: 'bestaudio',
          noWarnings: true,
          preferFreeFormats: true
        });
      }
      
      // Find the actual downloaded file
      const downloadedFiles = fs.readdirSync(this.downloadDir)
        .filter(file => file.startsWith(filename));
      
      if (downloadedFiles.length === 0) {
        throw new Error('Audio download completed but file not found');
      }
      
      const downloadedFile = downloadedFiles[0];
      const fullPath = path.join(this.downloadDir, downloadedFile);
      const stats = fs.statSync(fullPath);
      
      Logger.success(`Audio download completed: ${downloadedFile}`);
      
      return {
        filepath: fullPath,
        filename: downloadedFile,
        size: stats.size,
        timestamp: timestamp,
        title: videoInfo.title,
        uploader: videoInfo.uploader
      };
    } catch (error) {
      Logger.error(`YouTube audio download failed: ${error.message}`);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupOldDownloads(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const files = fs.readdirSync(this.downloadDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filepath = path.join(this.downloadDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          Logger.info(`Cleaned up old download: ${file}`);
        }
      });
    } catch (error) {
      Logger.error(`Failed to cleanup downloads: ${error.message}`);
    }
  }

  // Check if file is within WhatsApp size limits (100MB for most media)
  isWithinSizeLimit(size) {
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    return size <= maxSize;
  }

  // Get file extension and MIME type
  getFileTypeInfo(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mp3',
      '.webm': 'audio/webm',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };
    
    return {
      extension: ext,
      mimeType: mimeTypes[ext] || 'application/octet-stream'
    };
  }
}

module.exports = new YouTubeService();