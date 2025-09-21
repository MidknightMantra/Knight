/**
 * Financial Command
 * Comprehensive personal finance tracking and management system
 */

const financialService = require('../services/financialService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'financial',
  aliases: ['finance', 'money', 'budget'],
  category: 'finance',
  description: 'Comprehensive personal finance tracking and management system',
  usage: '!financial <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `💰 *Knight Financial Tracker*
        
Available subcommands:
▫️ help - Show this help
▫️ expense <amount> <category> [description] [currency] - Add expense
▫️ income <amount> <source> [description] [currency] - Add income
▫️ budget <category> <amount> [period] [currency] - Set budget
▫️ goal <type> <amount> [deadline] [description] - Set financial goal
▫️ alert <type> <threshold> [condition] [description] - Set financial alert
▫️ summary [period] - Show financial summary
▫️ insights - Get financial insights
▫️ expenses [category] [limit] - List expenses
▫️ incomes [source] [limit] - List incomes
▫️ budgets [category] - List budgets
▫️ goals [type] - List goals
▫️ alerts [type] - List alerts
▫️ stats - Show financial statistics
▫️ portfolio - Show investment portfolio
▫️ add-to-portfolio <symbol> <quantity> <price> - Add to portfolio
▫️ remove-from-portfolio <portfolio_id> - Remove from portfolio
▫️ accounts - Show financial accounts
▫️ add-account <name> <type> [balance] [currency] - Add account
▫️ remove-account <account_id> - Remove account
▫️ categories - Show custom categories
▫️ add-category <name> <type> - Add custom category
▫️ remove-category <category_id> - Remove category
▫️ reports - Show financial reports
▫️ generate-report [type] [period] - Generate financial report
▫️ reminders - Show financial reminders
▫️ add-reminder <type> <amount> <description> <date> - Add reminder
▫️ remove-reminder <reminder_id> - Remove reminder

Examples:
!financial expense 25.50 food "Lunch at restaurant" USD
!financial income 3000 salary "Monthly salary" USD
!financial budget food 500 monthly USD
!financial goal savings 10000 2025-12-31 "Emergency fund"
!financial alert daily_spending 100 above "Daily limit exceeded"
!financial summary monthly
!financial insights
!financial expenses food 10
!financial incomes salary 5
!financial budgets
!financial goals
!financial alerts
!financial stats
!financial portfolio
!financial add-to-portfolio AAPL 10 150
!financial remove-from-portfolio 123
!financial accounts
!financial add-account "Checking Account" bank 2500 USD
!financial remove-account 456
!financial categories
!financial add-category "Investment Income" income
!financial remove-category 789
!financial reports
!financial generate-report monthly 2025-09
!financial reminders
!financial add-reminder bill_due 150 "Electricity bill" 2025-09-15
!financial remove-reminder 101`;

      case 'expense':
        if (args.length < 3) {
          return `❌ Usage: !financial expense <amount> <category> [description] [currency]
          
Examples:
!financial expense 25.50 food "Lunch at restaurant" USD
!financial expense 50 transport "Bus fare" KES
!financial expense 100 shopping "New clothes"
!financial expense 75 entertainment "Movie tickets" EUR`;
        }
        
        try {
          const amount = parseFloat(args[1]);
          const category = args[2].toLowerCase();
          const description = args.length > 3 ? args.slice(3, args.length - 1).join(' ') : '';
          const currency = args[args.length - 1] && financialService.currencies.includes(args[args.length - 1].toUpperCase()) ? 
                          args[args.length - 1].toUpperCase() : 'USD';
          
          if (isNaN(amount) || amount <= 0) {
            return '❌ Amount must be a positive number.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding expense: ${financialService.formatCurrency(amount, currency)} in ${category}...` 
          });
          
          const expenseId = await financialService.addExpense(userId, amount, category, description, currency);
          
          return `✅ Expense added successfully!
🆔 ID: ${expenseId}
💰 Amount: ${financialService.formatCurrency(amount, currency)}
📊 Category: ${category}
📝 Description: ${description || 'N/A'}
💱 Currency: ${currency}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial expense error: ${error.message}`);
          return `❌ Failed to add expense: ${error.message}`;
        }

      case 'income':
        if (args.length < 3) {
          return `❌ Usage: !financial income <amount> <source> [description] [currency]
          
Examples:
!financial income 3000 salary "Monthly salary" USD
!financial income 500 freelance "Website design" KES
!financial income 100 gift "Birthday present"
!financial income 250 investment "Dividend payment" EUR`;
        }
        
        try {
          const amount = parseFloat(args[1]);
          const source = args[2].toLowerCase();
          const description = args.length > 3 ? args.slice(3, args.length - 1).join(' ') : '';
          const currency = args[args.length - 1] && financialService.currencies.includes(args[args.length - 1].toUpperCase()) ? 
                          args[args.length - 1].toUpperCase() : 'USD';
          
          if (isNaN(amount) || amount <= 0) {
            return '❌ Amount must be a positive number.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding income: ${financialService.formatCurrency(amount, currency)} from ${source}...` 
          });
          
          const incomeId = await financialService.addIncome(userId, amount, source, description, currency);
          
          return `✅ Income added successfully!
🆔 ID: ${incomeId}
💰 Amount: ${financialService.formatCurrency(amount, currency)}
📊 Source: ${source}
📝 Description: ${description || 'N/A'}
💱 Currency: ${currency}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial income error: ${error.message}`);
          return `❌ Failed to add income: ${error.message}`;
        }

      case 'budget':
        if (args.length < 3) {
          return `❌ Usage: !financial budget <category> <amount> [period] [currency]
          
Examples:
!financial budget food 500 monthly USD
!financial budget transport 200 weekly KES
!financial budget entertainment 1000 yearly EUR
!financial budget shopping 300 daily`;
        }
        
        try {
          const category = args[1].toLowerCase();
          const amount = parseFloat(args[2]);
          const period = args[3] || 'monthly';
          const currency = args[4] || 'USD';
          
          if (isNaN(amount) || amount <= 0) {
            return '❌ Amount must be a positive number.';
          }
          
          if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period.toLowerCase())) {
            return '❌ Period must be daily, weekly, monthly, or yearly.';
          }
          
          if (!financialService.currencies.includes(currency.toUpperCase())) {
            return `❌ Invalid currency. Valid currencies: ${financialService.currencies.join(', ')}`;
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting budget: ${financialService.formatCurrency(amount, currency)} for ${category} (${period})...` 
          });
          
          const budgetId = await financialService.setBudget(userId, category, amount, period, currency);
          
          return `✅ Budget set successfully!
🆔 ID: ${budgetId}
📊 Category: ${category}
💰 Amount: ${financialService.formatCurrency(amount, currency)}
📅 Period: ${period}
💱 Currency: ${currency}
📅 Set: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial budget error: ${error.message}`);
          return `❌ Failed to set budget: ${error.message}`;
        }

      case 'goal':
        if (args.length < 3) {
          return `❌ Usage: !financial goal <type> <amount> [deadline] [description]
          
Goal types: savings, debt_reduction, investment, emergency_fund, vacation, other

Examples:
!financial goal savings 10000 2025-12-31 "Emergency fund"
!financial goal investment 5000 2025-06-30 "Stock portfolio"
!financial goal vacation 3000 2025-08-15 "European trip"
!financial goal debt_reduction 2000 "Credit card debt"`;
        }
        
        try {
          const goalType = args[1].toLowerCase();
          const amount = parseFloat(args[2]);
          const deadline = args[3] || null;
          const description = args.slice(4).join(' ') || '';
          
          if (isNaN(amount) || amount <= 0) {
            return '❌ Amount must be a positive number.';
          }
          
          const validGoalTypes = ['savings', 'debt_reduction', 'investment', 'emergency_fund', 'vacation', 'other'];
          if (!validGoalTypes.includes(goalType)) {
            return `❌ Invalid goal type. Valid types: ${validGoalTypes.join(', ')}`;
          }
          
          if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
            return '❌ Deadline must be in YYYY-MM-DD format.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting financial goal: ${goalType} - ${financialService.formatCurrency(amount, 'USD')}...` 
          });
          
          const goalId = await financialService.setFinancialGoal(userId, goalType, amount, deadline, description);
          
          return `✅ Financial goal set successfully!
🆔 ID: ${goalId}
🎯 Type: ${goalType.replace('_', ' ')}
💰 Target: ${financialService.formatCurrency(amount, 'USD')}
📅 Deadline: ${deadline || 'N/A'}
📝 Description: ${description || 'N/A'}
📅 Set: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial goal error: ${error.message}`);
          return `❌ Failed to set financial goal: ${error.message}`;
        }

      case 'alert':
        if (args.length < 3) {
          return `❌ Usage: !financial alert <type> <threshold> [condition] [description]
          
Alert types: daily_spending, weekly_spending, monthly_spending, budget_exceeded

Examples:
!financial alert daily_spending 100 above "Daily limit exceeded"
!financial alert weekly_spending 500 below "Weekly spending low"
!financial alert monthly_spending 2000 above "Monthly budget exceeded"
!financial alert budget_exceeded 500 "Food budget exceeded"`;
        }
        
        try {
          const alertType = args[1].toLowerCase();
          const threshold = parseFloat(args[2]);
          const condition = args[3] || 'above';
          const description = args.slice(4).join(' ') || '';
          
          if (isNaN(threshold) || threshold <= 0) {
            return '❌ Threshold must be a positive number.';
          }
          
          const validAlertTypes = ['daily_spending', 'weekly_spending', 'monthly_spending', 'budget_exceeded'];
          if (!validAlertTypes.includes(alertType)) {
            return `❌ Invalid alert type. Valid types: ${validAlertTypes.join(', ')}`;
          }
          
          if (!['above', 'below'].includes(condition.toLowerCase())) {
            return '❌ Condition must be "above" or "below".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting financial alert: ${alertType} ${condition} ${financialService.formatCurrency(threshold, 'USD')}...` 
          });
          
          const alertId = await financialService.setFinancialAlert(userId, alertType, threshold, condition, description);
          
          return `✅ Financial alert set successfully!
🆔 ID: ${alertId}
🔔 Type: ${alertType.replace('_', ' ')}
📊 Threshold: ${financialService.formatCurrency(threshold, 'USD')}
⚖️ Condition: ${condition}
📝 Description: ${description || 'N/A'}
📅 Set: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial alert error: ${error.message}`);
          return `❌ Failed to set financial alert: ${error.message}`;
        }

      case 'summary':
        try {
          const period = args[1] || 'monthly';
          
          if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period.toLowerCase())) {
            return '❌ Period must be daily, weekly, monthly, or yearly.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting financial summary for ${period}...` 
          });
          
          const summary = await financialService.getFinancialSummary(userId, period);
          
          let response = `📊 *Financial Summary* (${period.charAt(0).toUpperCase() + period.slice(1)})
          
📅 Period: ${summary.period.start.toLocaleDateString()} - ${summary.period.end.toLocaleDateString()}
💰 Net Worth: ${financialService.formatCurrency(summary.totals.net, 'USD')}
📈 Savings Rate: ${summary.summary.savingsRate}%

💸 Expenses: ${financialService.formatCurrency(summary.totals.expenses, 'USD')}
💳 Incomes: ${financialService.formatCurrency(summary.totals.incomes, 'USD')}

📊 *Category Breakdown*`;

          // Add category expenses
          if (summary.categories.expenses.length > 0) {
            response += `\n\n📉 *Expenses by Category*`;
            summary.categories.expenses.forEach(cat => {
              const percentage = summary.totals.expenses > 0 ? 
                ((cat.total / summary.totals.expenses) * 100).toFixed(1) : 0;
              response += `\n▫️ ${cat.category}: ${financialService.formatCurrency(cat.total, 'USD')} (${percentage}%)`;
            });
          }

          // Add source incomes
          if (summary.categories.incomes.length > 0) {
            response += `\n\n📈 *Incomes by Source*`;
            summary.categories.incomes.forEach(src => {
              const percentage = summary.totals.incomes > 0 ? 
                ((src.total / summary.totals.incomes) * 100).toFixed(1) : 0;
              response += `\n▫️ ${src.source}: ${financialService.formatCurrency(src.total, 'USD')} (${percentage}%)`;
            });
          }

          // Add budget usage
          if (Object.keys(summary.budgets).length > 0) {
            response += `\n\n🎯 *Budget Usage*`;
            Object.entries(summary.budgets).forEach(([category, budget]) => {
              const statusEmoji = budget.percentage > 100 ? '🔴' : 
                                 budget.percentage > 80 ? '🟡' : '🟢';
              response += `\n${statusEmoji} ${category}: ${financialService.formatCurrency(budget.spent, budget.currency)} / ${financialService.formatCurrency(budget.budget, budget.currency)} (${budget.percentage.toFixed(1)}%)`;
            });
          }

          response += `\n\n📅 Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`Financial summary error: ${error.message}`);
          return `❌ Failed to get financial summary: ${error.message}`;
        }

      case 'insights':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Generating financial insights...` 
          });
          
          const insights = await financialService.getFinancialInsights(userId);
          
          return insights.message;
        } catch (error) {
          Logger.error(`Financial insights error: ${error.message}`);
          return `❌ Failed to get financial insights: ${error.message}`;
        }

      case 'expenses':
        try {
          const category = args[1] || null;
          const limit = args[2] ? parseInt(args[2]) : 20;
          
          if (isNaN(limit) || limit < 1 || limit > 100) {
            return '❌ Limit must be between 1 and 100.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting expenses${category ? ` for ${category}` : ''}...` 
          });
          
          const expenses = await financialService.getExpenses(userId, {
            category: category,
            limit: limit,
            sortBy: 'added_at',
            sortOrder: 'DESC'
          });
          
          if (expenses.length === 0) {
            return `💸 *Your Expenses*
            
No expenses found${category ? ` for ${category}` : ''}.`;
          }
          
          let response = `💸 *Your Expenses* (${expenses.length}${limit < expenses.length ? ` of ${expenses.length}` : ''})\n\n`;
          
          expenses.slice(0, limit).forEach((expense, index) => {
            const date = new Date(expense.added_at).toLocaleDateString();
            const time = new Date(expense.added_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. ${financialService.formatCurrency(expense.amount, expense.currency)}
📊 ${expense.category} | 📅 ${date} at ${time}
📝 ${expense.description || 'No description'}
🆔 ${expense.id}\n\n`;
          });
          
          if (expenses.length > limit) {
            response += `... and ${expenses.length - limit} more expenses`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Financial expenses error: ${error.message}`);
          return `❌ Failed to get expenses: ${error.message}`;
        }

      case 'incomes':
        try {
          const source = args[1] || null;
          const limit = args[2] ? parseInt(args[2]) : 20;
          
          if (isNaN(limit) || limit < 1 || limit > 100) {
            return '❌ Limit must be between 1 and 100.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting incomes${source ? ` from ${source}` : ''}...` 
          });
          
          const incomes = await financialService.getIncomes(userId, {
            source: source,
            limit: limit,
            sortBy: 'added_at',
            sortOrder: 'DESC'
          });
          
          if (incomes.length === 0) {
            return `💳 *Your Incomes*
            
No incomes found${source ? ` from ${source}` : ''}.`;
          }
          
          let response = `💳 *Your Incomes* (${incomes.length}${limit < incomes.length ? ` of ${incomes.length}` : ''})\n\n`;
          
          incomes.slice(0, limit).forEach((income, index) => {
            const date = new Date(income.added_at).toLocaleDateString();
            const time = new Date(income.added_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `${index + 1}. ${financialService.formatCurrency(income.amount, income.currency)}
📊 ${income.source} | 📅 ${date} at ${time}
📝 ${income.description || 'No description'}
🆔 ${income.id}\n\n`;
          });
          
          if (incomes.length > limit) {
            response += `... and ${incomes.length - limit} more incomes`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Financial incomes error: ${error.message}`);
          return `❌ Failed to get incomes: ${error.message}`;
        }

      case 'budgets':
        try {
          const category = args[1] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting budgets${category ? ` for ${category}` : ''}...` 
          });
          
          const budgets = await financialService.getBudgets(userId, {
            category: category
          });
          
          if (budgets.length === 0) {
            return `🎯 *Your Budgets*
            
No budgets found${category ? ` for ${category}` : ''}.`;
          }
          
          let response = `🎯 *Your Budgets* (${budgets.length})\n\n`;
          
          budgets.forEach((budget, index) => {
            const date = new Date(budget.created_at).toLocaleDateString();
            
            response += `${index + 1}. ${financialService.formatCurrency(budget.amount, budget.currency)} per ${budget.period}
📊 ${budget.category} | 📅 ${date}
${budget.active ? '✅ Active' : '❌ Inactive'}
🆔 ${budget.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial budgets error: ${error.message}`);
          return `❌ Failed to get budgets: ${error.message}`;
        }

      case 'goals':
        try {
          const goalType = args[1] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting goals${goalType ? ` for ${goalType}` : ''}...` 
          });
          
          const goals = await financialService.getFinancialGoals(userId, {
            goalType: goalType
          });
          
          if (goals.length === 0) {
            return `🎯 *Your Financial Goals*
            
No goals found${goalType ? ` for ${goalType}` : ''}.`;
          }
          
          let response = `🎯 *Your Financial Goals* (${goals.length})\n\n`;
          
          goals.forEach((goal, index) => {
            const date = new Date(goal.created_at).toLocaleDateString();
            const deadline = goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'N/A';
            const progress = goal.progress || { current: 0, percentage: 0, remaining: goal.target_amount };
            
            const statusEmoji = progress.percentage >= 100 ? '✅' : 
                               progress.percentage >= 50 ? '🟡' : '🔵';
            
            response += `${index + 1}. ${financialService.formatCurrency(progress.current, 'USD')} / ${financialService.formatCurrency(goal.target_amount, 'USD')}
${statusEmoji} ${goal.goal_type.replace('_', ' ')} | 📈 ${progress.percentage.toFixed(1)}%
📅 Created: ${date} | 📅 Deadline: ${deadline}
📝 ${goal.description || 'No description'}
${goal.completed ? '🎉 Completed!' : goal.active ? '✅ Active' : '❌ Inactive'}
🆔 ${goal.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial goals error: ${error.message}`);
          return `❌ Failed to get goals: ${error.message}`;
        }

      case 'alerts':
        try {
          const alertType = args[1] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting alerts${alertType ? ` for ${alertType}` : ''}...` 
          });
          
          const alerts = await financialService.getFinancialAlerts(userId, {
            alertType: alertType
          });
          
          if (alerts.length === 0) {
            return `🔔 *Your Financial Alerts*
            
No alerts found${alertType ? ` for ${alertType}` : ''}.`;
          }
          
          let response = `🔔 *Your Financial Alerts* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            const date = new Date(alert.created_at).toLocaleDateString();
            
            response += `${index + 1}. ${alert.alert_type.replace('_', ' ')} ${alert.condition} ${financialService.formatCurrency(alert.threshold, 'USD')}
📊 ${alert.description || 'No description'} | 📅 ${date}
${alert.active ? '✅ Active' : '❌ Inactive'}
🆔 ${alert.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial alerts error: ${error.message}`);
          return `❌ Failed to get alerts: ${error.message}`;
        }

      case 'stats':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting financial statistics...` 
          });
          
          const stats = await financialService.getFinancialStats(userId);
          
          return `📊 *Your Financial Statistics*
          
💸 Total Expenses: ${financialService.formatCurrency(stats.totalExpenses, 'USD')}
💳 Total Incomes: ${financialService.formatCurrency(stats.totalIncomes, 'USD')}
💰 Net Worth: ${financialService.formatCurrency(stats.netWorth, 'USD')}
📈 Savings Rate: ${stats.totalIncomes > 0 ? ((stats.netWorth / stats.totalIncomes) * 100).toFixed(2) : 0}%

📊 Transactions:
📉 Expenses: ${stats.expenseCount} transactions
📈 Incomes: ${stats.incomeCount} transactions

📅 Last Activity:
📉 Last Expense: ${stats.lastExpense ? new Date(stats.lastExpense).toLocaleString() : 'Never'}
📈 Last Income: ${stats.lastIncome ? new Date(stats.lastIncome).toLocaleString() : 'Never'}`;
        } catch (error) {
          Logger.error(`Financial stats error: ${error.message}`);
          return `❌ Failed to get financial statistics: ${error.message}`;
        }

      case 'portfolio':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting investment portfolio...` 
          });
          
          const portfolio = await financialService.getPortfolio(userId);
          
          if (portfolio.length === 0) {
            return `📊 *Your Investment Portfolio*
            
