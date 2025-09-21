/**
 * Status Command
 * View and manage WhatsApp status updates
 */

const statusService = require('../services/statusService');
const fs = require('fs');
const Logger = require('../utils/logger');

module.exports = {
  name: 'status',
  aliases: ['story', 'stories'],
  category: 'media',
  description: 'View and manage WhatsApp status updates',
  usage: '!status <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'recent';
    
    switch (subcommand) {
      case 'help':
        return `📱 *Knight Status Viewer*
        
Available subcommands:
▫️ help - Show this help
▫️ recent - Show recent status updates
▫️ history - Show status viewing history
▫️ media - Show downloaded status media
▫️ stats - Show status statistics
▫️ cleanup - Clean up old status files

Examples:
!status recent
!status history
!status media
!status stats`;

      case 'recent':
        try {
          const recentStatuses = await statusService.getRecentStatuses(null, 10);
          
          if (recentStatuses.length === 0) {
            return '📱 No recent statuses found.';
          }
          
          let response = `📱 *Recent Status Updates* (${recentStatuses.length})\n\n`;
          
          recentStatuses.forEach((status, index) => {
            const userName = status.name || status.user_jid.split('@')[0];
            const mediaTypes = status.media_types ? status.media_types.split(',').filter(t => t).length : 0;
            const lastSeen = new Date(status.last_status).toLocaleTimeString();
            
            response += `${index + 1}. ${userName}
📊 ${status.status_count} status${status.status_count > 1 ? 'es' : ''}
📎 ${mediaTypes} media file${mediaTypes !== 1 ? 's' : ''}
⏰ ${lastSeen}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Status recent error: ${error.message}`);
          return `❌ Failed to get recent statuses: ${error.message}`;
        }

      case 'history':
        try {
          const history = await statusService.getStatusHistory(15);
          
          if (history.length === 0) {
            return '📱 No status viewing history found.';
          }
          
          let response = `📱 *Status Viewing History* (${history.length})\n\n`;
          
          history.slice(0, 10).forEach((status, index) => {
            const userName = status.user_name || status.user_jid.split('@')[0];
            const mediaMark = status.has_media ? '📎' : '💬';
            const time = new Date(status.viewed_at).toLocaleTimeString();
            
            response += `${index + 1}. ${mediaMark} ${userName}
⏰ ${time}
📝 ${status.message_type}\n\n`;
          });
          
          if (history.length > 10) {
            response += `... and ${history.length - 10} more`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Status history error: ${error.message}`);
          return `❌ Failed to get status history: ${error.message}`;
        }

      case 'media':
        try {
          const mediaStatuses = await statusService.getMediaStatuses(10);
          
          if (mediaStatuses.length === 0) {
            return '📱 No status media downloaded.';
          }
          
          let response = `📱 *Downloaded Status Media* (${mediaStatuses.length})\n\n`;
          
          mediaStatuses.forEach((media, index) => {
            const userName = media.user_name || media.user_jid.split('@')[0];
            const mediaType = media.media_type === 'image' ? '📸' : '🎥';
            const size = statusService.formatBytes(fs.statSync(media.filepath).size);
            const time = new Date(media.downloaded_at).toLocaleTimeString();
            
            response += `${index + 1}. ${mediaType} ${userName}
📁 ${media.filename}
📏 ${size}
⏰ ${time}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Status media error: ${error.message}`);
          return `❌ Failed to get status media: ${error.message}`;
        }

      case 'stats':
        try {
          // Get statistics
          const totalViews = await database.db.get('SELECT COUNT(*) as count FROM status_views');
          const mediaDownloads = await database.db.get('SELECT COUNT(*) as count FROM status_media');
          const uniqueUsers = await database.db.get('SELECT COUNT(DISTINCT user_jid) as count FROM status_views');
          const recent24h = await database.db.get(`
            SELECT COUNT(*) as count 
            FROM status_views 
            WHERE viewed_at > datetime('now', '-24 hours')
          `);
          
          return `📱 *Status Statistics*
          
📊 Total Views: ${totalViews.count}
📎 Media Downloads: ${mediaDownloads.count}
👥 Unique Users: ${uniqueUsers.count}
⚡ Recent (24h): ${recent24h.count}`;
        } catch (error) {
          Logger.error(`Status stats error: ${error.message}`);
          return `❌ Failed to get status statistics: ${error.message}`;
        }

      case 'cleanup':
        try {
          statusService.cleanupOldStatuses();
          return '✅ Status cleanup completed.';
        } catch (error) {
          Logger.error(`Status cleanup error: ${error.message}`);
          return `❌ Failed to cleanup statuses: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !status help for available commands`;
    }
  }
};