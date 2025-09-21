/**
 * Knight Backup Service
 * Data backup, migration, and restore functionality
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Logger = require('../utils/logger');
const database = require('../database');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', '..', 'backups');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(userId = null, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_${timestamp}`;
      const filename = `${backupId}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      Logger.info(`Creating backup: ${filename}`);
      
      // Collect backup data
      const backupData = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        userId: userId,
        data: {}
      };
      
      // Backup user data
      if (userId) {
        backupData.data.user = await database.getUser(userId);
        backupData.data.userSettings = await this.getUserSettings(userId);
      } else {
        // Backup all users (admin only)
        backupData.data.users = await database.db.all('SELECT * FROM users');
        backupData.data.groups = await database.db.all('SELECT * FROM groups');
      }
      
      // Backup settings
      backupData.data.settings = await this.getAllSettings();
      
      // Backup command statistics
      backupData.data.commandStats = await database.db.all('SELECT * FROM command_stats LIMIT 1000');
      
      // Backup download history
      backupData.data.downloadHistory = await database.db.all('SELECT * FROM download_history LIMIT 1000');
      
      // Backup scheduled messages
      backupData.data.scheduledMessages = await database.db.all('SELECT * FROM scheduled_messages');
      
      // Optionally encrypt backup
      let finalData = backupData;
      if (options.encrypt) {
        finalData = await this.encryptBackup(backupData, options.password);
      }
      
      // Write backup file
      fs.writeFileSync(filepath, JSON.stringify(finalData, null, 2));
      
      // Return backup info
      const stats = fs.statSync(filepath);
      return {
        id: backupId,
        filename: filename,
        filepath: filepath,
        size: stats.size,
        timestamp: backupData.timestamp,
        encrypted: options.encrypt || false
      };
    } catch (error) {
      Logger.error(`Backup creation failed: ${error.message}`);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async restoreBackup(filename, options = {}) {
    try {
      const filepath = path.join(this.backupDir, filename);
      
      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file not found');
      }
      
      Logger.info(`Restoring backup: ${filename}`);
      
      // Read backup file
      let backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Decrypt if encrypted
      if (backupData.encrypted && options.password) {
        backupData = await this.decryptBackup(backupData, options.password);
      }
      
      // Validate backup
      if (!backupData.version || backupData.version !== '1.0') {
        throw new Error('Invalid or unsupported backup version');
      }
      
      // Restore data
      await this.restoreData(backupData.data, options);
      
      return {
        success: true,
        restoredAt: new Date().toISOString(),
        itemsRestored: Object.keys(backupData.data).length
      };
    } catch (error) {
      Logger.error(`Backup restoration failed: ${error.message}`);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async getUserSettings(userId) {
    try {
      const settings = {};
      // This would fetch user-specific settings
      // For now, we'll simulate with some common settings
      const userLang = await database.getSetting(`user_${userId}_language`);
      if (userLang) settings.language = userLang;
      
      return settings;
    } catch (error) {
      return {};
    }
  }

  async getAllSettings() {
    try {
      const settings = await database.db.all('SELECT * FROM settings');
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      return settingsObj;
    } catch (error) {
      return {};
    }
  }

  async restoreData(data, options = {}) {
    try {
      // Restore users
      if (data.users && !options.skipUsers) {
        for (const user of data.users) {
          try {
            await database.db.run(`
              INSERT OR REPLACE INTO users (jid, name, commands_used, downloads_made, first_seen, last_seen)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              user.jid, user.name, user.commands_used, user.downloads_made, user.first_seen, user.last_seen
            ]);
          } catch (error) {
            Logger.warn(`Failed to restore user ${user.jid}: ${error.message}`);
          }
        }
      }
      
      // Restore groups
      if (data.groups && !options.skipGroups) {
        for (const group of data.groups) {
          try {
            await database.db.run(`
              INSERT OR REPLACE INTO groups (jid, name, commands_used, created_at)
              VALUES (?, ?, ?, ?)
            `, [group.jid, group.name, group.commands_used, group.created_at]);
          } catch (error) {
            Logger.warn(`Failed to restore group ${group.jid}: ${error.message}`);
          }
        }
      }
      
      // Restore settings
      if (data.settings && !options.skipSettings) {
        for (const [key, value] of Object.entries(data.settings)) {
          try {
            await database.setSetting(key, value);
          } catch (error) {
            Logger.warn(`Failed to restore setting ${key}: ${error.message}`);
          }
        }
      }
      
      Logger.info('Data restoration completed');
    } catch (error) {
      Logger.error(`Data restoration failed: ${error.message}`);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          
          backups.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            encrypted: backupData.encrypted || false,
            timestamp: backupData.timestamp
          });
        }
      }
      
      // Sort by creation time (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return backups;
    } catch (error) {
      Logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  async deleteBackup(filename) {
    try {
      const filepath = path.join(this.backupDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        Logger.info(`Deleted backup: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error(`Failed to delete backup: ${error.message}`);
      return false;
    }
  }

  async encryptBackup(data, password) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'backup', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
        algorithm: algorithm
      };
    } catch (error) {
      Logger.error(`Backup encryption failed: ${error.message}`);
      throw new Error('Failed to encrypt backup');
    }
  }

  async decryptBackup(encryptedData, password) {
    try {
      if (!encryptedData.encrypted) {
        return encryptedData;
      }
      
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'backup', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      Logger.error(`Backup decryption failed: ${error.message}`);
      throw new Error('Failed to decrypt backup - incorrect password or corrupted file');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupOldBackups(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filepath);
            Logger.info(`Cleaned up old backup: ${file}`);
          }
        }
      });
    } catch (error) {
      Logger.error(`Failed to cleanup backups: ${error.message}`);
    }
  }
}

module.exports = new BackupService();