Your portfolio is empty.
            
Add investments with:
!financial add-to-portfolio <symbol> <quantity> <purchase_price>

Examples:
!financial add-to-portfolio AAPL 10 150
!financial add-to-portfolio MSFT 5 300
!financial add-to-portfolio GOOGL 2 2500`;
          }
          
          let totalValue = 0;
          let totalProfitLoss = 0;
          
          let response = `📊 *Your Investment Portfolio* (${portfolio.length})\n\n`;
          
          portfolio.forEach((item, index) => {
            const currentValue = item.currentValue || (item.currentPrice * item.quantity);
            const purchaseValue = item.purchaseValue || (item.purchase_price * item.quantity);
            const profitLoss = item.profitLoss || (currentValue - purchaseValue);
            const profitLossPercent = item.profitLossPercent || (((currentValue - purchaseValue) / purchaseValue) * 100).toFixed(2);
            
            const profitLossEmoji = profitLoss >= 0 ? '📈' : '📉';
            const profitLossColor = profitLoss >= 0 ? '🟢' : '🔴';
            
            response += `${index + 1}. ${item.symbol}
📊 Quantity: ${item.quantity}
💰 Purchase: ${financialService.formatCurrency(item.purchase_price, 'USD')} each
💰 Current: ${item.currentPrice ? financialService.formatCurrency(item.currentPrice, 'USD') : 'N/A'} each
💼 Value: ${item.currentValue ? financialService.formatCurrency(item.currentValue, 'USD') : 'N/A'}
${profitLossEmoji} P/L: ${profitLossColor} ${item.profitLoss ? financialService.formatCurrency(item.profitLoss, 'USD') : 'N/A'} (${profitLossPercent || 'N/A'}%)
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            
            if (item.currentValue) totalValue += item.currentValue;
            if (item.profitLoss) totalProfitLoss += item.profitLoss;
          });
          
          const totalProfitLossEmoji = totalProfitLoss >= 0 ? '📈' : '📉';
          const totalProfitLossColor = totalProfitLoss >= 0 ? '🟢' : '🔴';
          
          response += `📊 *Portfolio Summary*
💼 Total Value: ${financialService.formatCurrency(totalValue, 'USD')}
${totalProfitLossEmoji} Total P/L: ${totalProfitLossColor} ${financialService.formatCurrency(totalProfitLoss, 'USD')}`;
          
          return response;
        } catch (error) {
          Logger.error(`Financial portfolio error: ${error.message}`);
          return `❌ Failed to get investment portfolio: ${error.message}`;
        }

      case 'add-to-portfolio':
        if (args.length < 4) {
          return `❌ Usage: !financial add-to-portfolio <symbol> <quantity> <purchase_price>
          
Examples:
!financial add-to-portfolio AAPL 10 150
!financial add-to-portfolio MSFT 5 300
!financial add-to-portfolio GOOGL 2 2500`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const quantity = parseFloat(args[2]);
          const purchasePrice = parseFloat(args[3]);
          
          if (isNaN(quantity) || isNaN(purchasePrice) || quantity <= 0 || purchasePrice <= 0) {
            return '❌ Please provide valid positive numbers for quantity and price.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding ${quantity} shares of ${symbol} at ${financialService.formatCurrency(purchasePrice, 'USD')} to portfolio...` 
          });
          
          const portfolioId = await financialService.addToPortfolio(userId, symbol, quantity, purchasePrice);
          
          return `✅ Added to portfolio successfully!
🆔 ID: ${portfolioId}
📈 ${symbol}
📊 Quantity: ${quantity}
💰 Purchase Price: ${financialService.formatCurrency(purchasePrice, 'USD')}
💼 Investment: ${financialService.formatCurrency(quantity * purchasePrice, 'USD')}`;
        } catch (error) {
          Logger.error(`Financial add-to-portfolio error: ${error.message}`);
          return `❌ Failed to add to portfolio: ${error.message}`;
        }

      case 'remove-from-portfolio':
        if (args.length < 2) {
          return '❌ Usage: !financial remove-from-portfolio <portfolio_id>';
        }
        
        try {
          const portfolioId = parseInt(args[1]);
          if (isNaN(portfolioId)) {
            return '❌ Please provide a valid portfolio ID.';
          }
          
          const success = await financialService.removeFromPortfolio(portfolioId, userId);
          
          return success ? 
            `✅ Removed from portfolio successfully!` : 
            `❌ Failed to remove from portfolio. Item not found or access denied.`;
        } catch (error) {
          Logger.error(`Financial remove-from-portfolio error: ${error.message}`);
          return `❌ Failed to remove from portfolio: ${error.message}`;
        }

      case 'accounts':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting financial accounts...` 
          });
          
          const accounts = await financialService.getAccounts(userId);
          
          if (accounts.length === 0) {
            return `🏦 *Your Financial Accounts*
            
