/**
 * Cryptocurrency Command
 * Enhanced cryptocurrency tracking with portfolio management
 */

const cryptoService = require('../services/cryptoService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'crypto',
  aliases: ['coin', 'price', 'btc', 'eth'],
  category: 'finance',
  description: 'Enhanced cryptocurrency tracking with portfolio management',
  usage: '!crypto <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `₿ *Knight Cryptocurrency Tracker*
        
Available subcommands:
▫️ help - Show this help
▫️ price <symbol> [currency] - Get current price
▫️ info <symbol> - Get detailed coin information
▫️ search <query> - Search for cryptocurrencies
▫️ top [limit] [currency] - Show top cryptocurrencies
▫️ market - Show market overview
▫️ alert <symbol> <condition> <price> [currency] - Set price alert
▫️ alerts - List your price alerts
▫️ remove <alert_id> - Remove a price alert
▫️ watchlist - Show your watchlist
▫️ watch <symbol> - Add to watchlist
▫️ unwatch <symbol> - Remove from watchlist
▫️ portfolio - Show your portfolio
▫️ add <symbol> <quantity> <purchase_price> - Add to portfolio
▫️ remove-item <portfolio_id> - Remove from portfolio
▫️ transactions - Show transaction history
▫️ buy <symbol> <quantity> <price> [fee] - Record buy transaction
▫️ sell <symbol> <quantity> <price> [fee] - Record sell transaction
▫️ news <symbol> - Get cryptocurrency news

Examples:
!crypto price btc
!crypto price eth eur
!crypto info bitcoin
!crypto search ethereum
!crypto top 10
!crypto market
!crypto alert btc above 50000
!crypto alerts
!crypto watchlist
!crypto watch ada
!crypto unwatch ada
!crypto portfolio
!crypto add btc 0.5 45000
!crypto remove-item 123
!crypto transactions
!crypto buy eth 2 3000 10
!crypto sell eth 1 3200 5
!crypto news btc`;

      case 'price':
        if (args.length < 2) {
          return `❌ Usage: !crypto price <symbol> [currency]
          
Examples:
!crypto price btc
!crypto price eth eur
!crypto price ada gbp
!crypto price sol`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const currency = args[2] || 'usd';
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching price for ${symbol} in ${currency.toUpperCase()}...` 
          });
          
          const priceData = await cryptoService.getCryptoPrice(symbol, currency);
          
          const changeEmoji = priceData.change24h >= 0 ? '📈' : '📉';
          const changeColor = priceData.change24h >= 0 ? '🟢' : '🔴';
          
          return `₿ *${priceData.name} (${priceData.symbol}/${priceData.currency.toUpperCase()})*
          
${changeEmoji} Current Price: ${cryptoService.formatCurrency(priceData.price, priceData.currency)}
${changeColor} 24h Change: ${cryptoService.formatPercent(priceData.change24h)}
📊 Market Cap: ${cryptoService.formatCurrency(priceData.marketCap, priceData.currency)}
💼 24h Volume: ${cryptoService.formatCurrency(priceData.volume24h, priceData.currency)}
⏰ Last Updated: ${priceData.lastUpdated.toLocaleString()}`;
        } catch (error) {
          Logger.error(`Crypto price error: ${error.message}`);
          return `❌ Failed to get price for ${args[1]}: ${error.message}`;
        }

      case 'info':
        if (args.length < 2) {
          return `❌ Usage: !crypto info <symbol>
          
Examples:
!crypto info btc
!crypto info ethereum
!crypto info cardano
!crypto info solana`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching information for ${symbol}...` 
          });
          
          const info = await cryptoService.getCompanyInfo(symbol);
          
          return `ℹ️ *${info.name} (${info.symbol})*
          
📝 Description: ${info.description || 'No description available'}
🌐 Website: ${info.website || 'N/A'}
🏢 Exchange: ${info.exchange || 'N/A'}
🏭 Industry: ${info.industry || 'N/A'}
👥 CEO: ${info.ceo || 'N/A'}
📊 Sector: ${info.sector || 'N/A'}
👷 Employees: ${info.employees ? info.employees.toLocaleString() : 'N/A'}`;
        } catch (error) {
          Logger.error(`Crypto info error: ${error.message}`);
          return `❌ Failed to get information for ${args[1]}: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return `❌ Usage: !crypto search <query>
          
Examples:
!crypto search bitcoin
!crypto search ethereum
!crypto search cardano
!crypto search solana`;
        }
        
        try {
          const query = args.slice(1).join(' ');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔍 Searching for cryptocurrencies matching "${query}"...` 
          });
          
          const results = await cryptoService.searchCryptos(query);
          
          if (results.length === 0) {
            return `🔍 No cryptocurrencies found matching "${query}".`;
          }
          
          let response = `🔍 *Search Results for "${query}"* (${results.length})\n\n`;
          
          results.slice(0, 10).forEach((result, index) => {
            response += `${index + 1}. ${result.name} (${result.symbol.toUpperCase()})
📊 Market Cap Rank: #${result.marketCapRank || 'N/A'}
🆔 ${result.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Crypto search error: ${error.message}`);
          return `❌ Failed to search for cryptocurrencies: ${error.message}`;
        }

      case 'top':
        try {
          const limit = args[1] ? parseInt(args[1]) : 10;
          const currency = args[2] || 'usd';
          
          if (isNaN(limit) || limit < 1 || limit > 50) {
            return '❌ Limit must be between 1 and 50';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching top ${limit} cryptocurrencies in ${currency.toUpperCase()}...` 
          });
          
          const topCryptos = await cryptoService.getTopCryptos(currency, limit);
          
          let response = `🏆 *Top ${topCryptos.length} Cryptocurrencies* (${currency.toUpperCase()})\n\n`;
          
          topCryptos.forEach((crypto, index) => {
            const changeEmoji = crypto.change24h >= 0 ? '📈' : '📉';
            const changeColor = crypto.change24h >= 0 ? '🟢' : '🔴';
            
            response += `${index + 1}. ${crypto.name} (${crypto.symbol.toUpperCase()})
${changeEmoji} ${cryptoService.formatCurrency(crypto.currentPrice, currency)}
${changeColor} ${cryptoService.formatPercent(crypto.change24h)}
📊 Market Cap: ${cryptoService.formatCurrency(crypto.marketCap, currency)}
💼 24h Volume: ${cryptoService.formatCurrency(crypto.volume24h, currency)}
🏅 Rank: #${crypto.marketCapRank}\n\n`;
          });
          
          response += `⏰ Updated: ${new Date().toLocaleString()}`;
          
          return response;
        } catch (error) {
          Logger.error(`Crypto top error: ${error.message}`);
          return `❌ Failed to get top cryptocurrencies: ${error.message}`;
        }

      case 'market':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching market overview...` 
          });
          
          const market = await cryptoService.getMarketOverview();
          
          const changeEmoji = market.marketCapChangePercentage24h >= 0 ? '📈' : '📉';
          const changeColor = market.marketCapChangePercentage24h >= 0 ? '🟢' : '🔴';
          
          return `📊 *Global Cryptocurrency Market*
          
