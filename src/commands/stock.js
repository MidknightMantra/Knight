/**
 * Stock Command
 * Real-time stock market tracking and portfolio management
 */

const stockService = require('../services/stockService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'stock',
  aliases: ['stocks', 'share', 'shares'],
  category: 'finance',
  description: 'Real-time stock market tracking and portfolio management',
  usage: '!stock <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `📈 *Knight Stock Tracker*
        
Available subcommands:
▫️ help - Show this help
▫️ quote <symbol> [exchange] - Get current stock price
▫️ info <symbol> - Get detailed company information
▫️ search <query> - Search for stocks
▫️ top [limit] [exchange] - Show top performing stocks
▫️ market - Show market overview
▫️ alert <symbol> <condition> <price> [exchange] - Set price alert
▫️ alerts - List your stock alerts
▫️ remove <alert_id> - Remove a stock alert
▫️ watchlist - Show your stock watchlist
▫️ watch <symbol> - Add to watchlist
▫️ unwatch <symbol> - Remove from watchlist
▫️ portfolio - Show your stock portfolio
▫️ add <symbol> <quantity> <purchase_price> - Add to portfolio
▫️ remove-item <portfolio_id> - Remove from portfolio
▫️ transactions - Show transaction history
▫️ buy <symbol> <quantity> <price> [fee] - Record buy transaction
▫️ sell <symbol> <quantity> <price> [fee] - Record sell transaction
▫️ news <symbol> - Get stock news
▫️ analysis <symbol> - Get technical analysis
▫️ dividend <symbol> - Get dividend information
▫️ earnings <symbol> - Get earnings information
▫️ financials <symbol> - Get financial statements
▫️ peers <symbol> - Get peer companies
▫️ insider <symbol> - Get insider trading data
▫️ institutional <symbol> - Get institutional holdings

Examples:
!stock quote AAPL
!stock quote TSLA NASDAQ
!stock info GOOGL
!stock search microsoft
!stock top 10 NYSE
!stock market
!stock alert AAPL above 150
!stock alerts
!stock remove 123
!stock watchlist
!stock watch AMZN
!stock unwatch AMZN
!stock portfolio
!stock add NVDA 10 450
!stock remove-item 456
!stock transactions
!stock buy MSFT 5 300 10
!stock sell MSFT 2 320 5
!stock news AAPL
!stock analysis AAPL
!stock dividend AAPL
!stock earnings AAPL
!stock financials AAPL
!stock peers AAPL
!stock insider AAPL
!stock institutional AAPL`;

      case 'quote':
        if (args.length < 2) {
          return `❌ Usage: !stock quote <symbol> [exchange]
          
Examples:
!stock quote AAPL
!stock quote TSLA NASDAQ
!stock quote MSFT NYSE
!stock quote GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const exchange = args[2] || null;
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching quote for ${symbol}${exchange ? ` on ${exchange}` : ''}...` 
          });
          
          const quote = await stockService.getStockQuote(symbol, exchange);
          
          if (!quote) {
            return `❌ Failed to get quote for ${symbol}. Symbol not found or API error.`;
          }
          
          const changeEmoji = quote.change >= 0 ? '📈' : '📉';
          const changeColor = quote.change >= 0 ? '🟢' : '🔴';
          
          return `📈 *${quote.companyName} (${quote.symbol})*
          
${changeEmoji} Current Price: ${stockService.formatCurrency(quote.price, 'USD')}
${changeColor} Change: ${stockService.formatCurrency(quote.change, 'USD')} (${stockService.formatPercent(quote.changePercent)}%)
📊 Market Cap: ${stockService.formatCurrency(quote.marketCap, 'USD')}
💼 24h Volume: ${stockService.formatCurrency(quote.volume24h, 'USD')}
📈 52w High: ${stockService.formatCurrency(quote.high52w, 'USD')}
📉 52w Low: ${stockService.formatCurrency(quote.low52w, 'USD')}
📅 Previous Close: ${stockService.formatCurrency(quote.previousClose, 'USD')}
📊 Open: ${stockService.formatCurrency(quote.open, 'USD')}
📈 High: ${stockService.formatCurrency(quote.high, 'USD')}
📉 Low: ${stockService.formatCurrency(quote.low, 'USD')}
📊 PE Ratio: ${quote.peRatio ? quote.peRatio.toFixed(2) : 'N/A'}
📊 Dividend Yield: ${quote.dividendYield ? stockService.formatPercent(quote.dividendYield) : 'N/A'}
🌐 Exchange: ${quote.exchange || 'N/A'}
⏰ Last Updated: ${quote.lastUpdated ? quote.lastUpdated.toLocaleString() : 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock quote error: ${error.message}`);
          return `❌ Failed to get quote for ${args[1]}: ${error.message}`;
        }

      case 'info':
        if (args.length < 2) {
          return `❌ Usage: !stock info <symbol>
          
Examples:
!stock info AAPL
!stock info GOOGL
!stock info MSFT
!stock info TSLA`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching information for ${symbol}...` 
          });
          
          const info = await stockService.getCompanyInfo(symbol);
          
          if (!info) {
            return `❌ Failed to get information for ${symbol}. Symbol not found or API error.`;
          }
          
          return `ℹ️ *${info.companyName} (${info.symbol})*
          
📝 Description: ${info.description || 'No description available'}
🌐 Website: ${info.website || 'N/A'}
🏢 Exchange: ${info.exchange || 'N/A'}
🏭 Industry: ${info.industry || 'N/A'}
👥 CEO: ${info.ceo || 'N/A'}
📊 Sector: ${info.sector || 'N/A'}
👷 Employees: ${info.employees ? info.employees.toLocaleString() : 'N/A'}
📈 Market Cap: ${info.marketCap ? stockService.formatCurrency(info.marketCap, 'USD') : 'N/A'}
📊 PE Ratio: ${info.peRatio ? info.peRatio.toFixed(2) : 'N/A'}
📉 Beta: ${info.beta ? info.beta.toFixed(2) : 'N/A'}
📊 Dividend Yield: ${info.dividendYield ? stockService.formatPercent(info.dividendYield) : 'N/A'}
📅 Founded: ${info.founded || 'N/A'}
📍 Headquarters: ${info.headquarters || 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock info error: ${error.message}`);
          return `❌ Failed to get information for ${args[1]}: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return `❌ Usage: !stock search <query>
          