You don't have any accounts yet.
            
Add accounts with:
!financial add-account <name> <type> [balance] [currency]

Examples:
!financial add-account "Checking Account" bank 2500 USD
!financial add-account "Credit Card" credit_card 0 USD
!financial add-account "Investment Account" investment 10000 USD`;
          }
          
          let totalBalance = 0;
          
          let response = `🏦 *Your Financial Accounts* (${accounts.length})\n\n`;
          
          accounts.forEach((account, index) => {
            const balance = account.balance || 0;
            totalBalance += balance;
            
            response += `${index + 1}. ${account.name}
📊 Type: ${account.type}
💰 Balance: ${financialService.formatCurrency(balance, account.currency || 'USD')}
${account.active ? '✅ Active' : '❌ Inactive'}
🆔 ${account.id}
📅 Added: ${new Date(account.created_at).toLocaleDateString()}\n\n`;
          });
          
          response += `📊 *Total Balance*
💰 ${financialService.formatCurrency(totalBalance, 'USD')}`;
          
          return response;
        } catch (error) {
          Logger.error(`Financial accounts error: ${error.message}`);
          return `❌ Failed to get financial accounts: ${error.message}`;
        }

      case 'add-account':
        if (args.length < 3) {
          return `❌ Usage: !financial add-account <name> <type> [balance] [currency]
          
