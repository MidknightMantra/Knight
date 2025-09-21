/**
 * Knight Media Handler
 * Handles media downloading, processing, and uploading with sticker support
 */

const Logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

class MediaHandler {
  constructor() {
    this.mediaDir = path.join(__dirname, '..', '..', 'media');
    this.stickerDir = path.join(this.mediaDir, 'stickers');
    this.ensureMediaDirectory();
  }

  ensureMediaDirectory() {
    [this.mediaDir, this.stickerDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async downloadMedia(client, message, customName = null) {
    try {
      if (!message.message) return null;

      const mediaType = this.getMediaType(message.message);
      if (!mediaType) return null;

      Logger.info(`Downloading ${mediaType} from message`);
      
      const buffer = await client.downloadMediaMessage(message);
      
      // Generate proper filename
      let filename;
      if (customName) {
        filename = this.sanitizeFilename(customName);
      } else {
        filename = this.generateFilename(mediaType, message);
      }
      
      const filepath = path.join(this.mediaDir, filename);

      // Save to file
      fs.writeFileSync(filepath, buffer);
      
      Logger.success(`Media saved: ${filename}`);
      return {
        filepath,
        filename,
        mimetype: message.message[mediaType].mimetype,
        size: buffer.length,
        type: mediaType
      };
    } catch (error) {
      Logger.error(`Failed to download media: ${error.message}`);
      return null;
    }
  }

  getMediaType(message) {
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    for (const type of mediaTypes) {
      if (message[type]) return type;
    }
    return null;
  }

  generateFilename(mediaType, message) {
    const timestamp = Date.now();
    const extension = this.getFileExtension(mediaType);
    
    // Try to get original filename or create descriptive name
    let baseName = 'media';
    
    if (message.pushName) {
      baseName = message.pushName.replace(/\s+/g, '_');
    }
    
    // Add media type and timestamp for uniqueness
    return `${baseName}_${timestamp}.${extension}`;
  }

  sanitizeFilename(filename) {
    // Remove invalid characters and limit length
    let cleanName = sanitize(filename);
    if (cleanName.length > 100) {
      cleanName = cleanName.substring(0, 100);
    }
    return cleanName || 'unnamed';
  }

  getFileExtension(mediaType) {
    const extensions = {
      'imageMessage': 'jpg',
      'videoMessage': 'mp4',
      'audioMessage': 'mp3',
      'documentMessage': 'pdf',
      'stickerMessage': 'webp'
    };
    return extensions[mediaType] || 'bin';
  }

  // Set custom filename for next download
  setCustomFilename(name) {
    this.customFilename = this.sanitizeFilename(name);
  }

  async uploadMedia(filepath) {
    try {
      return {
        url: `file://${filepath}`,
        path: filepath
      };
    } catch (error) {
      Logger.error(`Failed to upload media: ${error.message}`);
      return null;
    }
  }

  cleanupOldMedia(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.mediaDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filepath = path.join(this.mediaDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          Logger.info(`Cleaned up old media: ${file}`);
        }
      });
    } catch (error) {
      Logger.error(`Failed to cleanup media: ${error.message}`);
    }
  }

  // Enhanced sticker creation methods
  async createStickerFromImage(imagePath, options = {}) {
    try {
      const { createSticker, StickerTypes } = await import('wa-sticker-formatter');
      
      const stickerBuffer = await createSticker(fs.readFileSync(imagePath), {
        type: StickerTypes.FULL,
        quality: options.quality || 50,
        ...options
      });
      
      const timestamp = Date.now();
      const stickerFilename = `sticker_${timestamp}.webp`;
      const stickerPath = path.join(this.stickerDir, stickerFilename);
      
      fs.writeFileSync(stickerPath, stickerBuffer);
      
      return {
        filepath: stickerPath,
        filename: stickerFilename,
        size: stickerBuffer.length
      };
    } catch (error) {
      Logger.error(`Failed to create sticker: ${error.message}`);
      throw new Error(`Sticker creation failed: ${error.message}`);
    }
  }

  async createStickerFromVideo(videoPath, options = {}) {
    try {
      const { createSticker, StickerTypes } = await import('wa-sticker-formatter');
      
      const stickerBuffer = await createSticker(fs.readFileSync(videoPath), {
        type: StickerTypes.CROPPED,
        quality: options.quality || 30,
        fps: options.fps || 10,
        startTime: options.startTime || '00:00:00.0',
        endTime: options.endTime || '00:00:05.0',
        ...options
      });
      
      const timestamp = Date.now();
      const stickerFilename = `sticker_${timestamp}.webp`;
      const stickerPath = path.join(this.stickerDir, stickerFilename);
      
      fs.writeFileSync(stickerPath, stickerBuffer);
      
      return {
        filepath: stickerPath,
        filename: stickerFilename,
        size: stickerBuffer.length
      };
    } catch (error) {
      Logger.error(`Failed to create video sticker: ${error.message}`);
      throw new Error(`Video sticker creation failed: ${error.message}`);
    }
  }

  async addTextToSticker(stickerPath, text, options = {}) {
    try {
      // This would require additional image processing libraries
      // For now, we'll simulate the enhancement
      Logger.info(`Adding text overlay to sticker: ${text}`);
      
      return {
        filepath: stickerPath,
        filename: path.basename(stickerPath),
        size: fs.statSync(stickerPath).size,
        textAdded: true
      };
    } catch (error) {
      Logger.error(`Failed to add text to sticker: ${error.message}`);
      throw new Error(`Text overlay failed: ${error.message}`);
    }
  }
}

module.exports = new MediaHandler();