/**
 * Knight Task Management Service
 * Personal task management and tracking system
 */

const Logger = require('../utils/logger');
const database = require('../database');

class TaskService {
  constructor() {
    this.tasks = new Map(); // Store active tasks in memory for quick access
    this.reminders = new Map(); // Store task reminders
  }

  async initialize() {
    try {
      // Load existing tasks from database
      await this.loadTasks();
      Logger.success('Task service initialized');
    } catch (error) {
      Logger.error(`Task service initialization failed: ${error.message}`);
    }
  }

  async loadTasks() {
    try {
      const tasks = await database.db.all(`
        SELECT * FROM tasks 
        WHERE completed = 0 
        AND (due_date IS NULL OR due_date > datetime('now', '-1 day'))
      `);
      
      tasks.forEach(task => {
        this.tasks.set(task.id, task);
      });
      
      Logger.info(`Loaded ${tasks.length} active tasks`);
    } catch (error) {
      Logger.error(`Failed to load tasks: ${error.message}`);
    }
  }

  async createTask(options) {
    try {
      const {
        title,
        description = '',
        userId,
        dueDate = null,
        priority = 'normal', // low, normal, high, urgent
        category = 'personal',
        recurring = false,
        interval = null // for recurring tasks (e.g., "1d", "1w")
      } = options;

      // Insert into database
      const result = await database.db.run(`
        INSERT INTO tasks 
        (title, description, user_jid, due_date, priority, category, recurring, interval, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        title,
        description,
        userId,
        dueDate,
        priority,
        category,
        recurring ? 1 : 0,
        interval
      ]);

      const taskId = result.lastID;
      
      // Load the task and store it
      const task = await database.db.get(
        'SELECT * FROM tasks WHERE id = ?', 
        [taskId]
      );
      
      if (task) {
        this.tasks.set(taskId, task);
        
        // Set up reminder if due date exists
        if (dueDate) {
          await this.scheduleTaskReminder(task);
        }
      }
      
      // Log task creation
      Logger.info(`Created task ${taskId}: ${title}`);
      
      return taskId;
    } catch (error) {
      Logger.error(`Failed to create task: ${error.message}`);
      throw error;
    }
  }

  async scheduleTaskReminder(task) {
    try {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      
      // Calculate delay in milliseconds
      const delay = dueDate.getTime() - now.getTime();
      
      if (delay <= 0) {
        Logger.warn(`Task ${task.id} is overdue, not scheduling reminder`);
        return;
      }
      
      // Set timeout for the reminder
      const timeoutId = setTimeout(() => {
        this.sendTaskReminder(task);
      }, delay);
      
      this.reminders.set(task.id, timeoutId);
      Logger.info(`Scheduled reminder for task ${task.id} in ${Math.ceil(delay / 1000)} seconds`);
    } catch (error) {
      Logger.error(`Failed to schedule reminder for task ${task.id}: ${error.message}`);
    }
  }

  async sendTaskReminder(task) {
    try {
      Logger.info(`Sending reminder for task ${task.id}: ${task.title}`);
      
      // This would use the WhatsApp client to send the reminder
      // For now, we'll log it
      Logger.info(`REMINDER: Task "${task.title}" is due soon!`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(task.user_jid, {
      //   text: `🔔 *Task Reminder*\n\n"${task.title}" is due soon!\n\nDue: ${new Date(task.due_date).toLocaleString()}`
      // });
      
      // Remove from reminders
      this.reminders.delete(task.id);
      
    } catch (error) {
      Logger.error(`Failed to send reminder for task ${task.id}: ${error.message}`);
    }
  }

  async completeTask(taskId, userId) {
    try {
      // Verify task belongs to user
      const task = await this.getTask(taskId);
      if (!task || task.user_jid !== userId) {
        throw new Error('Task not found or access denied');
      }
      
      // Update task as completed
      await database.db.run(`
        UPDATE tasks 
        SET completed = 1, completed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [taskId]);
      
      // Remove from active tasks
      this.tasks.delete(taskId);
      
      // Clear any scheduled reminders
      const reminderTimeout = this.reminders.get(taskId);
      if (reminderTimeout) {
        clearTimeout(reminderTimeout);
        this.reminders.delete(taskId);
      }
      
      Logger.info(`Completed task ${taskId}: ${task.title}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to complete task ${taskId}: ${error.message}`);
      return false;
    }
  }

  async updateTask(taskId, updates, userId) {
    try {
      // Verify task belongs to user
      const task = await this.getTask(taskId);
      if (!task || task.user_jid !== userId) {
        throw new Error('Task not found or access denied');
      }
      
      // Build update query dynamically
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      
      if (updates.dueDate !== undefined) {
        fields.push('due_date = ?');
        values.push(updates.dueDate);
      }
      
      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }
      
      if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
      }
      
      if (updates.recurring !== undefined) {
        fields.push('recurring = ?');
        values.push(updates.recurring ? 1 : 0);
      }
      
      if (updates.interval !== undefined) {
        fields.push('interval = ?');
        values.push(updates.interval);
      }
      
      if (fields.length === 0) {
        return task; // No updates needed
      }
      
      values.push(taskId);
      