Account types: cash, bank, credit_card, investment, loan

Examples:
!financial add-account "Checking Account" bank 2500 USD
!financial add-account "Credit Card" credit_card 0 USD
!financial add-account "Investment Account" investment 10000 USD
!financial add-account "Cash Wallet" cash 500 KES`;
        }
        
        try {
          const name = args[1];
          const type = args[2].toLowerCase();
          const balance = args[3] ? parseFloat(args[3]) : 0;
          const currency = args[4] || 'USD';
          
          if (isNaN(balance)) {
            return '❌ Please provide a valid number for balance.';
          }
          
          const validTypes = ['cash', 'bank', 'credit_card', 'investment', 'loan'];
          if (!validTypes.includes(type)) {
            return `❌ Invalid account type. Valid types: ${validTypes.join(', ')}`;
          }
          
          if (!financialService.currencies.includes(currency.toUpperCase())) {
            return `❌ Invalid currency. Valid currencies: ${financialService.currencies.join(', ')}`;
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding account: ${name} (${type})...` 
          });
          
          const accountId = await financialService.addAccount(userId, name, type, balance, currency);
          
          return `✅ Account added successfully!
🆔 ID: ${accountId}
🏦 ${name}
📊 Type: ${type}
💰 Balance: ${financialService.formatCurrency(balance, currency)}
💱 Currency: ${currency}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial add-account error: ${error.message}`);
          return `❌ Failed to add account: ${error.message}`;
        }

      case 'remove-account':
        if (args.length < 2) {
          return '❌ Usage: !financial remove-account <account_id>';
        }
        
        try {
          const accountId = parseInt(args[1]);
          if (isNaN(accountId)) {
            return '❌ Please provide a valid account ID.';
          }
          
          const success = await financialService.removeAccount(accountId, userId);
          
          return success ? 
            `✅ Account removed successfully!` : 
            `❌ Failed to remove account. Account not found or access denied.`;
        } catch (error) {
          Logger.error(`Financial remove-account error: ${error.message}`);
          return `❌ Failed to remove account: ${error.message}`;
        }

      case 'categories':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting custom categories...` 
          });
          
          const categories = await financialService.getCategories(userId);
          
          if (categories.length === 0) {
            return `📋 *Your Custom Categories*
            
