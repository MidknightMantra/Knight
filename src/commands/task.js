/**
 * Task Command
 * Advanced task management and tracking system
 */

const taskService = require('../services/taskService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'task',
  aliases: ['todo', 'tasks'],
  category: 'productivity',
  description: 'Advanced task management and tracking system',
  usage: '!task <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `📋 *Knight Task Manager*
        
Available subcommands:
▫️ help - Show this help
▫️ add <title> [--due <date>] [--priority <level>] [--category <type>] [--recurring <interval>] [--tags <tag1,tag2>] - Add new task
▫️ list [--completed] [--category <type>] [--priority <level>] [--search <query>] - List tasks
▫️ view <task_id> - View task details
▫️ complete <task_id> - Mark task as complete
▫️ update <task_id> <field> <value> - Update task field
▫️ delete <task_id> - Delete a task
▫️ stats - Show task statistics
▫️ overdue - Show overdue tasks
▫️ upcoming - Show upcoming tasks
▫️ search <query> - Search tasks
▫️ tags - Show your task tags
▫️ add-tag <task_id> <tag> - Add tag to task
▫️ remove-tag <task_id> <tag> - Remove tag from task
▫️ portfolio - Show your task portfolio
▫️ add-to-portfolio <task_id> - Add task to portfolio
▫️ remove-from-portfolio <portfolio_id> - Remove task from portfolio
▫️ projects - List your projects
▫️ project <project_id> - View project details
▫️ create-project <name> [description] - Create new project
▫️ add-to-project <task_id> <project_id> - Add task to project
▫️ remove-from-project <task_id> <project_id> - Remove task from project

Examples:
!task add "Buy groceries" --due "2025-12-25 18:00" --priority high --category shopping
!task add "Team meeting" --due "14:30" --priority normal --category work --recurring 1w
!task list
!task list --completed
!task list --category work --priority high
!task view 123
!task complete 123
!task update 123 priority urgent
!task delete 123
!task stats
!task overdue
!task upcoming
!task search "meeting"
!task tags
!task add-tag 123 important
!task remove-tag 123 important
!task portfolio
!task add-to-portfolio 123
!task remove-from-portfolio 456
!task projects
!task project 789
!task create-project "Website Redesign" "Redesign company website"
!task add-to-project 123 789
!task remove-from-project 123 789`;

      case 'add':
        if (args.length < 2) {
          return `❌ Usage: !task add "<title>" [--due <date>] [--priority <level>] [--category <type>] [--recurring <interval>] [--tags <tag1,tag2>]
          
Examples:
!task add "Buy groceries" --due "2025-12-25 18:00" --priority high --category shopping
!task add "Team meeting" --due "14:30" --priority normal --category work --recurring 1w
!task add "Doctor appointment" --due "2025-12-30 10:00" --priority high --category health --tags medical,appointment
!task add "Read book" --priority low --category personal --tags reading,learning
!task add "Pay bills" --due "2025-12-15" --priority high --category finance --tags payment,bills`;
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
            interval: null,
            tags: [],
            assignee: null,
            projectId: null
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
            options.category = categoryMatch[1].toLowerCase();
          }
          
          // Parse --description option
          const descMatch = input.match(/--description\s+"([^"]+)"/);
          if (descMatch) {
            options.description = descMatch[1];
          }
          
          // Parse --recurring option
          const recurringMatch = input.match(/--recurring\s+(\S+)/);
          if (recurringMatch) {
            options.recurring = true;
            options.interval = recurringMatch[1];
          }
          
          // Parse --tags option
          const tagsMatch = input.match(/--tags\s+"([^"]+)"/) || input.match(/--tags\s+(\S+)/);
          if (tagsMatch) {
            options.tags = tagsMatch[1].split(',').map(tag => tag.trim().toLowerCase());
          }
          
          // Parse --assignee option
          const assigneeMatch = input.match(/--assignee\s+"([^"]+)"/) || input.match(/--assignee\s+(\S+)/);
          if (assigneeMatch) {
            options.assignee = assigneeMatch[1];
          }
          
          // Parse --project option
          const projectMatch = input.match(/--project\s+(\d+)/);
          if (projectMatch) {
            options.projectId = parseInt(projectMatch[1]);
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding task: "${title}"...` 
          });
          
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
          
          if (options.recurring && options.interval) {
            response += `\n🔁 Recurring: Every ${options.interval}`;
          }
          
          if (options.tags.length > 0) {
            response += `\n🏷️ Tags: ${options.tags.join(', ')}`;
          }
          
          if (options.assignee) {
            response += `\n👤 Assignee: ${options.assignee}`;
          }
          
          if (options.projectId) {
            response += `\n📁 Project: ${options.projectId}`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task add error: ${error.message}`);
          return `❌ Failed to add task: ${error.message}`;
        }

      case 'list':
        try {
          // Parse options
          const options = {
            limit: 20,
            offset: 0,
            completed: false,
            category: null,
            priority: null,
            sortBy: 'created_at',
            sortOrder: 'DESC',
            search: null,
            tags: null
          };
          
          // Parse --completed option
          if (args.includes('--completed')) {
            options.completed = true;
          }
          
          // Parse --category option
          const categoryIndex = args.indexOf('--category');
          if (categoryIndex !== -1 && args[categoryIndex + 1]) {
            options.category = args[categoryIndex + 1].toLowerCase();
          }
          
          // Parse --priority option
          const priorityIndex = args.indexOf('--priority');
          if (priorityIndex !== -1 && args[priorityIndex + 1]) {
            options.priority = args[priorityIndex + 1].toLowerCase();
          }
          
          // Parse --search option
          const searchIndex = args.indexOf('--search');
          if (searchIndex !== -1 && args[searchIndex + 1]) {
            options.search = args[searchIndex + 1];
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting task list${options.completed ? ' (completed)' : ''}...` 
          });
          
          const tasks = await taskService.getUserTasks(userId, options);
          
          if (tasks.length === 0) {
            return `📋 Your task list is empty${options.completed ? ' (completed)' : ''}.
            
Add tasks with: !task add "<title>" [options]

Examples:
!task add "Buy groceries"
!task add "Team meeting" --due "14:30" --priority normal --category work`;
          }
          
          return taskService.formatTaskList(tasks);
        } catch (error) {
          Logger.error(`Task list error: ${error.message}`);
          return `❌ Failed to get task list: ${error.message}`;
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
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting task details for #${taskId}...` 
          });
          
          const task = await taskService.getTask(taskId);
          
          if (!task || task.user_jid !== userId) {
            return `❌ Task #${taskId} not found or access denied.`;
          }
          
          // Get task tags
          const tags = await taskService.getTaskTags(taskId);
          task.tags = tags;
          
          return taskService.formatTask(task);
        } catch (error) {
          Logger.error(`Task view error: ${error.message}`);
          return `❌ Failed to get task details: ${error.message}`;
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
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Completing task #${taskId}...` 
          });
          
          const success = await taskService.completeTask(taskId, userId);
          
          return success ? 
            `✅ Task #${taskId} marked as complete!` : 
            `❌ Failed to complete task #${taskId}. Task not found or access denied.`;
        } catch (error) {
          Logger.error(`Task complete error: ${error.message}`);
          return `❌ Failed to complete task: ${error.message}`;
        }

      case 'update':
        if (args.length < 4) {
          return `❌ Usage: !task update <task_id> <field> <value>
          
Fields: title, description, due_date, priority, category, recurring, interval, assignee, project_id

Examples:
!task update 123 title "New task title"
!task update 123 priority high
!task update 123 category work
!task update 123 due_date "2025-12-25 18:00"
!task update 123 recurring true
!task update 123 interval 1w
!task update 123 assignee "@user"
!task update 123 project_id 456`;
        }
        
        try {
          const taskId = parseInt(args[1]);
          const field = args[2].toLowerCase();
          const value = args.slice(3).join(' ');
          
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          // Validate field
          const validFields = ['title', 'description', 'due_date', 'priority', 'category', 'recurring', 'interval', 'assignee', 'project_id'];
          if (!validFields.includes(field)) {
            return `❌ Invalid field. Valid fields: ${validFields.join(', ')}`;
          }
          
          // Parse value based on field type
          let parsedValue = value;
          if (field === 'due_date') {
            let dueDate;
            if (value.includes('-') && value.includes(':')) {
              dueDate = new Date(value);
            } else if (value.includes('-')) {
              dueDate = new Date(`${value} 23:59`);
            } else if (value.includes(':')) {
              const today = new Date();
              const [hours, minutes] = value.split(':');
              dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            } else {
              return '❌ Invalid date format. Use YYYY-MM-DD HH:MM or YYYY-MM-DD';
            }
            
            if (isNaN(dueDate.getTime())) {
              return '❌ Invalid date format.';
            }
            
            parsedValue = dueDate.toISOString();
          } else if (field === 'recurring') {
            parsedValue = value.toLowerCase() === 'true' || value === '1';
          } else if (field === 'priority') {
            const validPriorities = ['low', 'normal', 'high', 'urgent'];
            if (!validPriorities.includes(value.toLowerCase())) {
              return `❌ Invalid priority. Valid priorities: ${validPriorities.join(', ')}`;
            }
            parsedValue = value.toLowerCase();
          } else if (field === 'category') {
            const validCategories = ['personal', 'work', 'shopping', 'health', 'education', 'finance', 'entertainment', 'other'];
            if (!validCategories.includes(value.toLowerCase())) {
              return `❌ Invalid category. Valid categories: ${validCategories.join(', ')}`;
            }
            parsedValue = value.toLowerCase();
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Updating task #${taskId} ${field} to "${parsedValue}"...` 
          });
          
          const updates = {};
          updates[field] = parsedValue;
          
          const updatedTask = await taskService.updateTask(taskId, updates, userId);
          
          return updatedTask ? 
            `✅ Task #${taskId} updated successfully!
📝 ${field}: ${parsedValue}` : 
            `❌ Failed to update task #${taskId}. Task not found or access denied.`;
        } catch (error) {
          Logger.error(`Task update error: ${error.message}`);
          return `❌ Failed to update task: ${error.message}`;
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
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Deleting task #${taskId}...` 
          });
          
          const success = await taskService.deleteTask(taskId, userId);
          
          return success ? 
            `✅ Task #${taskId} deleted successfully!` : 
            `❌ Failed to delete task #${taskId}. Task not found or access denied.`;
        } catch (error) {
          Logger.error(`Task delete error: ${error.message}`);
          return `❌ Failed to delete task: ${error.message}`;
        }

      case 'stats':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting task statistics...` 
          });
          
          const stats = await taskService.getTaskStats(userId);
          
          return taskService.formatTaskStats(stats);
        } catch (error) {
          Logger.error(`Task stats error: ${error.message}`);
          return `❌ Failed to get task statistics: ${error.message}`;
        }

      case 'overdue':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting overdue tasks...` 
          });
          
          const overdueTasks = await taskService.getOverdueTasks(userId);
          
          if (overdueTasks.length === 0) {
            return `✅ No overdue tasks! Great job staying on track.`;
          }
          
          let response = `⏰ *Overdue Tasks* (${overdueTasks.length})\n\n`;
          
          overdueTasks.slice(0, 10).forEach((task, index) => {
            const daysOverdue = Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24));
            const priorityEmojis = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            };
            const priorityEmoji = priorityEmojis[task.priority] || '⚪';
            
            response += `${index + 1}. ${priorityEmoji} ${task.title}
🆔 ${task.id}
📅 Was due: ${new Date(task.due_date).toLocaleDateString()}
⏰ ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue
📊 Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
📂 Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}\n\n`;
          });
          
          if (overdueTasks.length > 10) {
            response += `... and ${overdueTasks.length - 10} more overdue tasks`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task overdue error: ${error.message}`);
          return `❌ Failed to get overdue tasks: ${error.message}`;
        }

      case 'upcoming':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting upcoming tasks...` 
          });
          
          const upcomingTasks = await taskService.getUpcomingTasks(userId, 7);
          
          if (upcomingTasks.length === 0) {
            return `📭 No tasks due in the next 7 days.`;
          }
          
          let response = `🔜 *Upcoming Tasks* (Next 7 days)\n\n`;
          
          upcomingTasks.slice(0, 15).forEach((task, index) => {
            const dueDate = new Date(task.due_date);
            const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const priorityEmojis = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            };
            const priorityEmoji = priorityEmojis[task.priority] || '⚪';
            
            response += `${index + 1}. ${priorityEmoji} ${task.title}
🆔 ${task.id}
📅 Due: ${dueDate.toLocaleDateString()} (${daysUntil} day${daysUntil !== 1 ? 's' : ''})
📊 Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
📂 Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}\n\n`;
          });
          
          if (upcomingTasks.length > 15) {
            response += `... and ${upcomingTasks.length - 15} more upcoming tasks`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task upcoming error: ${error.message}`);
          return `❌ Failed to get upcoming tasks: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return '❌ Usage: !task search <query>';
        }
        
        try {
          const query = args.slice(1).join(' ');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔍 Searching tasks for "${query}"...` 
          });
          
          const tasks = await taskService.searchTasks(userId, query, {
            limit: 20
          });
          
          if (tasks.length === 0) {
            return `🔍 No tasks found matching "${query}".`;
          }
          
          let response = `🔍 *Search Results for "${query}"* (${tasks.length})\n\n`;
          
          tasks.slice(0, 10).forEach((task, index) => {
            const statusEmoji = task.completed ? '✅' : '⏳';
            const priorityEmojis = {
              'urgent': '🔴',
              'high': '🟠',
              'normal': '🟡',
              'low': '🟢'
            };
            const priorityEmoji = priorityEmojis[task.priority] || '⚪';
            
            response += `${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.title}
🆔 ${task.id}
📅 ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
📊 Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
📂 Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}\n\n`;
          });
          
          if (tasks.length > 10) {
            response += `... and ${tasks.length - 10} more results`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task search error: ${error.message}`);
          return `❌ Failed to search tasks: ${error.message}`;
        }

      case 'tags':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your task tags...` 
          });
          
          const tags = await taskService.getUserTags(userId);
          
          if (tags.length === 0) {
            return `🏷️ You don't have any task tags yet.
            