Examples:
!stock search apple
!stock search microsoft
!stock search tesla
!stock search google`;
        }
        
        try {
          const query = args.slice(1).join(' ');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔍 Searching for stocks matching "${query}"...` 
          });
          
          const results = await stockService.searchStocks(query);
          
          if (results.length === 0) {
            return `🔍 No stocks found matching "${query}".`;
          }
          
          let response = `🔍 *Search Results for "${query}"* (${results.length})\n\n`;
          
          results.slice(0, 10).forEach((result, index) => {
            response += `${index + 1}. ${result.symbol} - ${result.name}
🏢 ${result.exchange || 'N/A'} | ${result.type || 'N/A'}
📊 Market Cap: ${result.marketCap ? stockService.formatCurrency(result.marketCap, 'USD') : 'N/A'}
📈 PE Ratio: ${result.peRatio ? result.peRatio.toFixed(2) : 'N/A'}\n\n`;
          });
          
          if (results.length > 10) {
            response += `... and ${results.length - 10} more results`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock search error: ${error.message}`);
          return `❌ Failed to search for stocks: ${error.message}`;
        }

      case 'top':
        try {
          const limit = args[1] ? parseInt(args[1]) : 10;
          const exchange = args[2] || null;
          
          if (isNaN(limit) || limit < 1 || limit > 50) {
            return '❌ Limit must be between 1 and 50';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🏆 Fetching top ${limit} stocks${exchange ? ` on ${exchange}` : ''}...` 
          });
          
          const topStocks = await stockService.getTopStocks(limit, exchange);
          
          if (topStocks.length === 0) {
            return `🏆 No top stocks found${exchange ? ` on ${exchange}` : ''}.`;
          }
          
          let response = `🏆 *Top ${topStocks.length} Stocks*${exchange ? ` (${exchange})` : ''}\n\n`;
          
          topStocks.forEach((stock, index) => {
            const changeEmoji = stock.changePercent >= 0 ? '📈' : '📉';
            const changeColor = stock.changePercent >= 0 ? '🟢' : '🔴';
            
            response += `${index + 1}. ${stock.symbol} - ${stock.name}
${changeEmoji} ${stockService.formatCurrency(stock.price, 'USD')}
${changeColor} ${stockService.formatPercent(stock.changePercent)}%
📊 Market Cap: ${stockService.formatCurrency(stock.marketCap, 'USD')}
📈 Volume: ${stockService.formatCurrency(stock.volume, 'USD')}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Stock top error: ${error.message}`);
          return `❌ Failed to get top stocks: ${error.message}`;
        }

      case 'market':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `📊 Fetching market overview...` 
          });
          
          const market = await stockService.getMarketOverview();
          
          if (!market) {
            return `📊 Market overview not available. API error or configuration issue.`;
          }
          
          const changeEmoji = market.changePercent >= 0 ? '📈' : '📉';
          const changeColor = market.changePercent >= 0 ? '🟢' : '🔴';
          
          return `📊 *Market Overview*
          
📈 ${market.index} Index
${changeEmoji} ${stockService.formatCurrency(market.value, 'USD')}
${changeColor} ${stockService.formatPercent(market.changePercent)}%
📊 Volume: ${stockService.formatCurrency(market.volume, 'USD')}
📅 Updated: ${market.lastUpdated ? market.lastUpdated.toLocaleString() : 'N/A'}

🏆 Top Gainers:
${market.topGainers ? market.topGainers.slice(0, 3).map(gainer => 
  `${gainer.symbol}: ${stockService.formatPercent(gainer.changePercent)}%`
).join('\n') : 'N/A'}

📉 Top Losers:
${market.topLosers ? market.topLosers.slice(0, 3).map(loser => 
  `${loser.symbol}: ${stockService.formatPercent(loser.changePercent)}%`
).join('\n') : 'N/A'}

📊 Most Active:
${market.mostActive ? market.mostActive.slice(0, 3).map(active => 
  `${active.symbol}: ${stockService.formatCurrency(active.volume, 'USD')}`
).join('\n') : 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock market error: ${error.message}`);
          return `❌ Failed to get market overview: ${error.message}`;
        }

      case 'alert':
        if (args.length < 4) {
          return `❌ Usage: !stock alert <symbol> <above|below> <price> [exchange]
          
Examples:
!stock alert AAPL above 150
!stock alert TSLA below 200
!stock alert MSFT above 300 NASDAQ
!stock alert GOOGL below 2500`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const condition = args[2].toLowerCase();
          const targetPrice = parseFloat(args[3]);
          const exchange = args[4] || null;
          
          if (isNaN(targetPrice)) {
            return '❌ Please provide a valid price.';
          }
          
          if (!['above', 'below'].includes(condition)) {
            return '❌ Condition must be "above" or "below".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting price alert for ${symbol} ${condition} ${stockService.formatCurrency(targetPrice, 'USD')}...` 
          });
          
          const alertId = await stockService.setPriceAlert(userId, symbol, targetPrice, condition, exchange);
          
          return `✅ Stock alert set successfully!
🆔 ID: ${alertId}
📈 ${symbol} ${condition} ${stockService.formatCurrency(targetPrice, 'USD')}
⏰ Alert will trigger when condition is met.`;
        } catch (error) {
          Logger.error(`Stock alert error: ${error.message}`);
          return `❌ Failed to set stock alert: ${error.message}`;
        }

      case 'alerts':
        try {
          const alerts = await stockService.getPriceAlerts(userId);
          
          if (alerts.length === 0) {
            return `🔔 You have no active stock alerts.
            
Set alerts with: !stock alert <symbol> <condition> <price> [exchange]

Examples:
!stock alert AAPL above 150
!stock alert TSLA below 200
!stock alert MSFT above 300`;
          }
          
          let response = `🔔 *Your Active Stock Alerts* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            response += `${index + 1}. ${alert.symbol} ${alert.condition} ${stockService.formatCurrency(alert.target_price, 'USD')}
🆔 ${alert.id}
📅 Set: ${new Date(alert.created_at).toLocaleString()}
${alert.exchange ? `🏢 ${alert.exchange}` : ''}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Stock alerts error: ${error.message}`);
          return `❌ Failed to get your stock alerts: ${error.message}`;
        }

      case 'remove':
        if (args.length < 2) {
          return '❌ Usage: !stock remove <alert_id>';
        }
        
        try {
          const alertId = parseInt(args[1]);
          if (isNaN(alertId)) {
            return '❌ Please provide a valid alert ID.';
          }
          
          const success = await stockService.removePriceAlert(alertId, userId);
          
          return success ? 
            `✅ Alert ${alertId} removed successfully!` : 
            `❌ Failed to remove alert ${alertId}. Alert not found or access denied.`;
        } catch (error) {
          Logger.error(`Stock remove error: ${error.message}`);
          return `❌ Failed to remove alert: ${error.message}`;
        }

      case 'watchlist':
        try {
          const watchlist = await stockService.getWatchlist(userId);
          
          if (watchlist.length === 0) {
            return `👀 Your stock watchlist is empty.
            
Add stocks with: !stock watch <symbol>

Examples:
!stock watch AAPL
!stock watch TSLA
!stock watch MSFT
!stock watch GOOGL`;
          }
          
          let response = `👀 *Your Stock Watchlist* (${watchlist.length})\n\n`;
          
          // Get current quotes for watched stocks
          for (const item of watchlist) {
            try {
              const quote = await stockService.getStockQuote(item.symbol);
              const changeEmoji = quote.change >= 0 ? '📈' : '📉';
              const changeColor = quote.change >= 0 ? '🟢' : '🔴';
              
              response += `${item.symbol}
${changeEmoji} ${stockService.formatCurrency(quote.price, 'USD')}
${changeColor} ${stockService.formatPercent(quote.changePercent)}%
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            } catch (error) {
              response += `${item.symbol} - Price unavailable
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            }
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock watchlist error: ${error.message}`);
          return `❌ Failed to get your watchlist: ${error.message}`;
        }

      case 'watch':
        if (args.length < 2) {
          return '❌ Usage: !stock watch <symbol>';
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding ${symbol} to your watchlist...` 
          });
          
          const watchlistId = await stockService.addToWatchlist(userId, symbol);
          
          return watchlistId ? 
            `✅ Added ${symbol} to your watchlist!` : 
            `❌ Failed to add ${symbol} to your watchlist.`;
        } catch (error) {
          Logger.error(`Stock watch error: ${error.message}`);
          return `❌ Failed to add to watchlist: ${error.message}`;
        }

      case 'unwatch':
        if (args.length < 2) {
          return '❌ Usage: !stock unwatch <symbol>';
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing ${symbol} from your watchlist...` 
          });
          
          const success = await stockService.removeFromWatchlist(userId, symbol);
          
          return success ? 
            `✅ Removed ${symbol} from your watchlist!` : 
            `❌ Failed to remove ${symbol} from your watchlist. Item not found.`;
        } catch (error) {
          Logger.error(`Stock unwatch error: ${error.message}`);
          return `❌ Failed to remove from watchlist: ${error.message}`;
        }

      case 'portfolio':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your stock portfolio...` 
          });
          
          const portfolio = await stockService.getPortfolio(userId);
          
          if (portfolio.length === 0) {
            return `💼 Your stock portfolio is empty.
            