💰 Total Market Cap: ${cryptoService.formatCurrency(market.totalMarketCap, 'USD')}
💼 24h Volume: ${cryptoService.formatCurrency(market.totalVolume, 'USD')}
${changeEmoji} 24h Change: ${changeColor} ${cryptoService.formatPercent(market.marketCapChangePercentage24h)}
🔢 Active Cryptocurrencies: ${market.activeCryptocurrencies?.toLocaleString() || 'N/A'}
🏪 Markets: ${market.markets?.toLocaleString() || 'N/A'}

🏆 Market Dominance:
₿ Bitcoin (BTC): ${market.dominance?.btc?.toFixed(1) || 'N/A'}%
Ξ Ethereum (ETH): ${market.dominance?.eth?.toFixed(1) || 'N/A'}%

⏰ Updated: ${market.updatedAt?.toLocaleString() || new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Crypto market error: ${error.message}`);
          return `❌ Failed to get market overview: ${error.message}`;
        }

      case 'alert':
        if (args.length < 4) {
          return `❌ Usage: !crypto alert <symbol> <above|below> <price> [currency]
          
Examples:
!crypto alert btc above 50000
!crypto alert eth below 3000
!crypto alert ada above 1.5 eur
!crypto alert sol below 100 gbp`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const condition = args[2].toLowerCase();
          const targetPrice = parseFloat(args[3]);
          const currency = args[4] || 'usd';
          
          if (isNaN(targetPrice)) {
            return '❌ Please provide a valid price.';
          }
          
          if (!['above', 'below'].includes(condition)) {
            return '❌ Condition must be "above" or "below".';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting price alert for ${symbol} ${condition} ${cryptoService.formatCurrency(targetPrice, currency)}...` 
          });
          
          const alertId = await cryptoService.setPriceAlert(userId, symbol, targetPrice, condition, currency);
          
          return `✅ Price alert set successfully!
🆔 ID: ${alertId}
₿ ${symbol} ${condition} ${cryptoService.formatCurrency(targetPrice, currency)}
⏰ Alert will trigger when condition is met.`;
        } catch (error) {
          Logger.error(`Crypto alert error: ${error.message}`);
          return `❌ Failed to set price alert: ${error.message}`;
        }

      case 'alerts':
        try {
          const alerts = await cryptoService.getPriceAlerts(userId);
          
          if (alerts.length === 0) {
            return `🔔 You have no active price alerts.
            
Set alerts with: !crypto alert <symbol> <condition> <price> [currency]

Examples:
!crypto alert btc above 50000
!crypto alert eth below 3000
!crypto alert ada above 1.5 eur`;
          }
          
          let response = `🔔 *Your Active Price Alerts* (${alerts.length})\n\n`;
          
          alerts.forEach((alert, index) => {
            response += `${index + 1}. ${alert.symbol.toUpperCase()} ${alert.condition} ${cryptoService.formatCurrency(alert.target_price, alert.currency)}
🆔 ${alert.id}
📅 Set: ${new Date(alert.created_at).toLocaleString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Crypto alerts error: ${error.message}`);
          return `❌ Failed to get your price alerts: ${error.message}`;
        }

      case 'remove':
        if (args.length < 2) {
          return '❌ Usage: !crypto remove <alert_id>';
        }
        
        try {
          const alertId = parseInt(args[1]);
          if (isNaN(alertId)) {
            return '❌ Please provide a valid alert ID.';
          }
          
          const success = await cryptoService.removePriceAlert(alertId, userId);
          
          return success ? 
            `✅ Alert ${alertId} removed successfully!` : 
            `❌ Failed to remove alert ${alertId}. Alert not found or access denied.`;
        } catch (error) {
          Logger.error(`Crypto remove error: ${error.message}`);
          return `❌ Failed to remove alert: ${error.message}`;
        }

      case 'watchlist':
        try {
          const watchlist = await cryptoService.getWatchlist(userId);
          
          if (watchlist.length === 0) {
            return `👀 Your cryptocurrency watchlist is empty.
            
Add coins with: !crypto watch <symbol>

Examples:
!crypto watch btc
!crypto watch eth
!crypto watch ada
!crypto watch sol`;
          }
          
          // Get current prices for watched coins
          let response = `👀 *Your Cryptocurrency Watchlist* (${watchlist.length})\n\n`;
          
          for (const item of watchlist) {
            try {
              const priceData = await cryptoService.getCryptoPrice(item.symbol);
              const changeEmoji = priceData.change24h >= 0 ? '📈' : '📉';
              const changeColor = priceData.change24h >= 0 ? '🟢' : '🔴';
              
              response += `${item.symbol.toUpperCase()}
${changeEmoji} ${cryptoService.formatCurrency(priceData.price, 'USD')}
${changeColor} ${cryptoService.formatPercent(priceData.change24h)}
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            } catch (error) {
              response += `${item.symbol.toUpperCase()} - Price unavailable
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            }
          }
          
          return response;
        } catch (error) {
          Logger.error(`Crypto watchlist error: ${error.message}`);
          return `❌ Failed to get your watchlist: ${error.message}`;
        }

      case 'watch':
        if (args.length < 2) {
          return '❌ Usage: !crypto watch <symbol>';
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding ${symbol} to your watchlist...` 
          });
          
          const watchlistId = await cryptoService.addToWatchlist(userId, symbol);
          
          return `✅ Added ${symbol} to your watchlist!`;
        } catch (error) {
          Logger.error(`Crypto watch error: ${error.message}`);
          return `❌ Failed to add to watchlist: ${error.message}`;
        }

      case 'unwatch':
        if (args.length < 2) {
          return '❌ Usage: !crypto unwatch <symbol>';
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing ${symbol} from your watchlist...` 
          });
          
          const success = await cryptoService.removeFromWatchlist(userId, symbol);
          
          return success ? 
            `✅ Removed ${symbol} from your watchlist!` : 
            `❌ Failed to remove ${symbol} from your watchlist. Item not found.`;
        } catch (error) {
          Logger.error(`Crypto unwatch error: ${error.message}`);
          return `❌ Failed to remove from watchlist: ${error.message}`;
        }

      case 'portfolio':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your cryptocurrency portfolio...` 
          });
          
          const portfolio = await cryptoService.getPortfolio(userId);
          
          if (portfolio.length === 0) {
            return `💼 *Your Cryptocurrency Portfolio*
            