Add tags to tasks with: !task add-tag <task_id> <tag>

Examples:
!task add-tag 123 important
!task add-tag 123 work
!task add-tag 123 personal`;
          }
          
          let response = `🏷️ *Your Task Tags* (${tags.length})\n\n`;
          
          tags.slice(0, 20).forEach((tag, index) => {
            response += `${index + 1}. ${tag.tag} (${tag.count} tasks)\n`;
          });
          
          if (tags.length > 20) {
            response += `... and ${tags.length - 20} more tags`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task tags error: ${error.message}`);
          return `❌ Failed to get your task tags: ${error.message}`;
        }

      case 'add-tag':
        if (args.length < 3) {
          return '❌ Usage: !task add-tag <task_id> <tag>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          const tag = args[2].toLowerCase();
          
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          if (!tag || tag.trim() === '') {
            return '❌ Please provide a valid tag.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding tag "${tag}" to task #${taskId}...` 
          });
          
          await taskService.addTaskTags(taskId, [tag]);
          
          return `✅ Added tag "${tag}" to task #${taskId} successfully!`;
        } catch (error) {
          Logger.error(`Task add-tag error: ${error.message}`);
          return `❌ Failed to add tag: ${error.message}`;
        }

      case 'remove-tag':
        if (args.length < 3) {
          return '❌ Usage: !task remove-tag <task_id> <tag>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          const tag = args[2].toLowerCase();
          
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          if (!tag || tag.trim() === '') {
            return '❌ Please provide a valid tag.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing tag "${tag}" from task #${taskId}...` 
          });
          
          const success = await taskService.removeTaskTag(taskId, tag);
          
          return success ? 
            `✅ Removed tag "${tag}" from task #${taskId} successfully!` : 
            `❌ Failed to remove tag "${tag}" from task #${taskId}.`;
        } catch (error) {
          Logger.error(`Task remove-tag error: ${error.message}`);
          return `❌ Failed to remove tag: ${error.message}`;
        }

      case 'portfolio':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your task portfolio...` 
          });
          
          const portfolio = await taskService.getPortfolio(userId);
          
          if (portfolio.length === 0) {
            return `💼 Your task portfolio is empty.
            
