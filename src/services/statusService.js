/**
 * Knight Status Service
 * WhatsApp status viewing and management
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const database = require('../database');

class StatusService {
  constructor() {
    this.statusDir = path.join(__dirname, '..', '..', 'statuses');
    this.ensureStatusDirectory();
  }

  ensureStatusDirectory() {
    if (!fs.existsSync(this.statusDir)) {
      fs.mkdirSync(this.statusDir, { recursive: true });
    }
  }

  async trackStatusView(message) {
    try {
      const statusData = {
        id: message.key.id,
        from: message.key.participant || message.key.remoteJid,
        timestamp: new Date().toISOString(),
        messageType: message.message ? Object.keys(message.message)[0] : 'unknown',
        hasMedia: !!(message.message?.imageMessage || message.message?.videoMessage),
        viewedAt: Date.now()
      };
      
      // Store in database
      await database.db.run(`
        INSERT OR REPLACE INTO status_views 
        (status_id, user_jid, viewed_at, has_media, message_type)
        VALUES (?, ?, ?, ?, ?)
      `, [
        statusData.id,
        statusData.from,
        statusData.viewedAt,
        statusData.hasMedia ? 1 : 0,
        statusData.messageType
      ]);
      
      Logger.info(`📊 Status tracked: ${statusData.from}`);
      return statusData;
    } catch (error) {
      Logger.error(`Failed to track status view: ${error.message}`);
      return null;
    }
  }

  async downloadStatusMedia(client, message) {
    try {
      // Download media from status
      const buffer = await client.downloadMediaMessage(message);
      
      // Generate filename
      const timestamp = Date.now();
      const mediaType = message.message?.imageMessage ? 'image' : 'video';
      const extension = message.message?.imageMessage ? 'jpg' : 'mp4';
      const filename = `status_${timestamp}.${extension}`;
      const filepath = path.join(this.statusDir, filename);
      
      // Save to file
      fs.writeFileSync(filepath, buffer);
      
      // Update database
      await database.db.run(`
        INSERT INTO status_media 
        (status_id, filepath, filename, media_type, downloaded_at, user_jid)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        message.key.id,
        filepath,
        filename,
        mediaType,
        Date.now(),
        message.key.participant || message.key.remoteJid
      ]);
      
      Logger.success(`📥 Status media downloaded: ${filename}`);
      return {
        filepath,
        filename,
        size: buffer.length,
        type: mediaType
      };
    } catch (error) {
      Logger.error(`Failed to download status media: ${error.message}`);
      return null;
    }
  }

  async getStatusHistory(limit = 20) {
    try {
      const history = await database.db.all(`
        SELECT sv.*, sm.filename as media_filename, u.name as user_name
        FROM status_views sv
        LEFT JOIN status_media sm ON sv.status_id = sm.status_id
        LEFT JOIN users u ON sv.user_jid = u.jid
        ORDER BY sv.viewed_at DESC
        LIMIT ?
      `, [limit]);
      
      return history;
    } catch (error) {
      Logger.error(`Failed to get status history: ${error.message}`);
      return [];
    }
  }

  async getRecentStatuses(userId = null, limit = 10) {
    try {
      let query = `
        SELECT DISTINCT sv.user_jid, u.name, COUNT(sv.status_id) as status_count, 
               MAX(sv.viewed_at) as last_status, 
               GROUP_CONCAT(sm.media_type) as media_types
        FROM status_views sv
        LEFT JOIN users u ON sv.user_jid = u.jid
        LEFT JOIN status_media sm ON sv.status_id = sm.status_id
        WHERE sv.viewed_at > datetime('now', '-24 hours')
      `;
      
      const params = [];
      
      if (userId) {
        query += ' AND sv.user_jid = ?';
        params.push(userId);
      }
      
      query += `
        GROUP BY sv.user_jid, u.name
        ORDER BY last_status DESC
        LIMIT ?
      `;
      params.push(limit);
      
      const recent = await database.db.all(query, params);
      return recent;
    } catch (error) {
      Logger.error(`Failed to get recent statuses: ${error.message}`);
      return [];
    }
  }

  async getMediaStatuses(limit = 10) {
    try {
      const mediaStatuses = await database.db.all(`
        SELECT sm.*, sv.viewed_at, u.name as user_name
        FROM status_media sm
        JOIN status_views sv ON sm.status_id = sv.status_id
        LEFT JOIN users u ON sv.user_jid = u.jid
        ORDER BY sm.downloaded_at DESC
        LIMIT ?
      `, [limit]);
      
      return mediaStatuses;
    } catch (error) {
      Logger.error(`Failed to get media statuses: ${error.message}`);
      return [];
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupOldStatuses(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const files = fs.readdirSync(this.statusDir);
      const now = Date.now();
      
      files.forEach(file => {
        if (file.startsWith('status_')) {
          const filepath = path.join(this.statusDir, file);
          const stats = fs.statSync(filepath);
          
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filepath);
            Logger.info(`Cleaned up old status: ${file}`);
          }
        }
      });
    } catch (error) {
      Logger.error(`Failed to cleanup statuses: ${error.message}`);
    }
  }
}

module.exports = new StatusService();