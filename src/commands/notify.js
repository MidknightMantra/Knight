/**
 * Notification Command
 * Advanced notification and alert system
 */

const notificationService = require('../services/notificationService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'notify',
  aliases: ['notification', 'alert'],
  category: 'utility',
  description: 'Advanced notification and alert system',
  usage: '!notify <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `🔔 *Knight Notification System*
        
Available subcommands:
▫️ help - Show this help
▫️ send <title> | <message> - Send immediate notification
▫️ schedule <time> <title> | <message> - Schedule notification
▫️ list - List recent notifications
▫️ subscribe [type] - Subscribe to notifications
▫️ unsubscribe [type] - Unsubscribe from notifications
▫️ subscriptions - Show your subscriptions
▫️ stats - Show notification statistics

Examples:
!notify send "Server Maintenance" | "The server will be down for maintenance tonight."
!notify schedule "22:00" "Nightly Backup" | "Starting nightly backup process."
!notify list
!notify subscribe
!notify stats`;

      case 'send':
        if (args.length < 2) {
          return `❌ Usage: !notify send "<title>" | "<message>"
          
Example: !notify send "Important Update" | "Please update your app to the latest version."`;
        }
        
        try {
          const input = args.slice(1).join(' ');
          const parts = input.split(' | ');
          
          if (parts.length < 2) {
            return '❌ Please use the format: "<title>" | "<message>"';
          }
          
          const title = parts[0].trim();
          const messageText = parts[1].trim();
          
          const notificationId = await notificationService.createNotification({
            title: title,
            message: messageText,
            type: 'info',
            priority: 'normal',
            target: 'all'
          });
          
          // Send immediately
          const notification = await notificationService.getNotification(notificationId);
          await notificationService.sendNotification(notification);
          
          return `✅ Notification sent successfully!
🆔 ID: ${notificationId}
📝 Title: ${title}
📬 Message: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`;
        } catch (error) {
          Logger.error(`Notify send error: ${error.message}`);
          return `❌ Failed to send notification: ${error.message}`;
        }

      case 'schedule':
        if (args.length < 3) {
          return `❌ Usage: !notify schedule <time> "<title>" | "<message>"
          
Time format: HH:MM (today) or YYYY-MM-DD HH:MM
Example: !notify schedule "22:00" "Nightly Backup" | "Starting nightly backup process."`;
        }
        
        try {
          const timeArg = args[1];
          const input = args.slice(2).join(' ');
          const parts = input.split(' | ');
          
          if (parts.length < 2) {
            return '❌ Please use the format: "<title>" | "<message>"';
          }
          
          const title = parts[0].trim();
          const messageText = parts[1].trim();
          
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
            return '❌ Invalid time format. Use HH:MM or YYYY-MM-DD HH:MM';
          }
          
          if (scheduledTime < new Date()) {
            return '❌ Cannot schedule notifications in the past';
          }
          
          const notificationId = await notificationService.createNotification({
            title: title,
            message: messageText,
            type: 'info',
            priority: 'normal',
            target: 'all',
            scheduledTime: scheduledTime.toISOString()
          });
          
          return `✅ Notification scheduled successfully!
🆔 ID: ${notificationId}
📅 Time: ${scheduledTime.toLocaleString()}
📝 Title: ${title}
📬 Message: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`;
        } catch (error) {
          Logger.error(`Notify schedule error: ${error.message}`);
          return `❌ Failed to schedule notification: ${error.message}`;
        }

      case 'list':
        try {
          const notifications = await notificationService.getNotifications('all', 10);
          
          if (notifications.length === 0) {
            return '🔔 No notifications found.';
          }
          
          let response = `🔔 *Recent Notifications* (${notifications.length})\n\n`;
          
          notifications.forEach((notification, index) => {
            const scheduledTime = new Date(notification.scheduled_time);
            const timeStr = notification.scheduled_time ? 
              scheduledTime.toLocaleString() : 
              'Immediate';
              
            response += `${index + 1}. ${notification.title}
⏰ ${timeStr}
.priority || 'normal'}
📝 ${notification.message.substring(0, 80)}${notification.message.length > 80 ? '...' : ''}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Notify list error: ${error.message}`);
          return `❌ Failed to list notifications: ${error.message}`;
        }

      case 'subscribe':
        try {
          const notificationType = args[1] || 'all';
          const success = await notificationService.subscribeUser(userId, notificationType);
          
          return success ? 
            `✅ Subscribed to ${notificationType} notifications` : 
            `❌ Failed to subscribe to notifications`;
        } catch (error) {
          Logger.error(`Notify subscribe error: ${error.message}`);
          return `❌ Failed to subscribe: ${error.message}`;
        }

      case 'unsubscribe':
        try {
          const notificationType = args[1] || 'all';
          const success = await notificationService.unsubscribeUser(userId, notificationType);
          
          return success ? 
            `✅ Unsubscribed from ${notificationType} notifications` : 
            `❌ Failed to unsubscribe from notifications`;
        } catch (error) {
          Logger.error(`Notify unsubscribe error: ${error.message}`);
          return `❌ Failed to unsubscribe: ${error.message}`;
        }

      case 'subscriptions':
        try {
          const subscriptions = await notificationService.getUserSubscription(userId);
          
          if (subscriptions.length === 0) {
            return '🔕 You are not subscribed to any notifications.';
          }
          
          return `🔔 *Your Notification Subscriptions*
          
${subscriptions.map((sub, index) => `${index + 1}. ${sub}`).join('\n')}`;
        } catch (error) {
          Logger.error(`Notify subscriptions error: ${error.message}`);
          return `❌ Failed to get subscriptions: ${error.message}`;
        }

      case 'stats':
        try {
          const stats = await notificationService.getNotificationStats();
          
          return `🔔 *Notification Statistics*
          
📊 Total Notifications: ${stats.total}
✅ Active: ${stats.active}
📤 Sent: ${stats.sent}`;
        } catch (error) {
          Logger.error(`Notify stats error: ${error.message}`);
          return `❌ Failed to get statistics: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !notify help for available commands`;
    }
  }
};