You don't have any custom categories yet.
            
Add categories with:
!financial add-category <name> <type>

Examples:
!financial add-category "Investment Income" income
!financial add-category "Medical Expenses" expense
!financial add-category "Education" expense`;
          }
          
          let response = `📋 *Your Custom Categories* (${categories.length})\n\n`;
          
          categories.forEach((category, index) => {
            response += `${index + 1}. ${category.name}
📊 Type: ${category.type}
🎨 Icon: ${category.icon || 'N/A'} | 🎨 Color: ${category.color || 'N/A'}
🆔 ${category.id}
📅 Added: ${new Date(category.created_at).toLocaleDateString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial categories error: ${error.message}`);
          return `❌ Failed to get custom categories: ${error.message}`;
        }

      case 'add-category':
        if (args.length < 3) {
          return `❌ Usage: !financial add-category <name> <type>
          
Category types: expense, income

Examples:
!financial add-category "Investment Income" income
!financial add-category "Medical Expenses" expense
!financial add-category "Education" expense
!financial add-category "Charity" expense`;
        }
        
        try {
          const name = args[1];
          const type = args[2].toLowerCase();
          
          if (!['expense', 'income'].includes(type)) {
            return '❌ Category type must be "expense" or "income".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding category: ${name} (${type})...` 
          });
          
          const categoryId = await financialService.addCategory(userId, name, type);
          
          return `✅ Category added successfully!
🆔 ID: ${categoryId}
📋 ${name}
📊 Type: ${type}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial add-category error: ${error.message}`);
          return `❌ Failed to add category: ${error.message}`;
        }

      case 'remove-category':
        if (args.length < 2) {
          return '❌ Usage: !financial remove-category <category_id>';
        }
        
        try {
          const categoryId = parseInt(args[1]);
          if (isNaN(categoryId)) {
            return '❌ Please provide a valid category ID.';
          }
          
          const success = await financialService.removeCategory(categoryId, userId);
          
          return success ? 
            `✅ Category removed successfully!` : 
            `❌ Failed to remove category. Category not found or access denied.`;
        } catch (error) {
          Logger.error(`Financial remove-category error: ${error.message}`);
          return `❌ Failed to remove category: ${error.message}`;
        }

      case 'reports':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting financial reports...` 
          });
          
          const reports = await financialService.getReports(userId);
          
          if (reports.length === 0) {
            return `📊 *Your Financial Reports*
            
