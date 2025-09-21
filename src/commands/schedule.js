/**
 * Schedule Command
 * Schedule messages and announcements for later delivery
 */

const scheduleService = require('../services/scheduleService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'schedule',
  aliases: ['sched', 'reminder'],
  category: 'utility',
  description: 'Schedule messages and announcements',
  usage: '!schedule <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    
    switch (subcommand) {
      case 'help':
        return `⏰ *Scheduled Messages*
        
Available subcommands:
▫️ help - Show this help
▫️ add <time> <message> - Schedule a message
▫️ list - List scheduled messages
▫️ cancel <id> - Cancel a scheduled message
▫️ recurring <interval> <time> <message> - Schedule recurring message

Time format: YYYY-MM-DD HH:MM or HH:MM (today)
Intervals: 1m, 5m, 10m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 1w, 1y

Examples:
!schedule add 2025-12-25 09:00 Happy Christmas!
!schedule add 14:30 Meeting in 30 minutes
!schedule recurring 1d 09:00 Good morning everyone!
!schedule list`;

      case 'add':
        if (args.length < 3) {
          return `❌ Usage: !schedule add <time> <message>
          
Examples:
!schedule add 2025-12-25 09:00 Happy Christmas!
!schedule add 14:30 Meeting in 30 minutes`;
        }
        
        try {
          const timeArg = args[1];
          const messageText = args.slice(2).join(' ');
          
          // Parse time
          let scheduledTime;
          if (timeArg.includes('-')) {
            // Full date format: YYYY-MM-DD HH:MM
            scheduledTime = new Date(timeArg);
          } else {
            // Time only format: HH:MM (today)
            const today = new Date();
            const [hours, minutes] = timeArg.split(':');
            scheduledTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
          }
          
          if (isNaN(scheduledTime.getTime())) {
            return '❌ Invalid time format. Use YYYY-MM-DD HH:MM or HH:MM';
          }
          
          // Check if time is in the past
          if (scheduledTime < new Date()) {
            return '❌ Cannot schedule messages in the past';
          }
          
          // Create scheduled message
          const messageId = await scheduleService.createScheduledMessage({
            groupId: message.key.remoteJid,
            userId: message.key.participant || message.key.remoteJid,
            message: messageText,
            scheduledTime: scheduledTime.toISOString()
          });
          
          return `✅ Message scheduled successfully!
🆔 ID: ${messageId}
📅 Time: ${scheduledTime.toLocaleString()}
📝 Message: ${messageText}`;
        } catch (error) {
          Logger.error(`Schedule add error: ${error.message}`);
          return `❌ Failed to schedule message: ${error.message}`;
        }

      case 'recurring':
        if (args.length < 4) {
          return `❌ Usage: !schedule recurring <interval> <time> <message>
          
Intervals: 1m, 5m, 10m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 1w, 1y

Examples:
!schedule recurring 1d 09:00 Good morning everyone!
!schedule recurring 1h 30: Check server status`;
        }
        
        try {
          const interval = args[1];
          const timeArg = args[2];
          const messageText = args.slice(3).join(' ');
          
          // Validate interval format
          if (!/^(\d+)([mhdwy])$/.test(interval)) {
            return '❌ Invalid interval format. Use format like 1m, 1h, 1d, 1w, 1y';
          }
          
          // Parse time
          let scheduledTime;
          if (timeArg.includes('-')) {
            scheduledTime = new Date(timeArg);
          } else {
            const today = new Date();
            const [hours, minutes] = timeArg.split(':');
            scheduledTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
          }
          
          if (isNaN(scheduledTime.getTime())) {
            return '❌ Invalid time format. Use YYYY-MM-DD HH:MM or HH:MM';
          }
          
          if (scheduledTime < new Date()) {
            return '❌ Cannot schedule messages in the past';
          }
          
          // Create recurring scheduled message
          const messageId = await scheduleService.createScheduledMessage({
            groupId: message.key.remoteJid,
            userId: message.key.participant || message.key.remoteJid,
            message: messageText,
            scheduledTime: scheduledTime.toISOString(),
            recurring: true,
            interval: interval
          });
          
          return `✅ Recurring message scheduled successfully!
🆔 ID: ${messageId}
📅 First time: ${scheduledTime.toLocaleString()}
🔁 Interval: ${interval}
📝 Message: ${messageText}`;
        } catch (error) {
          Logger.error(`Schedule recurring error: ${error.message}`);
          return `❌ Failed to schedule recurring message: ${error.message}`;
        }

      case 'list':
        try {
          const scheduledMessages = await scheduleService.getScheduledMessages(message.key.remoteJid);
          
          if (scheduledMessages.length === 0) {
            return '⏰ No scheduled messages found.';
          }
          
          let response = `⏰ *Scheduled Messages* (${scheduledMessages.length})\n\n`;
          
          scheduledMessages.forEach((msg, index) => {
            const scheduledTime = new Date(msg.scheduled_time);
            response += `${index + 1}. ID: ${msg.id}
📅 ${scheduledTime.toLocaleString()}
📝 ${msg.message}
🔁 ${msg.recurring ? `Every ${msg.interval}` : 'Once'}
${msg.expires_at ? `🛑 Expires: ${new Date(msg.expires_at).toLocaleString()}` : ''}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Schedule list error: ${error.message}`);
          return `❌ Failed to list scheduled messages: ${error.message}`;
        }

      case 'cancel':
        if (args.length < 2) {
          return '❌ Usage: !schedule cancel <message_id>';
        }
        
        try {
          const messageId = parseInt(args[1]);
          if (isNaN(messageId)) {
            return '❌ Please provide a valid message ID';
          }
          
          const cancelled = await scheduleService.cancelScheduledMessage(messageId);
          
          return cancelled ? 
            `✅ Scheduled message ${messageId} cancelled successfully` : 
            `❌ Failed to cancel scheduled message ${messageId}`;
        } catch (error) {
          Logger.error(`Schedule cancel error: ${error.message}`);
          return `❌ Failed to cancel scheduled message: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !schedule help for available commands`;
    }
  }
};