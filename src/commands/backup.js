/**
 * Backup Command
 * Backup, restore, and migrate Knight data
 */

const backupService = require('../services/backupService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'backup',
  aliases: ['migrate', 'export', 'restore'],
  category: 'utility',
  description: 'Backup and restore Knight data',
  usage: '!backup <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `🛡️ *Knight Backup & Migration*
        
Available subcommands:
▫️ help - Show this help
▫️ create - Create a backup
▫️ list - List available backups
▫️ restore <filename> - Restore from backup
▫️ delete <filename> - Delete a backup
▫️ info <filename> - Show backup information

Examples:
!backup create
!backup create --encrypt
!backup list
!backup restore backup_2025-01-01-12-00-00.json
!backup delete backup_2025-01-01-12-00-00.json

⚠️ Note: Some operations may require admin privileges`;

      case 'create':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: '🔄 Creating backup...' 
          });
          
          const encrypt = args.includes('--encrypt') || args.includes('-e');
          const options = { encrypt };
          
          const backup = await backupService.createBackup(userId, options);
          
          return `✅ *Backup Created Successfully!*
          
🆔 ID: ${backup.id}
📁 Filename: ${backup.filename}
📏 Size: ${backupService.formatBytes(backup.size)}
📅 Created: ${new Date(backup.timestamp).toLocaleString()}
🔒 Encrypted: ${backup.encrypted ? 'Yes' : 'No'}

💾 Backup saved to: ${backup.filepath}`;
        } catch (error) {
          Logger.error(`Backup creation error: ${error.message}`);
          return `❌ Failed to create backup: ${error.message}`;
        }

      case 'list':
        try {
          const backups = await backupService.listBackups();
          
          if (backups.length === 0) {
            return '🛡️ No backups found.';
          }
          
          let response = `🛡️ *Available Backups* (${backups.length})\n\n`;
          
          backups.slice(0, 10).forEach((backup, index) => {
            response += `${index + 1}. ${backup.filename}
📏 ${backupService.formatBytes(backup.size)}
📅 ${new Date(backup.created).toLocaleDateString()}
🔒 ${backup.encrypted ? 'Encrypted' : 'Plain'}\n\n`;
          });
          
          if (backups.length > 10) {
            response += `... and ${backups.length - 10} more backups`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Backup listing error: ${error.message}`);
          return `❌ Failed to list backups: ${error.message}`;
        }

      case 'restore':
        if (args.length < 2) {
          return '❌ Usage: !backup restore <filename>';
        }
        
        try {
          const filename = args[1];
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Restoring from ${filename}...` 
          });
          
          const result = await backupService.restoreBackup(filename);
          
          return `✅ *Backup Restored Successfully!*
          
📅 Restored at: ${new Date(result.restoredAt).toLocaleString()}
📊 Items restored: ${result.itemsRestored}`;
        } catch (error) {
          Logger.error(`Backup restoration error: ${error.message}`);
          return `❌ Failed to restore backup: ${error.message}`;
        }

      case 'delete':
        if (args.length < 2) {
          return '❌ Usage: !backup delete <filename>';
        }
        
        try {
          const filename = args[1];
          const deleted = await backupService.deleteBackup(filename);
          
          return deleted ? 
            `✅ Backup ${filename} deleted successfully` : 
            `❌ Failed to delete backup ${filename}`;
        } catch (error) {
          Logger.error(`Backup deletion error: ${error.message}`);
          return `❌ Failed to delete backup: ${error.message}`;
        }

      case 'info':
        if (args.length < 2) {
          return '❌ Usage: !backup info <filename>';
        }
        
        try {
          const filename = args[1];
          const filepath = path.join(backupService.backupDir, filename);
          
          if (!fs.existsSync(filepath)) {
            return `❌ Backup file ${filename} not found`;
          }
          
          const stats = fs.statSync(filepath);
          const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          
          return `🛡️ *Backup Information*
          
📁 Filename: ${filename}
📏 Size: ${backupService.formatBytes(stats.size)}
📅 Created: ${new Date(stats.birthtime).toLocaleString()}
🕒 Modified: ${new Date(stats.mtime).toLocaleString()}
🔒 Encrypted: ${backupData.encrypted ? 'Yes' : 'No'}
🔢 Version: ${backupData.version || 'Unknown'}
🆔 ID: ${backupData.id || 'Unknown'}`;
        } catch (error) {
          Logger.error(`Backup info error: ${error.message}`);
          return `❌ Failed to get backup info: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !backup help for available commands`;
    }
  }
};