Add stocks with: !stock add <symbol> <quantity> <purchase_price>

Examples:
!stock add AAPL 10 150
!stock add TSLA 5 800
!stock add MSFT 20 300
!stock add GOOGL 3 2500`;
          }
          
          let totalValue = 0;
          let totalProfitLoss = 0;
          
          let response = `💼 *Your Stock Portfolio* (${portfolio.length})\n\n`;
          
          for (const item of portfolio) {
            try {
              const quote = await stockService.getStockQuote(item.symbol);
              const currentValue = quote.price * item.quantity;
              const purchaseValue = item.purchase_price * item.quantity;
              const profitLoss = currentValue - purchaseValue;
              const profitLossPercent = purchaseValue > 0 ? ((profitLoss / purchaseValue) * 100) : 0;
              
              const profitLossEmoji = profitLoss >= 0 ? '📈' : '📉';
              const profitLossColor = profitLoss >= 0 ? '🟢' : '🔴';
              
              response += `${item.symbol}
📊 Quantity: ${item.quantity}
💰 Purchase: ${stockService.formatCurrency(item.purchase_price, 'USD')} each
💰 Current: ${stockService.formatCurrency(quote.price, 'USD')} each
💼 Value: ${stockService.formatCurrency(currentValue, 'USD')}
${profitLossEmoji} P/L: ${profitLossColor} ${stockService.formatCurrency(profitLoss, 'USD')} (${stockService.formatPercent(profitLossPercent)}%)
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
              
              totalValue += currentValue;
              totalProfitLoss += profitLoss;
            } catch (error) {
              const purchaseValue = item.purchase_price * item.quantity;
              
              response += `${item.symbol}
📊 Quantity: ${item.quantity}
💰 Purchase: ${stockService.formatCurrency(item.purchase_price, 'USD')} each
💰 Current: Price unavailable
💼 Value: ${stockService.formatCurrency(purchaseValue, 'USD')} (purchase value)
📉 P/L: N/A
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            }
          }
          
          const totalProfitLossEmoji = totalProfitLoss >= 0 ? '📈' : '📉';
          const totalProfitLossColor = totalProfitLoss >= 0 ? '🟢' : '🔴';
          
          response += `📊 *Portfolio Summary*
💼 Total Value: ${stockService.formatCurrency(totalValue, 'USD')}
${totalProfitLossEmoji} Total P/L: ${totalProfitLossColor} ${stockService.formatCurrency(totalProfitLoss, 'USD')}
📈 P/L Percentage: ${totalValue > 0 ? stockService.formatPercent((totalProfitLoss / totalValue) * 100) : '0.00%'}`;
          
          return response;
        } catch (error) {
          Logger.error(`Stock portfolio error: ${error.message}`);
          return `❌ Failed to get your portfolio: ${error.message}`;
        }

      case 'add':
        if (args.length < 4) {
          return `❌ Usage: !stock add <symbol> <quantity> <purchase_price>
          
Examples:
!stock add AAPL 10 150
!stock add TSLA 5 800
!stock add MSFT 20 300
!stock add GOOGL 3 2500`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const quantity = parseFloat(args[2]);
          const purchasePrice = parseFloat(args[3]);
          
          if (isNaN(quantity) || isNaN(purchasePrice) || quantity <= 0 || purchasePrice <= 0) {
            return '❌ Please provide valid positive numbers for quantity and price.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding ${quantity} shares of ${symbol} at ${stockService.formatCurrency(purchasePrice, 'USD')} to portfolio...` 
          });
          
          const portfolioId = await stockService.addToPortfolio(userId, symbol, quantity, purchasePrice);
          
          return portfolioId ? 
            `✅ Added to portfolio successfully!
🆔 ID: ${portfolioId}
📈 ${symbol}
📊 Quantity: ${quantity}
💰 Purchase Price: ${stockService.formatCurrency(purchasePrice, 'USD')}
💼 Investment: ${stockService.formatCurrency(quantity * purchasePrice, 'USD')}` : 
            `❌ Failed to add to portfolio.`;
        } catch (error) {
          Logger.error(`Stock add error: ${error.message}`);
          return `❌ Failed to add to portfolio: ${error.message}`;
        }

      case 'remove-item':
        if (args.length < 2) {
          return '❌ Usage: !stock remove-item <portfolio_id>';
        }
        
        try {
          const portfolioId = parseInt(args[1]);
          if (isNaN(portfolioId)) {
            return '❌ Please provide a valid portfolio ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing item #${portfolioId} from your portfolio...` 
          });
          
          const success = await stockService.removeFromPortfolio(portfolioId, userId);
          
          return success ? 
            `✅ Removed from portfolio successfully!` : 
            `❌ Failed to remove from portfolio. Item not found or access denied.`;
        } catch (error) {
          Logger.error(`Stock remove-item error: ${error.message}`);
          return `❌ Failed to remove from portfolio: ${error.message}`;
        }

      case 'transactions':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your stock transactions...` 
          });
          
          const transactions = await stockService.getTransactions(userId);
          
          if (transactions.length === 0) {
            return `🧾 Your stock transaction history is empty.
            
