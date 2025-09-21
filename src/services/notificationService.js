/**
 * Knight Notification Service
 * Advanced notification and alert system
 */

const Logger = require('../utils/logger');
const database = require('../database');
const scheduleService = require('./scheduleService');

class NotificationService {
  constructor() {
    this.notifications = new Map(); // Store active notifications
    this.subscribers = new Map(); // Store notification subscribers
  }

  async initialize() {
    try {
      // Load existing notifications from database
      await this.loadNotifications();
      Logger.success('Notification service initialized');
    } catch (error) {
      Logger.error(`Notification service initialization failed: ${error.message}`);
    }
  }

  async loadNotifications() {
    try {
      const notifications = await database.db.all(`
        SELECT * FROM notifications 
        WHERE active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `);
      
      notifications.forEach(notification => {
        this.notifications.set(notification.id, notification);
      });
      
      Logger.info(`Loaded ${notifications.length} notifications`);
    } catch (error) {
      Logger.error(`Failed to load notifications: ${error.message}`);
    }
  }

  async createNotification(options) {
    try {
      const {
        title,
        message,
        type = 'info',
        priority = 'normal',
        target = 'all', // all, users, groups
        recipients = [], // array of jids
        scheduledTime = null,
        recurring = false,
        interval = null,
        expiresAt = null,
        channelId = null
      } = options;

      // Insert into database
      const result = await database.db.run(`
        INSERT INTO notifications 
        (title, message, type, priority, target, scheduled_time, recurring, interval, expires_at, channel_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        title,
        message,
        type,
        priority,
        target,
        scheduledTime,
        recurring ? 1 : 0,
        interval,
        expiresAt,
        channelId
      ]);

      const notificationId = result.lastID;
      
      // Load the notification and store it
      const notification = await database.db.get(
        'SELECT * FROM notifications WHERE id = ?', 
        [notificationId]
      );
      
      if (notification) {
        this.notifications.set(notificationId, notification);
        
        // If scheduled, set up the schedule
        if (scheduledTime) {
          await this.scheduleNotification(notification);
        }
      }
      
      // Log notification creation
      Logger.info(`Created notification ${notificationId}: ${title}`);
      
      return notificationId;
    } catch (error) {
      Logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async scheduleNotification(notification) {
    try {
      const now = new Date();
      const scheduledTime = new Date(notification.scheduled_time);
      
      // Calculate delay in milliseconds
      const delay = scheduledTime.getTime() - now.getTime();
      
      if (delay <= 0) {
        Logger.warn(`Notification ${notification.id} is in the past, sending immediately`);
        await this.sendNotification(notification);
        return;
      }
      
      // Set timeout for the notification
      const timeoutId = setTimeout(() => {
        this.sendNotification(notification);
      }, delay);
      
      Logger.info(`Scheduled notification ${notification.id} for ${scheduledTime}`);
    } catch (error) {
      Logger.error(`Failed to schedule notification ${notification.id}: ${error.message}`);
    }
  }

  async sendNotification(notification) {
    try {
      Logger.info(`Sending notification ${notification.id}: ${notification.title}`);
      
      // Determine recipients
      let recipients = [];
      
      if (notification.target === 'all') {
        // Get all users
        const users = await database.db.all('SELECT jid FROM users');
        recipients = users.map(user => user.jid);
      } else if (notification.target === 'users') {
        // Specific users
        recipients = notification.recipients ? JSON.parse(notification.recipients) : [];
      } else if (notification.target === 'groups') {
        // Specific groups
        recipients = notification.recipients ? JSON.parse(notification.recipients) : [];
      }
      
      // Send to each recipient
      for (const recipient of recipients) {
        try {
          // This would use the WhatsApp client to send the message
          // For now, we'll log it
          Logger.info(`Sending notification to ${recipient}: ${notification.title}`);
          
          // In a real implementation, you'd send the actual message:
          // await whatsappClient.sendMessage(recipient, {
          //   text: `🔔 *${notification.title}*\n\n${notification.message}`
          // });
        } catch (sendError) {
          Logger.error(`Failed to send notification to ${recipient}: ${sendError.message}`);
        }
      }
      
      // Handle recurring notifications
      if (notification.recurring) {
        await this.rescheduleRecurringNotification(notification);
      } else {
        // Mark as inactive
        await this.deactivateNotification(notification.id);
      }
      
      // Log notification sent
      await database.db.run(`
        INSERT INTO notification_logs (notification_id, sent_at, recipients_count)
        VALUES (?, CURRENT_TIMESTAMP, ?)
      `, [notification.id, recipients.length]);
      
    } catch (error) {
      Logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
    }
  }

  async rescheduleRecurringNotification(notification) {
    try {
      // Calculate next scheduled time based on interval
      const currentScheduledTime = new Date(notification.scheduled_time);
      let nextScheduledTime;
      
      if (notification.interval) {
        // Parse interval (e.g., "1d", "2h", "30m")
        const intervalMatch = notification.interval.match(/^(\d+)([dhwmy])$/);
        if (intervalMatch) {
          const amount = parseInt(intervalMatch[1]);
          const unit = intervalMatch[2];
          
          nextScheduledTime = new Date(currentScheduledTime);
          
          switch (unit) {
            case 'm': // minutes
              nextScheduledTime.setMinutes(nextScheduledTime.getMinutes() + amount);
              break;
            case 'h': // hours
              nextScheduledTime.setHours(nextScheduledTime.getHours() + amount);
              break;
            case 'd': // days
              nextScheduledTime.setDate(nextScheduledTime.getDate() + amount);
              break;
            case 'w': // weeks
              nextScheduledTime.setDate(nextScheduledTime.getDate() + (amount * 7));
              break;
            case 'y': // years
              nextScheduledTime.setFullYear(nextScheduledTime.getFullYear() + amount);
              break;
          }
        }
      }
      
      if (nextScheduledTime) {
        // Check if it expires
        if (notification.expires_at) {
          const expiresAt = new Date(notification.expires_at);
          if (nextScheduledTime > expiresAt) {
            // Don't reschedule, deactivate instead
            await this.deactivateNotification(notification.id);
            return;
          }
        }
        
        // Update scheduled time in database
        await database.db.run(`
          UPDATE notifications 
          SET scheduled_time = ? 
          WHERE id = ?
        `, [nextScheduledTime.toISOString(), notification.id]);
        
        // Reschedule
        notification.scheduled_time = nextScheduledTime.toISOString();
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      Logger.error(`Failed to reschedule recurring notification ${notification.id}: ${error.message}`);
    }
  }

  async deactivateNotification(notificationId) {
    try {
      await database.db.run(`
        UPDATE notifications 
        SET active = 0 
        WHERE id = ?
      `, [notificationId]);
      
      // Remove from active notifications
      this.notifications.delete(notificationId);
      
      Logger.info(`Deactivated notification ${notificationId}`);
    } catch (error) {
      Logger.error(`Failed to deactivate notification ${notificationId}: ${error.message}`);
    }
  }

  async cancelNotification(notificationId) {
    try {
      await this.deactivateNotification(notificationId);
      Logger.info(`Cancelled notification ${notificationId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to cancel notification ${notificationId}: ${error.message}`);
      return false;
    }
  }

  async getNotifications(target = null, limit = 20) {
    try {
      let query = `
        SELECT * FROM notifications 
        WHERE active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `;
      let params = [];
      
      if (target) {
        query += ' AND (target = ? OR target = "all")';
        params.push(target);
      }
      
      query += ' ORDER BY scheduled_time DESC LIMIT ?';
      params.push(limit);
      
      return await database.db.all(query, params);
    } catch (error) {
      Logger.error(`Failed to get notifications: ${error.message}`);
      return [];
    }
  }

  async getNotification(notificationId) {
    try {
      return await database.db.get(
        'SELECT * FROM notifications WHERE id = ?', 
        [notificationId]
      );
    } catch (error) {
      Logger.error(`Failed to get notification ${notificationId}: ${error.message}`);
      return null;
    }
  }

  async getUserNotifications(userId, limit = 10) {
    try {
      // Get notifications targeted to this user or all users
      const notifications = await database.db.all(`
        SELECT n.*, nl.sent_at as last_sent
        FROM notifications n
        LEFT JOIN notification_logs nl ON n.id = nl.notification_id
        WHERE n.active = 1 
        AND (n.target = "all" OR n.target = "users")
        AND (n.expires_at IS NULL OR n.expires_at > datetime('now'))
        ORDER BY n.scheduled_time DESC
        LIMIT ?
      `, [limit]);
      
      return notifications;
    } catch (error) {
      Logger.error(`Failed to get user notifications: ${error.message}`);
      return [];
    }
  }

  async subscribeUser(userId, notificationType = 'all') {
    try {
      // Add user to subscribers
      await database.db.run(`
        INSERT OR IGNORE INTO notification_subscriptions (user_jid, notification_type, subscribed_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [userId, notificationType]);
      
      // Add to in-memory subscribers
      if (!this.subscribers.has(userId)) {
        this.subscribers.set(userId, new Set());
      }
      this.subscribers.get(userId).add(notificationType);
      
      Logger.info(`User ${userId} subscribed to ${notificationType} notifications`);
      return true;
    } catch (error) {
      Logger.error(`Failed to subscribe user ${userId}: ${error.message}`);
      return false;
    }
  }

  async unsubscribeUser(userId, notificationType = 'all') {
    try {
      // Remove user from subscribers
      if (notificationType === 'all') {
        await database.db.run(`
          DELETE FROM notification_subscriptions 
          WHERE user_jid = ?
        `, [userId]);
        this.subscribers.delete(userId);
      } else {
        await database.db.run(`
          DELETE FROM notification_subscriptions 
          WHERE user_jid = ? AND notification_type = ?
        `, [userId, notificationType]);
        
        if (this.subscribers.has(userId)) {
          this.subscribers.get(userId).delete(notificationType);
        }
      }
      
      Logger.info(`User ${userId} unsubscribed from ${notificationType} notifications`);
      return true;
    } catch (error) {
      Logger.error(`Failed to unsubscribe user ${userId}: ${error.message}`);
      return false;
    }
  }

  async getUserSubscription(userId) {
    try {
      const subscriptions = await database.db.all(`
        SELECT notification_type FROM notification_subscriptions 
        WHERE user_jid = ?
      `, [userId]);
      
      return subscriptions.map(sub => sub.notification_type);
    } catch (error) {
      Logger.error(`Failed to get user subscription: ${error.message}`);
      return [];
    }
  }

  async getNotificationStats() {
    try {
      const total = await database.db.get('SELECT COUNT(*) as count FROM notifications');
      const active = await database.db.get('SELECT COUNT(*) as count FROM notifications WHERE active = 1');
      const sent = await database.db.get('SELECT COUNT(*) as count FROM notification_logs');
      
      return {
        total: total.count,
        active: active.count,
        sent: sent.count
      };
    } catch (error) {
      Logger.error(`Failed to get notification stats: ${error.message}`);
      return { total: 0, active: 0, sent: 0 };
    }
  }

  async cleanupOldNotifications(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const cutoff = new Date(Date.now() - maxAge).toISOString();
      
      await database.db.run(`
        DELETE FROM notifications 
        WHERE created_at < ? AND active = 0
      `, [cutoff]);
      
      await database.db.run(`
        DELETE FROM notification_logs 
        WHERE sent_at < ?
      `, [cutoff]);
      
      Logger.info('Cleaned up old notifications');
    } catch (error) {
      Logger.error(`Failed to cleanup notifications: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();