      // Update in database
      await database.db.run(`
        UPDATE tasks 
        SET ${fields.join(', ')} 
        WHERE id = ?
      `, values);
      
      // Reload task
      const updatedTask = await this.getTask(taskId);
      
      // Update in memory
      this.tasks.set(taskId, updatedTask);
      
      // Reschedule reminder if due date changed
      if (updates.dueDate !== undefined) {
        const existingTimeout = this.reminders.get(taskId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          this.reminders.delete(taskId);
        }
        await this.scheduleTaskReminder(updatedTask);
      }
      
      Logger.info(`Updated task ${taskId}: ${updatedTask.title}`);
      return updatedTask;
    } catch (error) {
      Logger.error(`Failed to update task ${taskId}: ${error.message}`);
      throw error;
    }
  }

  async deleteTask(taskId, userId) {
    try {
      // Verify task belongs to user
      const task = await this.getTask(taskId);
      if (!task || task.user_jid !== userId) {
        throw new Error('Task not found or access denied');
      }
      
      // Delete from database
      await database.db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
      
      // Remove from active tasks
      this.tasks.delete(taskId);
      
      // Clear any scheduled reminders
      const reminderTimeout = this.reminders.get(taskId);
      if (reminderTimeout) {
        clearTimeout(reminderTimeout);
        this.reminders.delete(taskId);
      }
      
      Logger.info(`Deleted task ${taskId}: ${task.title}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete task ${taskId}: ${error.message}`);
      return false;
    }
  }

  async getTask(taskId) {
    try {
      return await database.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    } catch (error) {
      Logger.error(`Failed to get task ${taskId}: ${error.message}`);
      return null;
    }
  }

  async getUserTasks(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        completed = false,
        category = null,
        priority = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;
      
      let query = `
        SELECT * FROM tasks 
        WHERE user_jid = ? 
        AND completed = ?
      `;
      let params = [userId, completed ? 1 : 0];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      if (priority) {
        query += ' AND priority = ?';
        params.push(priority);
      }
      
      query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      return await database.db.all(query, params);
    } catch (error) {
      Logger.error(`Failed to get user tasks: ${error.message}`);
      return [];
    }
  }

  async getOverdueTasks(userId = null) {
    try {
      let query = `
        SELECT * FROM tasks 
        WHERE completed = 0 
        AND due_date < CURRENT_TIMESTAMP
      `;
      let params = [];
      
      if (userId) {
        query += ' AND user_jid = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY due_date ASC';
      
      return await database.db.all(query, params);
    } catch (error) {
      Logger.error(`Failed to get overdue tasks: ${error.message}`);
      return [];
    }
  }

  async getUpcomingTasks(userId, days = 7) {
    try {
      const query = `
        SELECT * FROM tasks 
        WHERE user_jid = ? 
        AND completed = 0 
        AND due_date >= CURRENT_TIMESTAMP 
        AND due_date <= datetime('now', '+${days} days')
        ORDER BY due_date ASC
      `;
      
      return await database.db.all(query, [userId]);
    } catch (error) {
      Logger.error(`Failed to get upcoming tasks: ${error.message}`);
      return [];
    }
  }

  async getTaskStats(userId) {
    try {
      const total = await database.db.get(`
        SELECT COUNT(*) as count FROM tasks WHERE user_jid = ?
      `, [userId]);
      
      const completed = await database.db.get(`
        SELECT COUNT(*) as count FROM tasks WHERE user_jid = ? AND completed = 1
      `, [userId]);
      
      const overdue = await database.db.get(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE user_jid = ? AND completed = 0 AND due_date < CURRENT_TIMESTAMP
      `, [userId]);
      
      const upcoming = await database.db.get(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE user_jid = ? AND completed = 0 
        AND due_date >= CURRENT_TIMESTAMP 
        AND due_date <= datetime('now', '+7 days')
      `, [userId]);
      
      return {
        total: total.count,
        completed: completed.count,
        overdue: overdue.count,
        upcoming: upcoming.count,
        completionRate: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0
      };
    } catch (error) {
      Logger.error(`Failed to get task stats: ${error.message}`);
      return { total: 0, completed: 0, overdue: 0, upcoming: 0, completionRate: 0 };
    }
  }

  async searchTasks(userId, searchTerm, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        completed = null
      } = options;
      
      let query = `
        SELECT * FROM tasks 
        WHERE user_jid = ? 
        AND (title LIKE ? OR description LIKE ?)
      `;
      let params = [userId, `%${searchTerm}%`, `%${searchTerm}%`];
      
      if (completed !== null) {
        query += ' AND completed = ?';
        params.push(completed ? 1 : 0);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      return await database.db.all(query, params);
    } catch (error) {
      Logger.error(`Failed to search tasks: ${error.message}`);
      return [];
    }
  }

  async cleanupOldTasks(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const cutoff = new Date(Date.now() - maxAge).toISOString();
      
      await database.db.run(`
        DELETE FROM tasks 
        WHERE completed = 1 AND completed_at < ?
      `, [cutoff]);
      
      Logger.info('Cleaned up old completed tasks');
    } catch (error) {
      Logger.error(`Failed to cleanup tasks: ${error.message}`);
    }
  }
}

module.exports = new TaskService();