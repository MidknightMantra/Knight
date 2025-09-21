/**
 * Status Command
 * Control automatic status download to DM
 */

const database = require('../database');
const Logger = require('../utils/logger');

module.exports = {
  name: 'status',
  aliases: ['stat', 'auto-status'],
  category: 'media',
  description: 'Control automatic status download to DM',
  usage: '!status <on/off/status>',
  
  async execute(client, message, args) {
    try {
      const userId = message.key.remoteJid;
      const action = args[0]?.toLowerCase() || 'status';
      
      switch (action) {
        case 'on':
        case 'enable':
          await database.setSetting(`user_${userId}_download_status`, 'true');
          return '✅ Status download enabled! Status updates will be sent to your DM.';
          
        case 'off':
        case 'disable':
          await database.setSetting(`user_${userId}_download_status`, 'false');
          return '✅ Status download disabled! You will no longer receive status updates in your DM.';
          
        case 'status':
        default:
          const currentSetting = await database.getSetting(`user_${userId}_download_status`);
          return `📱 *Status Download Status*
          
Status: ${currentSetting === 'true' ? '✅ Enabled' : '❌ Disabled'}

Commands:
!status on - Enable status download
!status off - Disable status download
!status status - Show current status`;
      }
    } catch (error) {
      Logger.error(`Status command error: ${error.message}`);
      return `❌ Failed to control status download: ${error.message}`;
    }
  }
};