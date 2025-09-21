/**
 * Knight Task Management Service
 * Enhanced task tracking with recurrence, priorities, and reminders
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class TaskService {
  constructor() {
    this.cache = new Map(); // Cache for task data
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
    this.reminders = new Map(); // Store active task reminders
  }

  async initialize() {
    try {
      Logger.success('Task service initialized');
      
      // Load existing tasks from database
      await this.loadTasks();
      
      // Start periodic task reminder checking
      setInterval(() => {
        this.checkTaskReminders();
      }, 5 * 60 * 1000); // Check every 5 minutes
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
        interval = null, // for recurring tasks (e.g., "1d", "1w")
        tags = [],
        assignee = null,
        projectId = null
      } = options;

      // Validate inputs
      if (!title || title.trim() === '') {
        throw new Error('Task title is required');
      }
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority.toLowerCase())) {
        throw new Error(`Invalid priority. Valid priorities: ${validPriorities.join(', ')}`);
      }
      
      const validCategories = ['personal', 'work', 'shopping', 'health', 'education', 'finance', 'entertainment', 'other'];
      if (!validCategories.includes(category.toLowerCase())) {
        throw new Error(`Invalid category. Valid categories: ${validCategories.join(', ')}`);
      }
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO tasks 
        (title, description, user_jid, due_date, priority, category, recurring, interval, assignee, project_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        title.trim(),
        description.trim(),
        userId,
        dueDate,
        priority.toLowerCase(),
        category.toLowerCase(),
        recurring ? 1 : 0,
        interval,
        assignee,
        projectId
      ]);

      const taskId = result.lastID;
      
      Logger.info(`Created task ${taskId}: ${title}`);
      
      // Add tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        await this.addTaskTags(taskId, tags);
      }
      
      // Set up reminder if due date exists
      if (dueDate) {
        await this.scheduleTaskReminder(taskId, userId, dueDate);
      }
      
      // Update user stats
      await database.updateUserStats(userId, 0, 1);
      
      return taskId;
    } catch (error) {
      Logger.error(`Failed to create task: ${error.message}`);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  async scheduleTaskReminder(taskId, userId, dueDate) {
    try {
      const now = new Date();
      const dueDateTime = new Date(dueDate);
      
      // Calculate delay in milliseconds
      const delay = dueDateTime.getTime() - now.getTime();
      
      if (delay <= 0) {
        Logger.warn(`Task ${taskId} is overdue, not scheduling reminder`);
        return;
      }
      
      // Set timeout for the reminder (1 hour before due)
      const reminderDelay = Math.max(0, delay - (60 * 60 * 1000)); // 1 hour before
      
      const timeoutId = setTimeout(() => {
        this.sendTaskReminder(taskId, userId, dueDate);
      }, reminderDelay);
      
      this.reminders.set(taskId, timeoutId);
      Logger.info(`Scheduled reminder for task ${taskId} in ${Math.ceil(reminderDelay / 1000)} seconds`);
    } catch (error) {
      Logger.error(`Failed to schedule reminder for task ${taskId}: ${error.message}`);
    }
  }

  async sendTaskReminder(taskId, userId, dueDate) {
    try {
      Logger.info(`Sending reminder for task ${taskId}`);
      
      // Get task details
      const task = await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ?
      `, [taskId]);
      
      if (!task) {
        Logger.warn(`Task ${taskId} not found for reminder`);
        return;
      }
      
      // This would use the WhatsApp client to send the reminder
      // For now, we'll log it
      Logger.info(`TASK REMINDER: Task "${task.title}" is due soon! Due: ${new Date(dueDate).toLocaleString()}`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(userId, {
      //   text: `🔔 *Task Reminder*
      //   
      //   "${task.title}" is due soon!
      //   Due: ${new Date(dueDate).toLocaleString()}
      //   Priority: ${task.priority}
      //   Category: ${task.category}
      //   
      //   Description: ${task.description || 'No description'}`
      // });
      
      // Remove from reminders
      this.reminders.delete(taskId);
      
    } catch (error) {
      Logger.error(`Failed to send reminder for task ${taskId}: ${error.message}`);
    }
  }

  async completeTask(taskId, userId) {
    try {
      // Verify task belongs to user
      const task = await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ? AND user_jid = ?
      `, [taskId, userId]);
      
      if (!task) {
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
      
      // Handle recurring tasks
      if (task.recurring && task.interval) {
        await this.createRecurringTask(task);
      }
      
      return true;
    } catch (error) {
      Logger.error(`Failed to complete task ${taskId}: ${error.message}`);
      return false;
    }
  }

  async createRecurringTask(originalTask) {
    try {
      // Calculate next occurrence
      const nextDueDate = this.calculateNextOccurrence(originalTask.due_date, originalTask.interval);
      
      if (nextDueDate) {
        // Create new task with same properties but new due date
        const newTaskId = await this.createTask({
          title: originalTask.title,
          description: originalTask.description,
          userId: originalTask.user_jid,
          dueDate: nextDueDate.toISOString(),
          priority: originalTask.priority,
          category: originalTask.category,
          recurring: originalTask.recurring,
          interval: originalTask.interval,
          assignee: originalTask.assignee,
          projectId: originalTask.project_id
        });
        
        Logger.info(`Created recurring task ${newTaskId} for ${originalTask.title}`);
        return newTaskId;
      }
      
      return null;
    } catch (error) {
      Logger.error(`Failed to create recurring task: ${error.message}`);
      return null;
    }
  }

  calculateNextOccurrence(currentDate, interval) {
    try {
      const date = new Date(currentDate);
      const intervalMatch = interval.match(/^(\d+)([dwm])$/);
      
      if (!intervalMatch) {
        return null;
      }
      
      const amount = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2];
      
      switch (unit) {
        case 'd': // days
          date.setDate(date.getDate() + amount);
          break;
        case 'w': // weeks
          date.setDate(date.getDate() + (amount * 7));
          break;
        case 'm': // months
          date.setMonth(date.getMonth() + amount);
          break;
        default:
          return null;
      }
      
      return date;
    } catch (error) {
      Logger.error(`Failed to calculate next occurrence: ${error.message}`);
      return null;
    }
  }

  async updateTask(taskId, updates, userId) {
    try {
      // Verify task belongs to user
      const task = await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ? AND user_jid = ?
      `, [taskId, userId]);
      
      if (!task) {
        throw new Error('Task not found or access denied');
      }
      
      // Build update query dynamically
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title.trim());
      }
      
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description.trim());
      }
      
      if (updates.dueDate !== undefined) {
        fields.push('due_date = ?');
        values.push(updates.dueDate);
      }
      
      if (updates.priority !== undefined) {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (validPriorities.includes(updates.priority.toLowerCase())) {
          fields.push('priority = ?');
          values.push(updates.priority.toLowerCase());
        }
      }
      
      if (updates.category !== undefined) {
        const validCategories = ['personal', 'work', 'shopping', 'health', 'education', 'finance', 'entertainment', 'other'];
        if (validCategories.includes(updates.category.toLowerCase())) {
          fields.push('category = ?');
          values.push(updates.category.toLowerCase());
        }
      }
      
      if (updates.recurring !== undefined) {
        fields.push('recurring = ?');
        values.push(updates.recurring ? 1 : 0);
      }
      
      if (updates.interval !== undefined) {
        fields.push('interval = ?');
        values.push(updates.interval);
      }
      
      if (updates.assignee !== undefined) {
        fields.push('assignee = ?');
        values.push(updates.assignee);
      }
      
      if (updates.projectId !== undefined) {
        fields.push('project_id = ?');
        values.push(updates.projectId);
      }
      
      if (fields.length === 0) {
        return task; // No updates needed
      }
      
      values.push(taskId);
      
      // Update in database
      await database.db.run(`
        UPDATE tasks 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, values);
      
      // Reload task
      const updatedTask = await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ?
      `, [taskId]);
      
      // Update in memory
      this.tasks.set(taskId, updatedTask);
      
      // Reschedule reminder if due date changed
      if (updates.dueDate !== undefined) {
        const existingTimeout = this.reminders.get(taskId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          this.reminders.delete(taskId);
        }
        await this.scheduleTaskReminder(taskId, userId, updates.dueDate);
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
      const task = await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ? AND user_jid = ?
      `, [taskId, userId]);
      
      if (!task) {
        throw new Error('Task not found or access denied');
      }
      
      // Delete from database
      await database.db.run(`
        DELETE FROM tasks 
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
      
      Logger.info(`Deleted task ${taskId}: ${task.title}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete task ${taskId}: ${error.message}`);
      return false;
    }
  }

  async getTask(taskId) {
    try {
      return await database.db.get(`
        SELECT * FROM tasks 
        WHERE id = ?
      `, [taskId]);
    } catch (error) {
      Logger.error(`Failed to get task ${taskId}: ${error.message}`);
      return null;
    }
  }

  async getUserTasks(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        completed = false,
        category = null,
        priority = null,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        dueBefore = null,
        dueAfter = null,
        search = null,
        tags = null
      } = options;
      
      let query = `
        SELECT t.*, GROUP_CONCAT(tt.tag) as tags
        FROM tasks t
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        WHERE t.user_jid = ? AND t.completed = ?
      `;
      let params = [userId, completed ? 1 : 0];
      
      if (category) {
        query += ' AND t.category = ?';
        params.push(category.toLowerCase());
      }
      
      if (priority) {
        query += ' AND t.priority = ?';
        params.push(priority.toLowerCase());
      }
      
      if (dueBefore) {
        query += ' AND t.due_date <= ?';
        params.push(dueBefore);
      }
      
      if (dueAfter) {
        query += ' AND t.due_date >= ?';
        params.push(dueAfter);
      }
      
      if (search) {
        query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (tags && Array.isArray(tags) && tags.length > 0) {
        query += ' AND tt.tag IN (' + tags.map(() => '?').join(',') + ')';
        params.push(...tags);
      }
      
      query += ` GROUP BY t.id ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const tasks = await database.db.all(query, params);
      
      // Parse tags
      return tasks.map(task => ({
        ...task,
        tags: task.tags ? task.tags.split(',') : []
      }));
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
      
      const byPriority = await database.db.all(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        WHERE user_jid = ? AND completed = 0
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
          END
      `, [userId]);
      
      const byCategory = await database.db.all(`
        SELECT category, COUNT(*) as count 
        FROM tasks 
        WHERE user_jid = ? AND completed = 0
        GROUP BY category
        ORDER BY count DESC
      `, [userId]);
      
      return {
        total: total.count,
        completed: completed.count,
        overdue: overdue.count,
        upcoming: upcoming.count,
        completionRate: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0,
        byPriority: byPriority,
        byCategory: byCategory
      };
    } catch (error) {
      Logger.error(`Failed to get task stats: ${error.message}`);
      return { 
        total: 0, 
        completed: 0, 
        overdue: 0, 
        upcoming: 0, 
        completionRate: 0,
        byPriority: [],
        byCategory: []
      };
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

  async addTaskTags(taskId, tags) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        return;
      }
      
      // Insert tags
      for (const tag of tags) {
        await database.db.run(`
          INSERT OR IGNORE INTO task_tags (task_id, tag, added_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [taskId, tag.toLowerCase()]);
      }
      
      Logger.info(`Added ${tags.length} tags to task ${taskId}`);
    } catch (error) {
      Logger.error(`Failed to add task tags: ${error.message}`);
    }
  }

  async removeTaskTag(taskId, tag) {
    try {
      await database.db.run(`
        DELETE FROM task_tags 
        WHERE task_id = ? AND tag = ?
      `, [taskId, tag.toLowerCase()]);
      
      Logger.info(`Removed tag ${tag} from task ${taskId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove task tag: ${error.message}`);
      return false;
    }
  }

  async getTaskTags(taskId) {
    try {
      const tags = await database.db.all(`
        SELECT tag FROM task_tags 
        WHERE task_id = ?
        ORDER BY added_at DESC
      `, [taskId]);
      
      return tags.map(tag => tag.tag);
    } catch (error) {
      Logger.error(`Failed to get task tags: ${error.message}`);
      return [];
    }
  }

  async getUserTags(userId) {
    try {
      const tags = await database.db.all(`
        SELECT DISTINCT tt.tag, COUNT(*) as count
        FROM task_tags tt
        JOIN tasks t ON tt.task_id = t.id
        WHERE t.user_jid = ?
        GROUP BY tt.tag
        ORDER BY count DESC
      `, [userId]);
      
      return tags;
    } catch (error) {
      Logger.error(`Failed to get user tags: ${error.message}`);
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

  async checkTaskReminders() {
    try {
      // Get all active reminders
      const reminders = await database.db.all(`
        SELECT * FROM task_reminders 
        WHERE active = 1 AND reminder_time <= CURRENT_TIMESTAMP
      `);
      
      // Send each reminder
      for (const reminder of reminders) {
        try {
          await this.sendTaskReminder(reminder.task_id, reminder.user_jid, reminder.due_date);
          
          // Deactivate reminder
          await database.db.run(`
            UPDATE task_reminders 
            SET active = 0 
            WHERE id = ?
          `, [reminder.id]);
        } catch (error) {
          Logger.error(`Failed to send task reminder ${reminder.id}: ${error.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check task reminders: ${error.message}`);
    }
  }

  formatTask(task) {
    const priorityEmojis = {
      'urgent': '🔴',
      'high': '🟠',
      'normal': '🟡',
      'low': '🟢'
    };
    
    const statusEmoji = task.completed ? '✅' : '⏳';
    const priorityEmoji = priorityEmojis[task.priority] || '⚪';
    
    let response = `${statusEmoji} ${priorityEmoji} *${task.title}*
🆔 ${task.id}
📅 ${task.due_date ? `Due: ${new Date(task.due_date).toLocaleString()}` : 'No due date'}
📊 Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
📂 Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}
👤 ${task.assignee || 'Unassigned'}
📅 Created: ${new Date(task.created_at).toLocaleString()}`;

    if (task.description) {
      response += `\n📝 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`;
    }
    
    if (task.tags && task.tags.length > 0) {
      response += `\n🏷️ Tags: ${task.tags.join(', ')}`;
    }
    
    if (task.recurring && task.interval) {
      response += `\n🔁 Recurring: Every ${task.interval}`;
    }
    
    if (task.completed_at) {
      response += `\n✅ Completed: ${new Date(task.completed_at).toLocaleString()}`;
    }
    
    return response;
  }

  formatTaskList(tasks) {
    if (tasks.length === 0) {
      return '📋 Your task list is empty.';
    }
    
    let response = `📋 *Your Task List* (${tasks.length})\n\n`;
    
    tasks.slice(0, 20).forEach((task, index) => {
      const priorityEmojis = {
        'urgent': '🔴',
        'high': '🟠',
        'normal': '🟡',
        'low': '🟢'
      };
      
      const statusEmoji = task.completed ? '✅' : '⏳';
      const priorityEmoji = priorityEmojis[task.priority] || '⚪';
      
      response += `${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.title}
🆔 ${task.id} | 📅 ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'} | 📊 ${task.priority}
📂 ${task.category.charAt(0).toUpperCase() + task.category.slice(1)} | 👤 ${task.assignee || 'Unassigned'}\n\n`;
    });
    
    if (tasks.length > 20) {
      response += `... and ${tasks.length - 20} more tasks`;
    }
    
    return response;
  }

  formatTaskStats(stats) {
    let response = `📊 *Task Statistics*
    
📈 Total Tasks: ${stats.total}
✅ Completed: ${stats.completed}
⏳ Pending: ${stats.total - stats.completed}
⏰ Overdue: ${stats.overdue}
🔜 Upcoming: ${stats.upcoming}
📊 Completion Rate: ${stats.completionRate}%

📅 *By Priority*`;
    
    stats.byPriority.forEach(priority => {
      response += `\n${priority.priority.charAt(0).toUpperCase() + priority.priority.slice(1)}: ${priority.count}`;
    });
    
    response += `\n\n📂 *By Category*`;
    
    stats.byCategory.forEach(category => {
      response += `\n${category.category.charAt(0).toUpperCase() + category.category.slice(1)}: ${category.count}`;
    });
    
    return response;
  }
}

module.exports = new TaskService();