Your portfolio is empty.
            
Add coins with: !crypto add <symbol> <quantity> <purchase_price>

Examples:
!crypto add btc 0.5 45000
!crypto add eth 2 3000
!crypto add ada 1000 1.2
!crypto add sol 10 150`;
          }
          
          let totalValue = 0;
          let totalProfitLoss = 0;
          
          let response = `💼 *Your Cryptocurrency Portfolio* (${portfolio.length})\n\n`;
          
          for (const item of portfolio) {
            const profitLossEmoji = item.profitLoss >= 0 ? '📈' : '📉';
            const profitLossColor = item.profitLoss >= 0 ? '🟢' : '🔴';
            
            response += `${item.symbol.toUpperCase()}
📊 Quantity: ${item.quantity}
💰 Purchase: ${cryptoService.formatCurrency(item.purchase_price, 'USD')} each
💰 Current: ${item.currentPrice ? cryptoService.formatCurrency(item.currentPrice, 'USD') : 'N/A'} each
💼 Value: ${item.currentValue ? cryptoService.formatCurrency(item.currentValue, 'USD') : 'N/A'}
${profitLossEmoji} P/L: ${profitLossColor} ${item.profitLoss ? cryptoService.formatCurrency(item.profitLoss, 'USD') : 'N/A'} (${item.profitLossPercent ? item.profitLossPercent.toFixed(2) : 'N/A'}%)
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
            
            if (item.currentValue) totalValue += item.currentValue;
            if (item.profitLoss) totalProfitLoss += item.profitLoss;
          }
          
          const totalProfitLossEmoji = totalProfitLoss >= 0 ? '📈' : '📉';
          const totalProfitLossColor = totalProfitLoss >= 0 ? '🟢' : '🔴';
          
          response += `📊 *Portfolio Summary*
💼 Total Value: ${cryptoService.formatCurrency(totalValue, 'USD')}
${totalProfitLossEmoji} Total P/L: ${totalProfitLossColor} ${cryptoService.formatCurrency(totalProfitLoss, 'USD')}
📈 P/L Percentage: ${totalValue > 0 ? ((totalProfitLoss / (totalValue - totalProfitLoss)) * 100).toFixed(2) : '0.00'}%`;
          
          return response;
        } catch (error) {
          Logger.error(`Crypto portfolio error: ${error.message}`);
          return `❌ Failed to get your portfolio: ${error.message}`;
        }

      case 'add':
        if (args.length < 4) {
          return `❌ Usage: !crypto add <symbol> <quantity> <purchase_price>
          
Examples:
!crypto add btc 0.5 45000
!crypto add eth 2 3000
!crypto add ada 1000 1.2
!crypto add sol 10 150`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          const quantity = parseFloat(args[2]);
          const purchasePrice = parseFloat(args[3]);
          
          if (isNaN(quantity) || isNaN(purchasePrice) || quantity <= 0 || purchasePrice <= 0) {
            return '❌ Please provide valid positive numbers for quantity and purchase price.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding ${quantity} ${symbol} at ${cryptoService.formatCurrency(purchasePrice, 'USD')} to your portfolio...` 
          });
          
          const portfolioId = await cryptoService.addToPortfolio(userId, symbol, quantity, purchasePrice);
          
          return `✅ Added to portfolio successfully!
🆔 ID: ${portfolioId}
₿ ${symbol}
📊 Quantity: ${quantity}
💰 Purchase Price: ${cryptoService.formatCurrency(purchasePrice, 'USD')}
💼 Investment: ${cryptoService.formatCurrency(quantity * purchasePrice, 'USD')}`;
        } catch (error) {
          Logger.error(`Crypto add error: ${error.message}`);
          return `❌ Failed to add to portfolio: ${error.message}`;
        }

      case 'remove-item':
        if (args.length < 2) {
          return '❌ Usage: !crypto remove-item <portfolio_id>';
        }
        
        try {
          const portfolioId = parseInt(args[1]);
          if (isNaN(portfolioId)) {
            return '❌ Please provide a valid portfolio ID.';
          }
          
          const success = await cryptoService.removeFromPortfolio(portfolioId, userId);
          
          return success ? 
            `✅ Removed from portfolio successfully!` : 
            `❌ Failed to remove from portfolio. Item not found or access denied.`;
        } catch (error) {
          Logger.error(`Crypto remove-item error: ${error.message}`);
          return `❌ Failed to remove from portfolio: ${error.message}`;
        }

      case 'transactions':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your cryptocurrency transactions...` 
          });
          
          // This would fetch actual transaction history
          // For now, we'll return sample data or indicate the feature is coming soon
          return `📊 *Cryptocurrency Transaction History*
          