Add tasks to your portfolio with: !task add-to-portfolio <task_id>

Examples:
!task add-to-portfolio 123
!task add-to-portfolio 456
!task add-to-portfolio 789`;
          }
          
          let response = `💼 *Your Task Portfolio* (${portfolio.length})\n\n`;
          
          portfolio.slice(0, 15).forEach((item, index) => {
            response += `${index + 1}. ${item.title}
🆔 ${item.id}
📅 Added: ${new Date(item.added_at).toLocaleDateString()}
📊 Priority: ${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
📂 Category: ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}\n\n`;
          });
          
          if (portfolio.length > 15) {
            response += `... and ${portfolio.length - 15} more portfolio items`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task portfolio error: ${error.message}`);
          return `❌ Failed to get your task portfolio: ${error.message}`;
        }

      case 'add-to-portfolio':
        if (args.length < 2) {
          return '❌ Usage: !task add-to-portfolio <task_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          
          if (isNaN(taskId)) {
            return '❌ Please provide a valid task ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding task #${taskId} to your portfolio...` 
          });
          
          const portfolioId = await taskService.addToPortfolio(userId, taskId);
          
          return portfolioId ? 
            `✅ Added task #${taskId} to your portfolio successfully!
🆔 Portfolio ID: ${portfolioId}` : 
            `❌ Failed to add task #${taskId} to your portfolio.`;
        } catch (error) {
          Logger.error(`Task add-to-portfolio error: ${error.message}`);
          return `❌ Failed to add to portfolio: ${error.message}`;
        }

      case 'remove-from-portfolio':
        if (args.length < 2) {
          return '❌ Usage: !task remove-from-portfolio <portfolio_id>';
        }
        
        try {
          const portfolioId = parseInt(args[1]);
          
          if (isNaN(portfolioId)) {
            return '❌ Please provide a valid portfolio ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing item #${portfolioId} from your portfolio...` 
          });
          
          const success = await taskService.removeFromPortfolio(portfolioId, userId);
          
          return success ? 
            `✅ Removed item #${portfolioId} from your portfolio successfully!` : 
            `❌ Failed to remove item #${portfolioId} from your portfolio.`;
        } catch (error) {
          Logger.error(`Task remove-from-portfolio error: ${error.message}`);
          return `❌ Failed to remove from portfolio: ${error.message}`;
        }

      case 'projects':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your projects...` 
          });
          
          const projects = await taskService.getProjects(userId);
          
          if (projects.length === 0) {
            return `📁 You don't have any projects yet.
            