Record transactions with:
!stock buy <symbol> <quantity> <price> [fee]
!stock sell <symbol> <quantity> <price> [fee]

Examples:
!stock buy AAPL 10 150 10
!stock sell AAPL 5 160 5
!stock buy TSLA 2 800 20
!stock sell TSLA 1 850 10`;
          }
          
          let response = `🧾 *Your Stock Transactions* (${transactions.length})\n\n`;
          
          transactions.slice(0, 15).forEach((transaction, index) => {
            const typeEmoji = transaction.type === 'buy' ? '📥' : '📤';
            const typeColor = transaction.type === 'buy' ? '🟢' : '🔴';
            
            response += `${index + 1}. ${typeEmoji} ${transaction.symbol}
${typeColor} ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} ${transaction.quantity} shares
💰 Price: ${stockService.formatCurrency(transaction.price, 'USD')} each
💼 Total: ${stockService.formatCurrency(transaction.total, 'USD')}
💳 Fee: ${stockService.formatCurrency(transaction.fee, 'USD')}
📅 ${new Date(transaction.added_at).toLocaleDateString()}\n\n`;
          });
          
          if (transactions.length > 15) {
            response += `... and ${transactions.length - 15} more transactions`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock transactions error: ${error.message}`);
          return `❌ Failed to get your transactions: ${error.message}`;
        }

      case 'buy':
        if (args.length < 4) {
          return `❌ Usage: !stock buy <symbol> <quantity> <price> [fee]
          
Examples:
!stock buy AAPL 10 150 10
!stock buy TSLA 2 800 20
!stock buy MSFT 5 300 5
!stock buy GOOGL 1 2500 25`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const quantity = parseFloat(args[2]);
          const price = parseFloat(args[3]);
          const fee = args[4] ? parseFloat(args[4]) : 0;
          
          if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
            return '❌ Please provide valid positive numbers for quantity and price.';
          }
          
          if (isNaN(fee) || fee < 0) {
            return '❌ Please provide a valid fee amount (0 or positive).';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Recording buy transaction for ${quantity} shares of ${symbol} at ${stockService.formatCurrency(price, 'USD')}...` 
          });
          
          const transactionId = await stockService.recordTransaction(userId, symbol, quantity, price, 'buy', fee);
          
          return transactionId ? 
            `✅ Buy transaction recorded successfully!
🆔 ID: ${transactionId}
📥 ${symbol}
📊 Quantity: ${quantity}
💰 Price: ${stockService.formatCurrency(price, 'USD')} each
💼 Total Cost: ${stockService.formatCurrency(quantity * price, 'USD')}
💳 Fee: ${stockService.formatCurrency(fee, 'USD')}
💼 Net Investment: ${stockService.formatCurrency((quantity * price) + fee, 'USD')}` : 
            `❌ Failed to record buy transaction.`;
        } catch (error) {
          Logger.error(`Stock buy error: ${error.message}`);
          return `❌ Failed to record buy transaction: ${error.message}`;
        }

      case 'sell':
        if (args.length < 4) {
          return `❌ Usage: !stock sell <symbol> <quantity> <price> [fee]
          
Examples:
!stock sell AAPL 5 160 5
!stock sell TSLA 1 850 10
!stock sell MSFT 10 320 5
!stock sell GOOGL 1 2600 25`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const quantity = parseFloat(args[2]);
          const price = parseFloat(args[3]);
          const fee = args[4] ? parseFloat(args[4]) : 0;
          
          if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
            return '❌ Please provide valid positive numbers for quantity and price.';
          }
          
          if (isNaN(fee) || fee < 0) {
            return '❌ Please provide a valid fee amount (0 or positive).';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Recording sell transaction for ${quantity} shares of ${symbol} at ${stockService.formatCurrency(price, 'USD')}...` 
          });
          
          const transactionId = await stockService.recordTransaction(userId, symbol, quantity, price, 'sell', fee);
          
          return transactionId ? 
            `✅ Sell transaction recorded successfully!
🆔 ID: ${transactionId}
📤 ${symbol}
📊 Quantity: ${quantity}
💰 Price: ${stockService.formatCurrency(price, 'USD')} each
💼 Total Revenue: ${stockService.formatCurrency(quantity * price, 'USD')}
💳 Fee: ${stockService.formatCurrency(fee, 'USD')}
💼 Net Proceeds: ${stockService.formatCurrency((quantity * price) - fee, 'USD')}` : 
            `❌ Failed to record sell transaction.`;
        } catch (error) {
          Logger.error(`Stock sell error: ${error.message}`);
          return `❌ Failed to record sell transaction: ${error.message}`;
        }

      case 'news':
        if (args.length < 2) {
          return `❌ Usage: !stock news <symbol>
          
Examples:
!stock news AAPL
!stock news TSLA
!stock news MSFT
!stock news GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `📰 Fetching news for ${symbol}...` 
          });
          
          const news = await stockService.getStockNews(symbol);
          
          if (news.length === 0) {
            return `📰 No news found for ${symbol}.`;
          }
          
          let response = `📰 *${symbol} News* (${news.length})\n\n`;
          
          news.slice(0, 5).forEach((article, index) => {
            response += `${index + 1}. ${article.title}
📅 ${new Date(article.publishedAt).toLocaleDateString()}
📝 ${article.description ? article.description.substring(0, 100) + '...' : 'No description'}
🔗 ${article.url}\n\n`;
          });
          
          if (news.length > 5) {
            response += `... and ${news.length - 5} more articles`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock news error: ${error.message}`);
          return `❌ Failed to get news for ${args[1]}: ${error.message}`;
        }

      case 'analysis':
        if (args.length < 2) {
          return `❌ Usage: !stock analysis <symbol>
          
Examples:
!stock analysis AAPL
!stock analysis TSLA
!stock analysis MSFT
!stock analysis GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `📊 Fetching technical analysis for ${symbol}...` 
          });
          
          const analysis = await stockService.getTechnicalAnalysis(symbol);
          
          if (!analysis) {
            return `📊 Technical analysis not available for ${symbol}.`;
          }
          
          const trendEmoji = analysis.trend === 'bullish' ? '📈' : 
                            analysis.trend === 'bearish' ? '📉' : '➡️';
          
          return `📊 *${symbol} Technical Analysis*
          
${trendEmoji} Trend: ${analysis.trend.charAt(0).toUpperCase() + analysis.trend.slice(1)}
📈 Moving Average (50): ${stockService.formatCurrency(analysis.ma50, 'USD')}
📈 Moving Average (200): ${stockService.formatCurrency(analysis.ma200, 'USD')}
📊 RSI: ${analysis.rsi ? analysis.rsi.toFixed(2) : 'N/A'}
📈 MACD: ${analysis.macd ? analysis.macd.toFixed(2) : 'N/A'}
📊 Support Level: ${stockService.formatCurrency(analysis.support, 'USD')}
📈 Resistance Level: ${stockService.formatCurrency(analysis.resistance, 'USD')}
📊 Volatility: ${analysis.volatility ? analysis.volatility.toFixed(2) : 'N/A'}
📈 Volume: ${stockService.formatCurrency(analysis.volume, 'USD')}`;
        } catch (error) {
          Logger.error(`Stock analysis error: ${error.message}`);
          return `❌ Failed to get technical analysis for ${args[1]}: ${error.message}`;
        }

      case 'dividend':
        if (args.length < 2) {
          return `❌ Usage: !stock dividend <symbol>
          
Examples:
!stock dividend AAPL
!stock dividend TSLA
!stock dividend MSFT
!stock dividend KO`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `💰 Fetching dividend information for ${symbol}...` 
          });
          
          const dividend = await stockService.getDividendInfo(symbol);
          
          if (!dividend) {
            return `💰 No dividend information available for ${symbol}.`;
          }
          
          return `💰 *${symbol} Dividend Information*
          
📅 Ex-Dividend Date: ${dividend.exDividendDate ? new Date(dividend.exDividendDate).toLocaleDateString() : 'N/A'}
📅 Payment Date: ${dividend.paymentDate ? new Date(dividend.paymentDate).toLocaleDateString() : 'N/A'}
💰 Dividend Amount: ${stockService.formatCurrency(dividend.dividendAmount, 'USD')}
📊 Dividend Yield: ${dividend.dividendYield ? stockService.formatPercent(dividend.dividendYield) : 'N/A'}
📈 Annual Dividend: ${stockService.formatCurrency(dividend.annualDividend, 'USD')}
📊 Payout Ratio: ${dividend.payoutRatio ? stockService.formatPercent(dividend.payoutRatio) : 'N/A'}
📅 Frequency: ${dividend.frequency || 'N/A'}
📊 Dividend Growth: ${dividend.dividendGrowth ? stockService.formatPercent(dividend.dividendGrowth) + ' annually' : 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock dividend error: ${error.message}`);
          return `❌ Failed to get dividend information for ${args[1]}: ${error.message}`;
        }

      case 'earnings':
        if (args.length < 2) {
          return `❌ Usage: !stock earnings <symbol>
          
Examples:
!stock earnings AAPL
!stock earnings TSLA
!stock earnings MSFT
!stock earnings GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `📊 Fetching earnings information for ${symbol}...` 
          });
          
          const earnings = await stockService.getEarningsInfo(symbol);
          
          if (!earnings) {
            return `📊 No earnings information available for ${symbol}.`;
          }
          
          return `📊 *${symbol} Earnings Information*
          
📅 Earnings Date: ${earnings.earningsDate ? new Date(earnings.earningsDate).toLocaleDateString() : 'N/A'}
💰 EPS (Actual): ${earnings.epsActual ? stockService.formatCurrency(earnings.epsActual, 'USD') : 'N/A'}
💰 EPS (Estimated): ${earnings.epsEstimated ? stockService.formatCurrency(earnings.epsEstimated, 'USD') : 'N/A'}
📈 Revenue (Actual): ${earnings.revenueActual ? stockService.formatCurrency(earnings.revenueActual, 'USD') : 'N/A'}
📈 Revenue (Estimated): ${earnings.revenueEstimated ? stockService.formatCurrency(earnings.revenueEstimated, 'USD') : 'N/A'}
📊 EPS Surprise: ${earnings.epsSurprise ? stockService.formatPercent(earnings.epsSurprise) : 'N/A'}
📈 Revenue Surprise: ${earnings.revenueSurprise ? stockService.formatPercent(earnings.revenueSurprise) : 'N/A'}
📊 Earnings Growth: ${earnings.earningsGrowth ? stockService.formatPercent(earnings.earningsGrowth) : 'N/A'}
📈 Revenue Growth: ${earnings.revenueGrowth ? stockService.formatPercent(earnings.revenueGrowth) : 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock earnings error: ${error.message}`);
          return `❌ Failed to get earnings information for ${args[1]}: ${error.message}`;
        }

      case 'financials':
        if (args.length < 2) {
          return `❌ Usage: !stock financials <symbol>
          
Examples:
!stock financials AAPL
!stock financials TSLA
!stock financials MSFT
!stock financials GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `📊 Fetching financial statements for ${symbol}...` 
          });
          
          const financials = await stockService.getFinancialStatements(symbol);
          
          if (!financials) {
            return `📊 No financial statements available for ${symbol}.`;
          }
          
          return `📊 *${symbol} Financial Statements*
          
💰 Market Cap: ${financials.marketCap ? stockService.formatCurrency(financials.marketCap, 'USD') : 'N/A'}
📊 Enterprise Value: ${financials.enterpriseValue ? stockService.formatCurrency(financials.enterpriseValue, 'USD') : 'N/A'}
📈 Revenue: ${financials.revenue ? stockService.formatCurrency(financials.revenue, 'USD') : 'N/A'}
💰 Gross Profit: ${financials.grossProfit ? stockService.formatCurrency(financials.grossProfit, 'USD') : 'N/A'}
📉 Operating Income: ${financials.operatingIncome ? stockService.formatCurrency(financials.operatingIncome, 'USD') : 'N/A'}
📊 Net Income: ${financials.netIncome ? stockService.formatCurrency(financials.netIncome, 'USD') : 'N/A'}
📈 EBITDA: ${financials.ebitda ? stockService.formatCurrency(financials.ebitda, 'USD') : 'N/A'}
📊 Debt: ${financials.totalDebt ? stockService.formatCurrency(financials.totalDebt, 'USD') : 'N/A'}
💰 Cash: ${financials.totalCash ? stockService.formatCurrency(financials.totalCash, 'USD') : 'N/A'}
📊 Book Value: ${financials.bookValue ? stockService.formatCurrency(financials.bookValue, 'USD') : 'N/A'}
📈 Price/Book: ${financials.priceToBook ? financials.priceToBook.toFixed(2) : 'N/A'}
📊 Debt/Equity: ${financials.debtToEquity ? financials.debtToEquity.toFixed(2) : 'N/A'}
📈 Current Ratio: ${financials.currentRatio ? financials.currentRatio.toFixed(2) : 'N/A'}
📊 Quick Ratio: ${financials.quickRatio ? financials.quickRatio.toFixed(2) : 'N/A'}`;
        } catch (error) {
          Logger.error(`Stock financials error: ${error.message}`);
          return `❌ Failed to get financial statements for ${args[1]}: ${error.message}`;
        }

      case 'peers':
        if (args.length < 2) {
          return `❌ Usage: !stock peers <symbol>
          
Examples:
!stock peers AAPL
!stock peers TSLA
!stock peers MSFT
!stock peers GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `👥 Fetching peer companies for ${symbol}...` 
          });
          
          const peers = await stockService.getPeerCompanies(symbol);
          
          if (peers.length === 0) {
            return `👥 No peer companies found for ${symbol}.`;
          }
          
          let response = `👥 *${symbol} Peer Companies* (${peers.length})\n\n`;
          
          peers.slice(0, 10).forEach((peer, index) => {
            response += `${index + 1}. ${peer.symbol} - ${peer.name}
📊 Industry: ${peer.industry || 'N/A'}
📈 Market Cap: ${peer.marketCap ? stockService.formatCurrency(peer.marketCap, 'USD') : 'N/A'}
📈 PE Ratio: ${peer.peRatio ? peer.peRatio.toFixed(2) : 'N/A'}\n\n`;
          });
          
          if (peers.length > 10) {
            response += `... and ${peers.length - 10} more peers`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock peers error: ${error.message}`);
          return `❌ Failed to get peer companies for ${args[1]}: ${error.message}`;
        }

      case 'insider':
        if (args.length < 2) {
          return `❌ Usage: !stock insider <symbol>
          
Examples:
!stock insider AAPL
!stock insider TSLA
!stock insider MSFT
!stock insider GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🕵️ Fetching insider trading data for ${symbol}...` 
          });
          
          const insiderData = await stockService.getInsiderTrading(symbol);
          
          if (!insiderData || insiderData.length === 0) {
            return `🕵️ No insider trading data available for ${symbol}.`;
          }
          
          let response = `🕵️ *${symbol} Insider Trading* (${insiderData.length})\n\n`;
          
          insiderData.slice(0, 5).forEach((trade, index) => {
            const tradeType = trade.transactionType === 'Sale' ? '📤' : '📥';
            const tradeColor = trade.transactionType === 'Sale' ? '🔴' : '🟢';
            
            response += `${index + 1}. ${tradeType} ${trade.insiderName}
${tradeColor} ${trade.transactionType} ${stockService.formatCurrency(trade.shares, 'USD')} shares
💰 Price: ${stockService.formatCurrency(trade.price, 'USD')} each
💼 Total: ${stockService.formatCurrency(trade.value, 'USD')}
📅 ${new Date(trade.filingDate).toLocaleDateString()}
📝 ${trade.relationship || 'N/A'}\n\n`;
          });
          
          if (insiderData.length > 5) {
            response += `... and ${insiderData.length - 5} more trades`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock insider error: ${error.message}`);
          return `❌ Failed to get insider trading data for ${args[1]}: ${error.message}`;
        }

      case 'institutional':
        if (args.length < 2) {
          return `❌ Usage: !stock institutional <symbol>
          
Examples:
!stock institutional AAPL
!stock institutional TSLA
!stock institutional MSFT
!stock institutional GOOGL`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🏛️ Fetching institutional holdings for ${symbol}...` 
          });
          
          const institutionalData = await stockService.getInstitutionalHoldings(symbol);
          
          if (!institutionalData || institutionalData.length === 0) {
            return `🏛️ No institutional holdings data available for ${symbol}.`;
          }
          
          let response = `🏛️ *${symbol} Institutional Holdings* (${institutionalData.length})\n\n`;
          
          institutionalData.slice(0, 10).forEach((holding, index) => {
            response += `${index + 1}. ${holding.institutionName}
📊 Shares: ${holding.shares ? holding.shares.toLocaleString() : 'N/A'}
📈 Value: ${holding.value ? stockService.formatCurrency(holding.value, 'USD') : 'N/A'}
📊 Stake: ${holding.stake ? stockService.formatPercent(holding.stake) : 'N/A'}
📅 Reported: ${holding.reportedDate ? new Date(holding.reportedDate).toLocaleDateString() : 'N/A'}\n\n`;
          });
          
          if (institutionalData.length > 10) {
            response += `... and ${institutionalData.length - 10} more holdings`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Stock institutional error: ${error.message}`);
          return `❌ Failed to get institutional holdings for ${args[1]}: ${error.message}`;
        }

      case 'stats':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `📊 Fetching task statistics...` 
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
            text: `⏰ Fetching overdue tasks...` 
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
            text: `🔜 Fetching upcoming tasks...` 
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
            text: `🏷️ Fetching your task tags...` 
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
            text: `🏷️ Adding tag "${tag}" to task #${taskId}...` 
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
            text: `🏷️ Removing tag "${tag}" from task #${taskId}...` 
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
            text: `💼 Fetching your task portfolio...` 
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
            text: `💼 Adding task #${taskId} to your portfolio...` 
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
            text: `💼 Removing item #${portfolioId} from your portfolio...` 
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
            text: `📁 Fetching your projects...` 
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
            text: `📁 Fetching project #${projectId} details...` 
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
            text: `📁 Creating project "${name}"...` 
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
            text: `📁 Adding task #${taskId} to project #${projectId}...` 
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
            text: `📁 Removing task #${taskId} from project #${projectId}...` 
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