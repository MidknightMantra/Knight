/**
 * Knight Scheduled Message Service
 * Handles scheduled messages and recurring tasks
 */

const Logger = require('../utils/logger');
const database = require('../database');

class ScheduleService {
  constructor() {
    this.scheduledMessages = new Map();
    this.intervals = new Map();
  }

  async initialize() {
    try {
      // Load scheduled messages from database
      await this.loadScheduledMessages();
      Logger.info('Schedule service initialized');
    } catch (error) {
      Logger.error(`Schedule service initialization failed: ${error.message}`);
    }
  }

  async loadScheduledMessages() {
    try {
      const scheduledMessages = await database.db.all(`
        SELECT * FROM scheduled_messages 
        WHERE active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `);
      
      scheduledMessages.forEach(msg => {
        this.scheduleMessage(msg);
      });
      
      Logger.info(`Loaded ${scheduledMessages.length} scheduled messages`);
    } catch (error) {
      Logger.error(`Failed to load scheduled messages: ${error.message}`);
    }
  }

  async createScheduledMessage(options) {
    try {
      const {
        groupId,
        userId,
        message,
        scheduledTime,
        recurring = false,
        interval = null,
        expiresAt = null,
        timezone = 'UTC'
      } = options;

      // Insert into database
      const result = await database.db.run(`
        INSERT INTO scheduled_messages 
        (group_id, user_id, message, scheduled_time, recurring, interval, expires_at, timezone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        groupId,
        userId,
        message,
        scheduledTime,
        recurring ? 1 : 0,
        interval,
        expiresAt,
        timezone
      ]);

      const messageId = result.lastID;
      
      // Load the message and schedule it
      const scheduledMessage = await database.db.get(
        'SELECT * FROM scheduled_messages WHERE id = ?', 
        [messageId]
      );
      
      if (scheduledMessage) {
        this.scheduleMessage(scheduledMessage);
      }
      
      return messageId;
    } catch (error) {
      Logger.error(`Failed to create scheduled message: ${error.message}`);
      throw error;
    }
  }

  scheduleMessage(scheduledMessage) {
    try {
      const now = new Date();
      const scheduledTime = new Date(scheduledMessage.scheduled_time);
      
      // Calculate delay in milliseconds
      const delay = scheduledTime.getTime() - now.getTime();
      
      if (delay <= 0) {
        Logger.warn(`Scheduled message ${scheduledMessage.id} is in the past, skipping`);
        return;
      }
      
      // Set timeout for the message
      const timeoutId = setTimeout(() => {
        this.executeScheduledMessage(scheduledMessage);
      }, delay);
      
      this.scheduledMessages.set(scheduledMessage.id, {
        timeoutId,
        message: scheduledMessage
      });
      
      Logger.info(`Scheduled message ${scheduledMessage.id} for ${scheduledTime}`);
    } catch (error) {
      Logger.error(`Failed to schedule message ${scheduledMessage.id}: ${error.message}`);
    }
  }

  async executeScheduledMessage(scheduledMessage) {
    try {
      Logger.info(`Executing scheduled message ${scheduledMessage.id}`);
      
      // Emit event for message execution
      // This would be handled by the main bot to actually send the message
      if (this.onMessageExecute) {
        await this.onMessageExecute(scheduledMessage);
      }
      
      // Handle recurring messages
      if (scheduledMessage.recurring) {
        // Reschedule for next interval
        await this.rescheduleRecurringMessage(scheduledMessage);
      } else {
        // Mark as inactive
        await this.deactivateMessage(scheduledMessage.id);
      }
    } catch (error) {
      Logger.error(`Failed to execute scheduled message ${scheduledMessage.id}: ${error.message}`);
    }
  }

  async rescheduleRecurringMessage(scheduledMessage) {
    try {
      // Calculate next scheduled time based on interval
      const currentScheduledTime = new Date(scheduledMessage.scheduled_time);
      let nextScheduledTime;
      
      if (scheduledMessage.interval) {
        // Parse interval (e.g., "1d", "2h", "30m")
        const intervalMatch = scheduledMessage.interval.match(/^(\d+)([dhwmy])$/);
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
        if (scheduledMessage.expires_at) {
          const expiresAt = new Date(scheduledMessage.expires_at);
          if (nextScheduledTime > expiresAt) {
            // Don't reschedule, deactivate instead
            await this.deactivateMessage(scheduledMessage.id);
            return;
          }
        }
        
        // Update scheduled time in database
        await database.db.run(`
          UPDATE scheduled_messages 
          SET scheduled_time = ? 
          WHERE id = ?
        `, [nextScheduledTime.toISOString(), scheduledMessage.id]);
        
        // Reschedule
        scheduledMessage.scheduled_time = nextScheduledTime.toISOString();
        this.scheduleMessage(scheduledMessage);
      }
    } catch (error) {
      Logger.error(`Failed to reschedule recurring message ${scheduledMessage.id}: ${error.message}`);
    }
  }

  async deactivateMessage(messageId) {
    try {
      await database.db.run(`
        UPDATE scheduled_messages 
        SET active = 0 
        WHERE id = ?
      `, [messageId]);
      
      // Clear timeout if exists
      const scheduled = this.scheduledMessages.get(messageId);
      if (scheduled) {
        clearTimeout(scheduled.timeoutId);
        this.scheduledMessages.delete(messageId);
      }
      
      Logger.info(`Deactivated scheduled message ${messageId}`);
    } catch (error) {
      Logger.error(`Failed to deactivate message ${messageId}: ${error.message}`);
    }
  }

  async cancelScheduledMessage(messageId) {
    try {
      await this.deactivateMessage(messageId);
      Logger.info(`Cancelled scheduled message ${messageId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to cancel message ${messageId}: ${error.message}`);
      return false;
    }
  }

  async getScheduledMessages(groupId = null) {
    try {
      let query = `
        SELECT * FROM scheduled_messages 
        WHERE active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `;
      let params = [];
      
      if (groupId) {
        query += ' AND group_id = ?';
        params.push(groupId);
      }
      
      query += ' ORDER BY scheduled_time ASC';
      
      return await database.db.all(query, params);
    } catch (error) {
      Logger.error(`Failed to get scheduled messages: ${error.message}`);
      return [];
    }
  }

  async getScheduledMessage(messageId) {
    try {
      return await database.db.get(
        'SELECT * FROM scheduled_messages WHERE id = ?', 
        [messageId]
      );
    } catch (error) {
      Logger.error(`Failed to get scheduled message ${messageId}: ${error.message}`);
      return null;
    }
  }

  // Set callback for message execution
  setOnMessageExecute(callback) {
    this.onMessageExecute = callback;
  }
}

module.exports = new ScheduleService();