Create a project with: !task create-project <name> [description]

Examples:
!task create-project "Website Redesign" "Redesign company website"
!task create-project "Mobile App" "Develop mobile application"
!task create-project "Marketing Campaign" "Launch marketing campaign"`;
          }
          
          let response = `📁 *Your Projects* (${projects.length})\n\n`;
          
          projects.slice(0, 10).forEach((project, index) => {
            response += `${index + 1}. ${project.name}
🆔 ${project.id}
📅 Created: ${new Date(project.created_at).toLocaleDateString()}
📊 Tasks: ${project.task_count || 0}
${project.completed ? '✅ Completed' : '⏳ Active'}\n\n`;
          });
          
          if (projects.length > 10) {
            response += `... and ${projects.length - 10} more projects`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task projects error: ${error.message}`);
          return `❌ Failed to get your projects: ${error.message}`;
        }

      case 'project':
        if (args.length < 2) {
          return '❌ Usage: !task project <project_id>';
        }
        
        try {
          const projectId = parseInt(args[1]);
          
          if (isNaN(projectId)) {
            return '❌ Please provide a valid project ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting project #${projectId} details...` 
          });
          
          const project = await taskService.getProject(projectId, userId);
          
          if (!project) {
            return `❌ Project #${projectId} not found or access denied.`;
          }
          
          const projectTasks = await taskService.getProjectTasks(projectId);
          
          let response = `📁 *Project: ${project.name}*
          
🆔 ID: ${project.id}
📝 Description: ${project.description || 'No description'}
📅 Created: ${new Date(project.created_at).toLocaleDateString()}
📊 Tasks: ${projectTasks.length}
${project.completed ? '✅ Completed' : '⏳ Active'}
${project.completed_at ? `✅ Completed: ${new Date(project.completed_at).toLocaleDateString()}` : ''}\n\n`;
          
          if (projectTasks.length > 0) {
            response += `📋 *Project Tasks* (${projectTasks.length})\n\n`;
            
            projectTasks.slice(0, 10).forEach((task, index) => {
              const statusEmoji = task.completed ? '✅' : '⏳';
              const priorityEmojis = {
                'urgent': '🔴',
                'high': '🟠',
                'normal': '🟡',
                'low': '🟢'
              };
              const priorityEmoji = priorityEmojis[task.priority] || '⚪';
              
              response += `${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.title}
🆔 ${task.id}
📅 ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
📊 Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
📂 Category: ${task.category.charAt(0).toUpperCase() + task.category.slice(1)}\n\n`;
            });
            
            if (projectTasks.length > 10) {
              response += `... and ${projectTasks.length - 10} more tasks`;
            }
          }
          
          return response;
        } catch (error) {
          Logger.error(`Task project error: ${error.message}`);
          return `❌ Failed to get project details: ${error.message}`;
        }

      case 'create-project':
        if (args.length < 2) {
          return `❌ Usage: !task create-project <name> [description]
          
Examples:
!task create-project "Website Redesign" "Redesign company website"
!task create-project "Mobile App" "Develop mobile application"
!task create-project "Marketing Campaign" "Launch marketing campaign"`;
        }
        
        try {
          const name = args[1];
          const description = args.slice(2).join(' ') || '';
          
          if (!name || name.trim() === '') {
            return '❌ Please provide a project name.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Creating project "${name}"...` 
          });
          
          const projectId = await taskService.createProject(userId, name, description);
          
          return projectId ? 
            `✅ Project "${name}" created successfully!
🆔 ID: ${projectId}
📝 Description: ${description || 'No description'}` : 
            `❌ Failed to create project "${name}".`;
        } catch (error) {
          Logger.error(`Task create-project error: ${error.message}`);
          return `❌ Failed to create project: ${error.message}`;
        }

      case 'add-to-project':
        if (args.length < 3) {
          return '❌ Usage: !task add-to-project <task_id> <project_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          const projectId = parseInt(args[2]);
          
          if (isNaN(taskId) || isNaN(projectId)) {
            return '❌ Please provide valid task and project IDs.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding task #${taskId} to project #${projectId}...` 
          });
          
          const success = await taskService.addToProject(taskId, projectId, userId);
          
          return success ? 
            `✅ Added task #${taskId} to project #${projectId} successfully!` : 
            `❌ Failed to add task #${taskId} to project #${projectId}. Task or project not found.`;
        } catch (error) {
          Logger.error(`Task add-to-project error: ${error.message}`);
          return `❌ Failed to add task to project: ${error.message}`;
        }

      case 'remove-from-project':
        if (args.length < 3) {
          return '❌ Usage: !task remove-from-project <task_id> <project_id>';
        }
        
        try {
          const taskId = parseInt(args[1]);
          const projectId = parseInt(args[2]);
          
          if (isNaN(taskId) || isNaN(projectId)) {
            return '❌ Please provide valid task and project IDs.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing task #${taskId} from project #${projectId}...` 
          });
          
          const success = await taskService.removeFromProject(taskId, projectId, userId);
          
          return success ? 
            `✅ Removed task #${taskId} from project #${projectId} successfully!` : 
            `❌ Failed to remove task #${taskId} from project #${projectId}. Task or project not found.`;
        } catch (error) {
          Logger.error(`Task remove-from-project error: ${error.message}`);
          return `❌ Failed to remove task from project: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !task help for available commands`;
    }
  }
};