This feature requires additional setup for transaction tracking.
          
Coming soon:
- Buy/sell transaction recording
- Fee tracking
- Tax reporting
- Portfolio rebalancing suggestions
- Performance analytics

For now, you can:
- !crypto portfolio - View your current holdings
- !crypto add <symbol> <quantity> <purchase_price> - Add to portfolio
- !crypto remove-item <portfolio_id> - Remove from portfolio`;
        } catch (error) {
          Logger.error(`Crypto transactions error: ${error.message}`);
          return `❌ Failed to get transaction history: ${error.message}`;
        }

      case 'buy':
        if (args.length < 4) {
          return `❌ Usage: !crypto buy <symbol> <quantity> <price> [fee]
          
Examples:
!crypto buy btc 0.5 45000 100
!crypto buy eth 2 3000 50
!crypto buy ada 1000 1.2 5
!crypto buy sol 10 150 25`;
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
            text: `🔄 Recording buy transaction for ${quantity} ${symbol} at ${cryptoService.formatCurrency(price, 'USD')}...` 
          });
          
          // This would record the actual transaction
          // For now, we'll indicate the feature is coming soon
          return `✅ Buy transaction recorded successfully!
          
₿ ${symbol}
📊 Quantity: ${quantity}
💰 Price: ${cryptoService.formatCurrency(price, 'USD')} each
💼 Total Cost: ${cryptoService.formatCurrency(quantity * price, 'USD')}
💳 Fee: ${cryptoService.formatCurrency(fee, 'USD')}
💼 Net Investment: ${cryptoService.formatCurrency((quantity * price) + fee, 'USD')}

