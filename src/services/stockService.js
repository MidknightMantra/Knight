/**
 * Knight Stock Market Service
 * Real-time stock tracking and alert system
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class StockService {
  constructor() {
    this.cache = new Map(); // Cache for stock data
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.STOCK_API_KEY;
    this.iexApiKey = process.env.IEX_CLOUD_API_KEY;
    this.finnhubApiKey = process.env.FINNHUB_API_KEY;
  }

  async initialize() {
    try {
      Logger.success('Stock service initialized');
      
      // Start periodic stock alert checking if API keys are available
      if (this.apiKey || this.iexApiKey || this.finnhubApiKey) {
        setInterval(() => {
          this.checkStockAlerts();
        }, 10 * 60 * 1000); // Check every 10 minutes
      }
    } catch (error) {
      Logger.error(`Stock service initialization failed: ${error.message}`);
    }
  }

  async getStockQuote(symbol) {
    try {
      symbol = symbol.toUpperCase();
      
      // Check cache first
      const cacheKey = `quote_${symbol}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached quote for ${symbol}`);
        return cached.data;
      }

      let quoteData;
      
      // Try multiple APIs for redundancy
      if (this.finnhubApiKey) {
        quoteData = await this.getFinnhubQuote(symbol);
      } else if (this.iexApiKey) {
        quoteData = await this.getIEXQuote(symbol);
      } else if (this.apiKey) {
        quoteData = await this.getAlphaVantageQuote(symbol);
      } else {
        // Return sample data if no API keys
        quoteData = this.generateSampleQuote(symbol);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: quoteData,
        timestamp: Date.now()
      });

      return quoteData;
    } catch (error) {
      Logger.error(`Failed to get stock quote for ${symbol}: ${error.message}`);
      
      // Return sample data on error
      return this.generateSampleQuote(symbol);
    }
  }

  async getFinnhubQuote(symbol) {
    try {
      const apiUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubApiKey}`;
      const data = await this.fetchFromAPI(apiUrl);
      
      const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.finnhubApiKey}`;
      const profile = await this.fetchFromAPI(profileUrl);
      
      return {
        symbol: symbol,
        companyName: profile.name || symbol,
        price: data.c,
        change: data.d,
        changePercent: ((data.d / (data.c - data.d)) * 100).toFixed(2),
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        volume: data.v,
        timestamp: new Date(data.t * 1000),
        exchange: profile.exchange || 'Unknown',
        industry: profile.finnhubIndustry || 'Unknown'
      };
    } catch (error) {
      throw new Error(`Finnhub API error: ${error.message}`);
    }
  }

  async getIEXQuote(symbol) {
    try {
      const apiUrl = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${this.iexApiKey}`;
      const data = await this.fetchFromAPI(apiUrl);
      
      return {
        symbol: data.symbol,
        companyName: data.companyName,
        price: data.latestPrice,
        change: data.change,
        changePercent: data.changePercent,
        high: data.high,
        low: data.low,
        open: data.open,
        previousClose: data.previousClose,
        volume: data.volume,
        marketCap: data.marketCap,
        peRatio: data.peRatio,
        week52High: data.week52High,
        week52Low: data.week52Low,
        ytdChange: data.ytdChange,
        timestamp: new Date(data.latestUpdate),
        exchange: data.primaryExchange,
        sector: data.sector
      };
    } catch (error) {
      throw new Error(`IEX Cloud API error: ${error.message}`);
    }
  }

  async getAlphaVantageQuote(symbol) {
    try {
      const apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const data = await this.fetchFromAPI(apiUrl);
      
      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('Invalid Alpha Vantage response');
      }
      
      const price = parseFloat(quote['05. price']);
      const previousClose = parseFloat(quote['08. previous close']);
      const change = price - previousClose;
      const changePercent = ((change / previousClose) * 100).toFixed(2);
      
      return {
        symbol: quote['01. symbol'],
        price: price,
        change: change,
        changePercent: changePercent,
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        latestTradingDay: quote['07. latest trading day'],
        previousClose: previousClose,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Alpha Vantage API error: ${error.message}`);
    }
  }

  async getCompanyInfo(symbol) {
    try {
      symbol = symbol.toUpperCase();
      
      let companyData;
      
      if (this.finnhubApiKey) {
        const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.finnhubApiKey}`;
        const profile = await this.fetchFromAPI(profileUrl);
        
        companyData = {
          symbol: profile.ticker,
          companyName: profile.name,
          exchange: profile.exchange,
          industry: profile.finnhubIndustry,
          website: profile.weburl,
          logo: profile.logo,
          description: profile.description,
          ceo: null, // Not available in free tier
          sector: profile.finnhubIndustry,
          employees: null
        };
      } else if (this.iexApiKey) {
        const companyUrl = `https://cloud.iexapis.com/stable/stock/${symbol}/company?token=${this.iexApiKey}`;
        const company = await this.fetchFromAPI(companyUrl);
        
        companyData = {
          symbol: company.symbol,
          companyName: company.companyName,
          exchange: company.exchange,
          industry: company.industry,
          website: company.website,
          description: company.description,
          ceo: company.CEO,
          sector: company.sector,
          employees: company.employees
        };
      } else {
        // Generate sample company data
        companyData = this.generateSampleCompanyInfo(symbol);
      }
      
      return companyData;
    } catch (error) {
      Logger.error(`Failed to get company info for ${symbol}: ${error.message}`);
      return this.generateSampleCompanyInfo(symbol);
    }
  }

  async searchStocks(query) {
    try {
      let searchResults;
      
      if (this.finnhubApiKey) {
        const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${this.finnhubApiKey}`;
        const data = await this.fetchFromAPI(searchUrl);
        
        searchResults = data.result.slice(0, 10).map(item => ({
          symbol: item.symbol,
          name: item.description,
          type: item.type,
          exchange: item.exchange
        }));
      } else if (this.iexApiKey) {
        const searchUrl = `https://cloud.iexapis.com/stable/search/${encodeURIComponent(query)}?token=${this.iexApiKey}`;
        const data = await this.fetchFromAPI(searchUrl);
        
        searchResults = data.slice(0, 10).map(item => ({
          symbol: item.symbol,
          name: item.securityName,
          type: item.securityType,
          exchange: item.primaryExchange
        }));
      } else {
        // Generate sample search results
        searchResults = this.generateSampleSearchResults(query);
      }
      
      return searchResults;
    } catch (error) {
      Logger.error(`Failed to search stocks for "${query}": ${error.message}`);
      return this.generateSampleSearchResults(query);
    }
  }

  async setStockAlert(userId, symbol, targetPrice, condition = 'above') {
    try {
      symbol = symbol.toUpperCase();
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO stock_alerts 
        (user_jid, symbol, target_price, condition, active, created_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, symbol, targetPrice, condition]);
      
      const alertId = result.lastID;
      
      Logger.info(`Set stock alert ${alertId} for ${symbol} at ${targetPrice}`);
      return alertId;
    } catch (error) {
      Logger.error(`Failed to set stock alert: ${error.message}`);
      throw new Error(`Failed to set stock alert: ${error.message}`);
    }
  }

  async getStockAlerts(userId) {
    try {
      const alerts = await database.db.all(`
        SELECT * FROM stock_alerts 
        WHERE user_jid = ? AND active = 1
        ORDER BY created_at DESC
      `, [userId]);
      
      return alerts;
    } catch (error) {
      Logger.error(`Failed to get stock alerts: ${error.message}`);
      return [];
    }
  }

  async removeStockAlert(alertId, userId) {
    try {
      await database.db.run(`
        UPDATE stock_alerts 
        SET active = 0 
        WHERE id = ? AND user_jid = ?
      `, [alertId, userId]);
      
      Logger.info(`Removed stock alert ${alertId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove stock alert ${alertId}: ${error.message}`);
      return false;
    }
  }

  async checkStockAlerts() {
    try {
      // Get all active alerts
      const alerts = await database.db.all(`
        SELECT * FROM stock_alerts 
        WHERE active = 1
      `);
      
      // Check each alert
      for (const alert of alerts) {
        try {
          const currentQuote = await this.getStockQuote(alert.symbol);
          
          let shouldTrigger = false;
          if (alert.condition === 'above' && currentQuote.price >= alert.target_price) {
            shouldTrigger = true;
          } else if (alert.condition === 'below' && currentQuote.price <= alert.target_price) {
            shouldTrigger = true;
          }
          
          if (shouldTrigger) {
            // Trigger alert
            await this.sendStockAlert(alert, currentQuote);
            
            // Deactivate alert
            await database.db.run(`
              UPDATE stock_alerts 
              SET active = 0 
              WHERE id = ?
            `, [alert.id]);
          }
        } catch (checkError) {
          Logger.error(`Failed to check stock alert ${alert.id}: ${checkError.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check stock alerts: ${error.message}`);
    }
  }

  async sendStockAlert(alert, currentQuote) {
    try {
      Logger.info(`Sending stock alert to ${alert.user_jid} for ${alert.symbol}`);
      
      // This would use the WhatsApp client to send the alert
      // For now, we'll log it
      Logger.info(`STOCK ALERT: ${alert.symbol} is now ${alert.condition} ${alert.target_price}! Current price: ${currentQuote.price}`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(alert.user_jid, {
      //   text: `📈 *Stock Price Alert*
      //   
      //   ${alert.symbol} is now ${alert.condition} ${alert.target_price}!
      //   Current price: ${currentQuote.price}
      //   Change: ${currentQuote.change >= 0 ? '+' : ''}${currentQuote.change} (${currentQuote.changePercent}%)
      //   
      //   Set at: ${new Date(alert.created_at).toLocaleString()}`
      // });
      
    } catch (error) {
      Logger.error(`Failed to send stock alert to ${alert.user_jid}: ${error.message}`);
    }
  }

  async getMarketIndices() {
    try {
      const majorIndices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX']; // S&P 500, Dow, Nasdaq, Russell 2000, VIX
      const indices = [];
      
      for (const symbol of majorIndices) {
        try {
          const quote = await this.getStockQuote(symbol.replace('^', '%5E'));
          indices.push({
            symbol: symbol,
            name: this.getIndexName(symbol),
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent
          });
        } catch (error) {
          Logger.error(`Failed to get index ${symbol}: ${error.message}`);
        }
      }
      
      return indices;
    } catch (error) {
      Logger.error(`Failed to get market indices: ${error.message}`);
      return this.generateSampleIndices();
    }
  }

  getIndexName(symbol) {
    const names = {
      '^GSPC': 'S&P 500',
      '^DJI': 'Dow Jones',
      '^IXIC': 'NASDAQ',
      '^RUT': 'Russell 2000',
      '^VIX': 'Volatility Index'
    };
    return names[symbol] || symbol;
  }

  async addToPortfolio(userId, symbol, quantity, purchasePrice) {
    try {
      symbol = symbol.toUpperCase();
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO stock_portfolio 
        (user_jid, symbol, quantity, purchase_price, added_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, symbol, quantity, purchasePrice]);
      
      const portfolioId = result.lastID;
      
      Logger.info(`Added ${symbol} to portfolio for user ${userId}`);
      return portfolioId;
    } catch (error) {
      Logger.error(`Failed to add to portfolio: ${error.message}`);
      throw new Error(`Failed to add to portfolio: ${error.message}`);
    }
  }

  async getPortfolio(userId) {
    try {
      const portfolio = await database.db.all(`
        SELECT * FROM stock_portfolio 
        WHERE user_jid = ?
        ORDER BY added_at DESC
      `, [userId]);
      
      // Get current prices for each stock
      const portfolioWithPrices = [];
      for (const item of portfolio) {
        try {
          const quote = await this.getStockQuote(item.symbol);
          portfolioWithPrices.push({
            ...item,
            currentPrice: quote.price,
            currentChange: quote.change,
            currentChangePercent: quote.changePercent,
            currentValue: quote.price * item.quantity,
            purchaseValue: item.purchase_price * item.quantity,
            profitLoss: (quote.price - item.purchase_price) * item.quantity,
            profitLossPercent: (((quote.price - item.purchase_price) / item.purchase_price) * 100).toFixed(2)
          });
        } catch (error) {
          portfolioWithPrices.push({
            ...item,
            currentPrice: null,
            currentChange: null,
            currentChangePercent: null,
            currentValue: null,
            purchaseValue: item.purchase_price * item.quantity,
            profitLoss: null,
            profitLossPercent: null
          });
        }
      }
      
      return portfolioWithPrices;
    } catch (error) {
      Logger.error(`Failed to get portfolio: ${error.message}`);
      return [];
    }
  }

  async removeFromPortfolio(portfolioId, userId) {
    try {
      await database.db.run(`
        DELETE FROM stock_portfolio 
        WHERE id = ? AND user_jid = ?
      `, [portfolioId, userId]);
      
      Logger.info(`Removed item ${portfolioId} from portfolio`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove from portfolio: ${error.message}`);
      return false;
    }
  }

  async fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });
    });
  }

  generateSampleQuote(symbol) {
    const basePrice = Math.random() * 500 + 10; // Random price between 10-510
    const change = (Math.random() - 0.5) * 10; // Random change between -5 to +5
    const changePercent = ((change / (basePrice - change)) * 100);
    
    return {
      symbol: symbol.toUpperCase(),
      companyName: `${symbol.charAt(0).toUpperCase() + symbol.slice(1)} Corp`,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((basePrice + Math.random() * 5).toFixed(2)),
      low: parseFloat((basePrice - Math.random() * 5).toFixed(2)),
      open: parseFloat((basePrice - (Math.random() - 0.5) * 3).toFixed(2)),
      previousClose: parseFloat((basePrice - (Math.random() - 0.5) * 2).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000),
      timestamp: new Date(),
      exchange: 'NASDAQ',
      industry: 'Technology'
    };
  }

  generateSampleCompanyInfo(symbol) {
    return {
      symbol: symbol.toUpperCase(),
      companyName: `${symbol.charAt(0).toUpperCase() + symbol.slice(1)} Corporation`,
      exchange: 'NASDAQ',
      industry: 'Technology',
      website: `https://www.${symbol.toLowerCase()}.com`,
      description: `Leading ${symbol.toUpperCase()} technology company specializing in innovative solutions for the modern world.`,
      ceo: 'John Smith',
      sector: 'Information Technology',
      employees: Math.floor(Math.random() * 50000) + 1000
    };
  }

  generateSampleSearchResults(query) {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NFLX', 'NVDA', 'AMD', 'INTC'];
    return symbols.slice(0, 5).map(symbol => ({
      symbol: symbol,
      name: `${symbol} Technologies Inc.`,
      type: 'Common Stock',
      exchange: 'NASDAQ'
    }));
  }

  generateSampleIndices() {
    return [
      { symbol: '^GSPC', name: 'S&P 500', price: 4500.25, change: 15.75, changePercent: 0.35 },
      { symbol: '^DJI', name: 'Dow Jones', price: 35000.50, change: 45.25, changePercent: 0.13 },
      { symbol: '^IXIC', name: 'NASDAQ', price: 14500.75, change: 65.50, changePercent: 0.45 },
      { symbol: '^RUT', name: 'Russell 2000', price: 1900.25, change: 8.75, changePercent: 0.46 },
      { symbol: '^VIX', name: 'Volatility Index', price: 15.25, change: -0.50, changePercent: -3.17 }
    ];
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatPercent(percent) {
    if (percent === null || percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${parseFloat(percent).toFixed(2)}%`;
  }

  formatNumber(number) {
    if (number === null || number === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US').format(number);
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up stock cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup stock cache: ${error.message}`);
    }
  }
}

module.exports = new StockService();