You don't have any reports yet.
            
Generate reports with:
!financial generate-report [type] [period]

Examples:
!financial generate-report monthly 2025-09
!financial generate-report quarterly Q3-2025
!financial generate-report yearly 2025`;
          }
          
          let response = `📊 *Your Financial Reports* (${reports.length})\n\n`;
          
          reports.forEach((report, index) => {
            const date = new Date(report.generated_at).toLocaleDateString();
            const period = `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}`;
            
            response += `${index + 1}. ${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Report
📅 Period: ${period}
📊 Generated: ${date}
🆔 ${report.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial reports error: ${error.message}`);
          return `❌ Failed to get financial reports: ${error.message}`;
        }

      case 'generate-report':
        if (args.length < 2) {
          return `❌ Usage: !financial generate-report [type] [period]
          
Report types: monthly, quarterly, yearly

Examples:
!financial generate-report monthly 2025-09
!financial generate-report quarterly Q3-2025
!financial generate-report yearly 2025`;
        }
        
        try {
          const type = args[1].toLowerCase();
          const period = args[2] || new Date().toISOString().split('T')[0].substring(0, 7); // Default to current month
          
          if (!['monthly', 'quarterly', 'yearly'].includes(type)) {
            return '❌ Report type must be "monthly", "quarterly", or "yearly".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Generating ${type} report for ${period}...` 
          });
          
          const reportId = await financialService.generateReport(userId, type, period);
          
          return `✅ Report generated successfully!
🆔 ID: ${reportId}
📊 Type: ${type}
📅 Period: ${period}
📅 Generated: ${new Date().toLocaleString()}

View with: !financial reports`;
        } catch (error) {
          Logger.error(`Financial generate-report error: ${error.message}`);
          return `❌ Failed to generate report: ${error.message}`;
        }

      case 'reminders':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting financial reminders...` 
          });
          
          const reminders = await financialService.getReminders(userId);
          
          if (reminders.length === 0) {
            return `⏰ *Your Financial Reminders*
            