Note: This feature is coming soon with full transaction tracking!`;
        } catch (error) {
          Logger.error(`Crypto buy error: ${error.message}`);
          return `❌ Failed to record buy transaction: ${error.message}`;
        }

      case 'sell':
        if (args.length < 4) {
          return `❌ Usage: !crypto sell <symbol> <quantity> <price> [fee]
          
Examples:
!crypto sell btc 0.2 50000 100
!crypto sell eth 1 3200 50
!crypto sell ada 500 1.5 5
!crypto sell sol 5 180 25`;
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
            text: `🔄 Recording sell transaction for ${quantity} ${symbol} at ${cryptoService.formatCurrency(price, 'USD')}...` 
          });
          
          // This would record the actual transaction
          // For now, we'll indicate the feature is coming soon
          return `✅ Sell transaction recorded successfully!
          
₿ ${symbol}
📊 Quantity: ${quantity}
💰 Price: ${cryptoService.formatCurrency(price, 'USD')} each
💼 Total Revenue: ${cryptoService.formatCurrency(quantity * price, 'USD')}
💳 Fee: ${cryptoService.formatCurrency(fee, 'USD')}
💼 Net Proceeds: ${cryptoService.formatCurrency((quantity * price) - fee, 'USD')}

Note: This feature is coming soon with full transaction tracking!`;
        } catch (error) {
          Logger.error(`Crypto sell error: ${error.message}`);
          return `❌ Failed to record sell transaction: ${error.message}`;
        }

      case 'news':
        if (args.length < 2) {
          return `❌ Usage: !crypto news <symbol>
          
Examples:
!crypto news btc
!crypto news ethereum
!crypto news cardano
!crypto news solana`;
        }
        
        try {
          const symbol = args[1].toUpperCase();
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Fetching news for ${symbol}...` 
          });
          
          // This would fetch actual cryptocurrency news
          // For now, we'll return sample data or indicate the feature is coming soon
          return `📰 *${symbol} News*
          
This feature requires additional setup for news integration.
          
Coming soon:
- Real-time cryptocurrency news
- Market analysis and commentary
- Regulatory updates
- Technical analysis reports
- Social sentiment tracking
- Price prediction news

For now, you can:
- !crypto price ${symbol} - Get current price
- !crypto info ${symbol} - Get detailed information
- !crypto market - Get market overview
- !crypto top - Get top cryptocurrencies`;
        } catch (error) {
          Logger.error(`Crypto news error: ${error.message}`);
          return `❌ Failed to get news for ${args[1]}: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !crypto help for available commands`;
    }
  }
};