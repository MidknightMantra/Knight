/**
 * Task Command
 * Personal task management and tracking system
 */

const taskService = require('../services/taskService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'task',
  aliases: ['todo', 'tasks'],
  category: 'utility',
  description: 'Personal task management and tracking system',
  usage: '!task <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `📝 *Knight Task Manager*
        
Available subcommands:
▫️ help - Show this help
▫️ add <title> - Add a new task
▫️ list - List your tasks
▫️ complete <id> - Mark task as complete
▫️ delete <id> - Delete a task
▫️ update <id> <field> <value> - Update task field
▫️ view <id> - View task details
▫️ stats - Show task statistics
▫️ overdue - Show overdue tasks
▫️ upcoming - Show upcoming tasks
▫️ search <term> - Search tasks
▫️ categories - Show task categories
▫️ priorities - Show priority levels

Examples:
!task add "Buy groceries" --due "2025-12-25 18:00" --priority high
!task list
!task complete 123
!task delete 123
!task stats
!task overdue`;

      case 'add':
        if (args.length < 2) {
          return `❌ Usage: !task add "<title>" [--due "YYYY-MM-DD HH:MM"] [--priority low|normal|high|urgent] [--category category]
          
Examples:
!task add "Complete project report"
!task add "Team meeting" --due "2025-12-25 14:00" --priority high
!task add "Grocery shopping" --category personal --priority normal`;
        }
        
        try {
          // Parse task title and options
          const input = args.slice(1).join(' ');
          const title = input.split('--')[0].trim();
          
          if (!title) {
            return '❌ Please provide a task title.';
          }
          
          // Parse options
          const options = {
            title: title,
            userId: userId,
            description: '',
            dueDate: null,
            priority: 'normal',
            category: 'personal',
            recurring: false,
            interval: null
          };
          
          // Parse --due option
          const dueMatch = input.match(/--due\s+"([^"]+)"/) || input.match(/--due\s+(\S+)/);
          if (dueMatch) {
            const dueString = dueMatch[1];
            let dueDate;
            
            if (dueString.includes('-') && dueString.includes(':')) {
              // Full datetime: YYYY-MM-DD HH:MM
              dueDate = new Date(dueString);
            } else if (dueString.includes('-')) {
              // Date only: YYYY-MM-DD
              dueDate = new Date(`${dueString} 23:59`);
            } else if (dueString.includes(':')) {
              // Time only: HH:MM (today)
              const today = new Date();
              const [hours, minutes] = dueString.split(':');
              dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            } else {
              // Days from now: +3d, +1w, etc.
              const offsetMatch = dueString.match(/^(\+\d+)([dwmy])$/);
              if (offsetMatch) {
                const amount = parseInt(offsetMatch[1].replace('+', ''));
                const unit = offsetMatch[2];
                const now = new Date();
                
                switch (unit) {
                  case 'd': // days
                    dueDate = new Date(now.setDate(now.getDate() + amount));
                    break;
                  case 'w': // weeks
                    dueDate = new Date(now.setDate(now.getDate() + (amount * 7)));
                    break;
                  case 'm': // months
                    dueDate = new Date(now.setMonth(now.getMonth() + amount));
                    break;
                  case 'y': // years
                    dueDate = new Date(now.setFullYear(now.getFullYear() + amount));
                    break;
                }
              }
            }
            
            if (dueDate && !isNaN(dueDate.getTime())) {
              options.dueDate = dueDate.toISOString();
            }
          }
          
          // Parse --priority option
          const priorityMatch = input.match(/--priority\s+(\w+)/);
          if (priorityMatch) {
            const priority = priorityMatch[1].toLowerCase();
            if (['low', 'normal', 'high', 'urgent'].includes(priority)) {
              options.priority = priority;
            }
          }
          
          // Parse --category option
          const categoryMatch = input.match(/--category\s+(\w+)/);
          if (categoryMatch) {
            options.category = categoryMatch[1];
          }
          
          // Parse --description option
          const descMatch = input.match(/--description\s+"([^"]+)"/);
          if (descMatch) {
            options.description = descMatch[1];
          }
          
          const taskId = await taskService.createTask(options);
          
          let response = `✅ Task added successfully!
🆔 ID: ${taskId}
📝 Title: ${title}`;
          
          if (options.dueDate) {
            response += `\n⏰ Due: ${new Date(options.dueDate).toLocaleString()}`;
          }
          
          if (options.priority !== 'normal') {
            response += `\n🚨 Priority: ${options.priority}`;
          }
          
          if (options.category !== 'personal') {
            response += `\n📂 Category: ${options.category}`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task add error: ${error.message}`);
          return `❌ Failed to add task: ${error.message}`;
        }

      case 'list':
        try {
          const tasks = await taskService.getUserTasks(userId, {
            limit: 15,
            completed: false,
            sortBy: 'due_date',
            sortOrder: 'ASC'
          });
          
          if (tasks.length === 0) {
            return '📝 No active tasks found.';
          }
          
          let response = `📝 *Active Tasks* (${tasks.length})\n\n`;
          
          tasks.forEach((task, index) => {
            const priorityEmoji = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            }[task.priority] || '⚪';
            
            const dueInfo = task.due_date ? 
              `⏰ ${new Date(task.due_date).toLocaleString()}` : 
              'No due date';
            
            response += `${index + 1}. ${priorityEmoji} ${task.title}
${dueInfo}
📂 ${task.category}
🆔 ${task.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task list error: ${error.message}`);
          return `❌ Failed to list tasks: ${error.message}`;
        }

      case 'complete':
        if (args.length < 2) {
          return '❌ Usage: !task complete <task_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          const success = await taskService.completeTask(taskId, userId);
          
          return success ? 
            `✅ Task ${taskId} marked as complete!` : 
            `❌ Failed to complete task ${taskId}. Task not found or access denied.`;
        } catch (error) {
          Logger.error(`Task complete error: ${error.message}`);
          return `❌ Failed to complete task: ${error.message}`;
        }

      case 'delete':
        if (args.length < 2) {
          return '❌ Usage: !task delete <task_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          const success = await taskService.deleteTask(taskId, userId);
          
          return success ? 
            `✅ Task ${taskId} deleted successfully!` : 
            `❌ Failed to delete task ${taskId}. Task not found or access denied.`;
        } catch (error) {
          Logger.error(`Task delete error: ${error.message}`);
          return `❌ Failed to delete task: ${error.message}`;
        }

      case 'update':
        if (args.length < 4) {
          return '❌ Usage: !task update <task_id> <field> <value>\nFields: title, description, due, priority, category';
        }
        
        try {
          const taskId = parseInt(args[1]);
          const field = args[2].toLowerCase();
          const value = args.slice(3).join(' ');
          
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          const updates = {};
          
          switch (field) {
            case 'title':
              updates.title = value;
              break;
            case 'description':
              updates.description = value;
              break;
            case 'due':
              let dueDate;
              if (value.includes('-') && value.includes(':')) {
                dueDate = new Date(value);
              } else if (value.includes('-')) {
                dueDate = new Date(`${value} 23:59`);
              } else if (value.includes(':')) {
                const today = new Date();
                const [hours, minutes] = value.split(':');
                dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
              }
              
              if (dueDate && !isNaN(dueDate.getTime())) {
                updates.dueDate = dueDate.toISOString();
              } else {
                return '❌ Invalid date format. Use YYYY-MM-DD HH:MM or YYYY-MM-DD';
              }
              break;
            case 'priority':
              if (['low', 'normal', 'high', 'urgent'].includes(value.toLowerCase())) {
                updates.priority = value.toLowerCase();
              } else {
                return '❌ Invalid priority. Use: low, normal, high, urgent';
              }
              break;
            case 'category':
              updates.category = value;
              break;
            default:
              return '❌ Invalid field. Use: title, description, due, priority, category';
          }
          
          const updatedTask = await taskService.updateTask(taskId, updates, userId);
          
          return `✅ Task updated successfully!
🆔 ${updatedTask.id}: ${updatedTask.title}`;
        } catch (error) {
          Logger.error(`Task update error: ${error.message}`);
          return `❌ Failed to update task: ${error.message}`;
        }

      case 'view':
        if (args.length < 2) {
          return '❌ Usage: !task view <task_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          const task = await taskService.getTask(taskId);
          
          if (!task || task.user_jid !== userId) {
            return `❌ Task ${taskId} not found or access denied.`;
          }
          
          const priorityEmoji = {
            'urgent': '🔴',
            'high': '🟠',
            'normal': '🟡',
            'low': '🟢'
          }[task.priority] || '⚪';
          
          const status = task.completed ? '✅ Completed' : '⏳ Active';
          
          let response = `📝 *Task Details*
          
🆔 ID: ${task.id}
${priorityEmoji} Title: ${task.title}
${status}
📅 Created: ${new Date(task.created_at).toLocaleString()}`;

          if (task.description) {
            response += `\n📄 Description: ${task.description}`;
          }
          
          if (task.due_date) {
            response += `\n⏰ Due: ${new Date(task.due_date).toLocaleString()}`;
          }
          
          response += `\n📂 Category: ${task.category}
🚨 Priority: ${task.priority}`;
          
          if (task.completed_at) {
            response += `\n✅ Completed: ${new Date(task.completed_at).toLocaleString()}`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task view error: ${error.message}`);
          return `❌ Failed to view task: ${error.message}`;
        }

      case 'stats':
        try {
          const stats = await taskService.getTaskStats(userId);
          
          return `📊 *Task Statistics*
          
📝 Total Tasks: ${stats.total}
✅ Completed: ${stats.completed}
⏰ Overdue: ${stats.overdue}
🔜 Upcoming: ${stats.upcoming}
📈 Completion Rate: ${stats.completionRate}%`;
        } catch (error) {
          Logger.error(`Task stats error: ${error.message}`);
          return `❌ Failed to get task statistics: ${error.message}`;
        }

      case 'overdue':
        try {
          const overdueTasks = await taskService.getOverdueTasks(userId);
          
          if (overdueTasks.length === 0) {
            return '✅ No overdue tasks! Great job staying on track.';
          }
          
          let response = `⏰ *Overdue Tasks* (${overdueTasks.length})\n\n`;
          
          overdueTasks.forEach((task, index) => {
            const daysOverdue = Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24));
            response += `${index + 1}. 🔴 ${task.title}
📅 Was due: ${new Date(task.due_date).toLocaleDateString()}
⏰ ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue
🆔 ${task.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task overdue error: ${error.message}`);
          return `❌ Failed to get overdue tasks: ${error.message}`;
        }

      case 'upcoming':
        try {
          const upcomingTasks = await taskService.getUpcomingTasks(userId, 7);
          
          if (upcomingTasks.length === 0) {
            return '📭 No tasks due in the next 7 days.';
          }
          
          let response = `🔜 *Upcoming Tasks* (Next 7 days)\n\n`;
          
          upcomingTasks.forEach((task, index) => {
            response += `${index + 1}. 🟡 ${task.title}
⏰ Due: ${new Date(task.due_date).toLocaleString()}
🆔 ${task.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task upcoming error: ${error.message}`);
          return `❌ Failed to get upcoming tasks: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return '❌ Usage: !task search <search_term>';
        }
        
        try {
          const searchTerm = args.slice(1).join(' ');
          const searchResults = await taskService.searchTasks(userId, searchTerm, {
            limit: 10
          });
          
          if (searchResults.length === 0) {
            return `🔍 No tasks found matching "${searchTerm}".`;
          }
          
          let response = `🔍 *Search Results for "${searchTerm}"* (${searchResults.length})\n\n`;
          
          searchResults.forEach((task, index) => {
            const priorityEmoji = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            }[task.priority] || '⚪';
            
            const status = task.completed ? '✅' : '⏳';
            
            response += `${index + 1}. ${priorityEmoji} ${status} ${task.title}
📅 ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
🆔 ${task.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task search error: ${error.message}`);
          return `❌ Failed to search tasks: ${error.message}`;
        }

      case 'categories':
        try {
          const categories = await database.db.all(`
            SELECT category, COUNT(*) as count 
            FROM tasks 
            WHERE user_jid = ? 
            GROUP BY category 
            ORDER BY count DESC
          `, [userId]);
          
          if (categories.length === 0) {
            return '📂 No task categories found.';
          }
          
          let response = `📂 *Task Categories*\n\n`;
          
          categories.forEach((cat, index) => {
            response += `${index + 1}. ${cat.category} (${cat.count} tasks)\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task categories error: ${error.message}`);
          return `❌ Failed to get categories: ${error.message}`;
        }

      case 'priorities':
        try {
          const priorities = await database.db.all(`
            SELECT priority, COUNT(*) as count 
            FROM tasks 
            WHERE user_jid = ? 
            GROUP BY priority 
            ORDER BY 
              CASE priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
              END
          `, [userId]);
          
          if (priorities.length === 0) {
            return '🚨 No task priorities found.';
          }
          
          let response = `🚨 *Task Priorities*\n\n`;
          
          priorities.forEach((priority, index) => {
            const emoji = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            }[priority.priority] || '⚪';
            
            response += `${index + 1}. ${emoji} ${priority.priority} (${priority.count} tasks)\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Task priorities error: ${error.message}`);
          return `❌ Failed to get priorities: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !task help for available commands`;
    }
  }
};