You don't have any reminders yet.
            
Add reminders with:
!financial add-reminder <type> <amount> <description> <date>

Examples:
!financial add-reminder bill_due 150 "Electricity bill" 2025-09-15
!financial add-reminder budget_check 0 "Review monthly budget" 2025-09-30
!financial add-reminder investment_review 0 "Review portfolio" 2025-09-20`;
          }
          
          let response = `⏰ *Your Financial Reminders* (${reminders.length})\n\n`;
          
          reminders.forEach((reminder, index) => {
            const date = new Date(reminder.due_date).toLocaleDateString();
            
            response += `${index + 1}. ${reminder.reminder_type.replace('_', ' ')}
💰 ${reminder.amount > 0 ? financialService.formatCurrency(reminder.amount, 'USD') : 'N/A'}
📝 ${reminder.description}
📅 Due: ${date}
${reminder.active ? '✅ Active' : '❌ Inactive'} | ${reminder.recurring ? '🔁 Recurring' : '🔂 One-time'}
🆔 ${reminder.id}
📅 Added: ${new Date(reminder.created_at).toLocaleDateString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Financial reminders error: ${error.message}`);
          return `❌ Failed to get financial reminders: ${error.message}`;
        }

      case 'add-reminder':
        if (args.length < 5) {
          return `❌ Usage: !financial add-reminder <type> <amount> <description> <date> [recurring_interval]
          
Reminder types: bill_due, budget_check, investment_review

Examples:
!financial add-reminder bill_due 150 "Electricity bill" 2025-09-15
!financial add-reminder budget_check 0 "Review monthly budget" 2025-09-30
!financial add-reminder investment_review 0 "Review portfolio" 2025-09-20
!financial add-reminder bill_due 100 "Internet bill" 2025-09-20 1m`;
        }
        
        try {
          const reminderType = args[1].toLowerCase();
          const amount = parseFloat(args[2]);
          const description = args[3];
          const dueDate = args[4];
          const recurringInterval = args[5] || null;
          
          if (isNaN(amount)) {
            return '❌ Please provide a valid number for amount.';
          }
          
          const validTypes = ['bill_due', 'budget_check', 'investment_review'];
          if (!validTypes.includes(reminderType)) {
            return `❌ Invalid reminder type. Valid types: ${validTypes.join(', ')}`;
          }
          
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            return '❌ Due date must be in YYYY-MM-DD format.';
          }
          
          if (recurringInterval && !/^(\d+)([dmwy])$/.test(recurringInterval)) {
            return '❌ Recurring interval must be in format like 1d, 1w, 1m, 1y.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding reminder: ${reminderType} - ${description} on ${dueDate}...` 
          });
          
          const reminderId = await financialService.addReminder(userId, reminderType, amount, description, dueDate, !!recurringInterval, recurringInterval);
          
          return `✅ Reminder added successfully!
🆔 ID: ${reminderId}
⏰ ${reminderType.replace('_', ' ')}
💰 ${amount > 0 ? financialService.formatCurrency(amount, 'USD') : 'N/A'}
📝 ${description}
📅 Due: ${dueDate}
${recurringInterval ? `🔁 Recurring: ${recurringInterval}` : '🔂 One-time'}
📅 Added: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Financial add-reminder error: ${error.message}`);
          return `❌ Failed to add reminder: ${error.message}`;
        }

      case 'remove-reminder':
        if (args.length < 2) {
          return '❌ Usage: !financial remove-reminder <reminder_id>';
        }
        
        try {
          const reminderId = parseInt(args[1]);
          if (isNaN(reminderId)) {
            return '❌ Please provide a valid reminder ID.';
          }
          
          const success = await financialService.removeReminder(reminderId, userId);
          
          return success ? 
            `✅ Reminder removed successfully!` : 
            `❌ Failed to remove reminder. Reminder not found or access denied.`;
        } catch (error) {
          Logger.error(`Financial remove-reminder error: ${error.message}`);
          return `❌ Failed to remove reminder: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !financial help for available commands`;
    }
  }
};