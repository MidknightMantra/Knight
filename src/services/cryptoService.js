/**
 * Knight Cryptocurrency Service
 * Enhanced cryptocurrency tracking with portfolio management
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class CryptoService {
  constructor() {
    this.cache = new Map(); // Cache for crypto data
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.apiKey = process.env.COINMARKETCAP_API_KEY || process.env.CRYPTO_API_KEY;
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;
  }

  async initialize() {
    try {
      Logger.success('Crypto service initialized');
      
      // Start periodic crypto alert checking if API keys are available
      if (this.apiKey || this.coinGeckoApiKey) {
        setInterval(() => {
          this.checkCryptoAlerts();
        }, 5 * 60 * 1000); // Check every 5 minutes
      }
    } catch (error) {
      Logger.error(`Crypto service initialization failed: ${error.message}`);
    }
  }

  async getCryptoPrice(symbol, currency = 'usd') {
    try {
      symbol = symbol.toLowerCase();
      currency = currency.toLowerCase();
      
      // Check cache first
      const cacheKey = `price_${symbol}_${currency}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached price for ${symbol}/${currency}`);
        return cached.data;
      }

      let priceData;
      
      // Try multiple APIs for redundancy
      if (this.coinGeckoApiKey) {
        priceData = await this.getCoinGeckoPrice(symbol, currency);
      } else if (this.apiKey) {
        priceData = await this.getCoinMarketCapPrice(symbol, currency);
      } else {
        // Return sample data if no API keys
        priceData = this.generateSamplePrice(symbol, currency);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         priceData,
        timestamp: Date.now()
      });

      return priceData;
    } catch (error) {
      Logger.error(`Failed to get crypto price for ${symbol}: ${error.message}`);
      
      // Return sample data on error
      return this.generateSamplePrice(symbol, currency);
    }
  }

  async getCoinGeckoPrice(symbol, currency = 'usd') {
    try {
      // Map common symbols to CoinGecko IDs
      const symbolMap = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'bnb': 'binancecoin',
        'ada': 'cardano',
        'sol': 'solana',
        'xrp': 'ripple',
        'dot': 'polkadot',
        'doge': 'dogecoin',
        'avax': 'avalanche',
        'matic': 'matic-network',
        'ltc': 'litecoin',
        'link': 'chainlink',
        'atom': 'cosmos',
        'xlm': 'stellar',
        'vet': 'vechain',
        'algo': 'algorand',
        'icp': 'internet-computer',
        'ftt': 'ftx-token',
        'sand': 'the-sandbox',
        'mana': 'decentraland'
      };
      
      const coinId = symbolMap[symbol] || symbol;
      
      const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      if (!data[coinId] || data[coinId][currency] === undefined) {
        throw new Error(`Cryptocurrency ${symbol} not found or unsupported`);
      }
      
      const result = {
        symbol: symbol,
        coinId: coinId,
        name: this.getCoinName(symbol),
        price: data[coinId][currency],
        marketCap: data[coinId][`${currency}_market_cap`],
        volume24h: data[coinId][`${currency}_24h_vol`],
        change24h: data[coinId][`${currency}_24h_change`],
        lastUpdated: new Date(data[coinId].last_updated_at * 1000),
        currency: currency.toUpperCase()
      };
      
      Logger.info(`Fetched price for ${symbol}/${currency}: ${result.price}`);
      return result;
      
    } catch (error) {
      Logger.error(`CoinGecko price error: ${error.message}`);
      throw new Error(`Failed to fetch price via CoinGecko: ${error.message}`);
    }
  }

  async getCoinMarketCapPrice(symbol, currency = 'usd') {
    try {
      const apiUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}&convert=${currency.toUpperCase()}`;
      
      const headers = {
        'X-CMC_PRO_API_KEY': this.apiKey
      };
      
      const data = await this.fetchFromAPI(apiUrl, headers);
      
      if (!data.data || !data.data[symbol.toUpperCase()]) {
        throw new Error(`Cryptocurrency ${symbol} not found or unsupported`);
      }
      
      const coinData = data.data[symbol.toUpperCase()];
      const quote = coinData.quote[currency.toUpperCase()];
      
      const result = {
        symbol: symbol,
        coinId: coinData.id,
        name: coinData.name,
        price: quote.price,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        change24h: quote.percent_change_24h,
        lastUpdated: new Date(quote.last_updated),
        currency: currency.toUpperCase()
      };
      
      Logger.info(`Fetched price for ${symbol}/${currency}: ${result.price}`);
      return result;
      
    } catch (error) {
      Logger.error(`CoinMarketCap price error: ${error.message}`);
      throw new Error(`Failed to fetch price via CoinMarketCap: ${error.message}`);
    }
  }

  async getCryptoDetails(symbol) {
    try {
      symbol = symbol.toLowerCase();
      
      // Check cache first
      const cacheKey = `details_${symbol}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached details for ${symbol}`);
        return cached.data;
      }

      let details;
      
      if (this.coinGeckoApiKey) {
        details = await this.getCoinGeckoDetails(symbol);
      } else if (this.apiKey) {
        details = await this.getCoinMarketCapDetails(symbol);
      } else {
        // Return sample data
        details = this.generateSampleDetails(symbol);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         details,
        timestamp: Date.now()
      });

      return details;
    } catch (error) {
      Logger.error(`Failed to get crypto details for ${symbol}: ${error.message}`);
      
      // Return sample data on error
      return this.generateSampleDetails(symbol);
    }
  }

  async getCoinGeckoDetails(symbol) {
    try {
      // Map common symbols to CoinGecko IDs
      const symbolMap = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'bnb': 'binancecoin',
        'ada': 'cardano',
        'sol': 'solana',
        'xrp': 'ripple',
        'dot': 'polkadot',
        'doge': 'dogecoin',
        'avax': 'avalanche',
        'matic': 'matic-network',
        'ltc': 'litecoin',
        'link': 'chainlink',
        'atom': 'cosmos',
        'xlm': 'stellar',
        'vet': 'vechain',
        'algo': 'algorand',
        'icp': 'internet-computer',
        'ftt': 'ftx-token',
        'sand': 'the-sandbox',
        'mana': 'decentraland'
      };
      
      const coinId = symbolMap[symbol] || symbol;
      
      const apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const result = {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        description: data.description ? data.description.en : 'No description available',
        website: data.links ? data.links.homepage[0] : null,
        blockchainSite: data.links ? data.links.blockchain_site[0] : null,
        currentPrice: data.market_data ? data.market_data.current_price.usd : null,
        marketCap: data.market_data ? data.market_data.market_cap.usd : null,
        marketCapRank: data.market_data ? data.market_data.market_cap_rank : null,
        volume24h: data.market_data ? data.market_data.total_volume.usd : null,
        change24h: data.market_data ? data.market_data.price_change_percentage_24h : null,
        change7d: data.market_data ? data.market_data.price_change_percentage_7d : null,
        change30d: data.market_data ? data.market_data.price_change_percentage_30d : null,
        circulatingSupply: data.market_data ? data.market_data.circulating_supply : null,
        totalSupply: data.market_data ? data.market_data.total_supply : null,
        maxSupply: data.market_data ? data.market_data.max_supply : null,
        ath: data.market_data ? data.market_data.ath.usd : null,
        athDate: data.market_data ? new Date(data.market_data.ath_date.usd) : null,
        atl: data.market_data ? data.market_data.atl.usd : null,
        atlDate: data.market_data ? new Date(data.market_data.atl_date.usd) : null,
        sentiment: data.sentiment_votes_up_percentage ? data.sentiment_votes_up_percentage : null
      };
      
      Logger.info(`Fetched details for ${symbol}`);
      return result;
      
    } catch (error) {
      Logger.error(`CoinGecko details error: ${error.message}`);
      throw new Error(`Failed to fetch details via CoinGecko: ${error.message}`);
    }
  }

  async getCoinMarketCapDetails(symbol) {
    try {
      const apiUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbol.toUpperCase()}`;
      
      const headers = {
        'X-CMC_PRO_API_KEY': this.apiKey
      };
      
      const data = await this.fetchFromAPI(apiUrl, headers);
      
      if (!data.data || !data.data[symbol.toUpperCase()]) {
        throw new Error(`Cryptocurrency ${symbol} not found or unsupported`);
      }
      
      const coinData = data.data[symbol.toUpperCase()];
      
      const result = {
        id: coinData.id,
        symbol: coinData.symbol,
        name: coinData.name,
        description: coinData.description || 'No description available',
        website: coinData.urls ? coinData.urls.website[0] : null,
        technicalDoc: coinData.urls ? coinData.urls.technical_doc[0] : null,
        explorer: coinData.urls ? coinData.urls.explorer[0] : null,
        sourceCode: coinData.urls ? coinData.urls.source_code[0] : null,
        reddit: coinData.urls ? coinData.urls.reddit[0] : null,
        twitter: coinData.urls ? coinData.urls.twitter[0] : null,
        tags: coinData.tags || [],
        platform: coinData.platform ? coinData.platform.name : null,
        dateAdded: coinData.date_added ? new Date(coinData.date_added) : null,
        notice: coinData.notice || null
      };
      
      Logger.info(`Fetched details for ${symbol}`);
      return result;
      
    } catch (error) {
      Logger.error(`CoinMarketCap details error: ${error.message}`);
      throw new Error(`Failed to fetch details via CoinMarketCap: ${error.message}`);
    }
  }

  async searchCryptos(query) {
    try {
      // Check cache first
      const cacheKey = `search_${query}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached search results for ${query}`);
        return cached.data;
      }

      let results;
      
      if (this.coinGeckoApiKey) {
        results = await this.searchCoinGecko(query);
      } else if (this.apiKey) {
        results = await this.searchCoinMarketCap(query);
      } else {
        // Return sample data
        results = this.generateSampleSearchResults(query);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      Logger.error(`Failed to search cryptos for "${query}": ${error.message}`);
      
      // Return sample data on error
      return this.generateSampleSearchResults(query);
    }
  }

  async searchCoinGecko(query) {
    try {
      const apiUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      if (!data.coins || data.coins.length === 0) {
        return [];
      }
      
      const results = data.coins.slice(0, 10).map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        marketCapRank: coin.market_cap_rank
      }));
      
      Logger.info(`Search for "${query}" returned ${results.length} results`);
      return results;
      
    } catch (error) {
      Logger.error(`CoinGecko search error: ${error.message}`);
      throw new Error(`Failed to search via CoinGecko: ${error.message}`);
    }
  }

  async searchCoinMarketCap(query) {
    try {
      const apiUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=${encodeURIComponent(query.toUpperCase())}`;
      
      const headers = {
        'X-CMC_PRO_API_KEY': this.apiKey
      };
      
      const data = await this.fetchFromAPI(apiUrl, headers);
      
      if (!data.data || data.data.length === 0) {
        return [];
      }
      
      const results = data.data.slice(0, 10).map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        slug: coin.slug,
        isActive: coin.is_active,
        firstHistoricalData: coin.first_historical_data ? new Date(coin.first_historical_data) : null,
        lastHistoricalData: coin.last_historical_data ? new Date(coin.last_historical_data) : null
      }));
      
      Logger.info(`Search for "${query}" returned ${results.length} results`);
      return results;
      
    } catch (error) {
      Logger.error(`CoinMarketCap search error: ${error.message}`);
      throw new Error(`Failed to search via CoinMarketCap: ${error.message}`);
    }
  }

  async setPriceAlert(userId, symbol, targetPrice, condition = 'above', currency = 'usd') {
    try {
      symbol = symbol.toLowerCase();
      currency = currency.toLowerCase();
      
      // Validate inputs
      if (isNaN(targetPrice) || targetPrice <= 0) {
        throw new Error('Target price must be a positive number');
      }
      
      if (!['above', 'below'].includes(condition.toLowerCase())) {
        throw new Error('Condition must be "above" or "below"');
      }
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO crypto_alerts 
        (user_jid, symbol, target_price, condition, currency, active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, symbol, targetPrice, condition, currency]);
      
      const alertId = result.lastID;
      
      Logger.info(`Set crypto alert ${alertId} for ${symbol} at ${targetPrice} ${currency}`);
      return alertId;
    } catch (error) {
      Logger.error(`Failed to set crypto alert: ${error.message}`);
      throw new Error(`Failed to set crypto alert: ${error.message}`);
    }
  }

  async getPriceAlerts(userId) {
    try {
      const alerts = await database.db.all(`
        SELECT * FROM crypto_alerts 
        WHERE user_jid = ? AND active = 1
        ORDER BY created_at DESC
      `, [userId]);
      
      return alerts;
    } catch (error) {
      Logger.error(`Failed to get crypto alerts: ${error.message}`);
      return [];
    }
  }

  async removePriceAlert(alertId, userId) {
    try {
      await database.db.run(`
        UPDATE crypto_alerts 
        SET active = 0 
        WHERE id = ? AND user_jid = ?
      `, [alertId, userId]);
      
      Logger.info(`Removed crypto alert ${alertId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove crypto alert ${alertId}: ${error.message}`);
      return false;
    }
  }

  async checkCryptoAlerts() {
    try {
      // Get all active alerts
      const alerts = await database.db.all(`
        SELECT * FROM crypto_alerts 
        WHERE active = 1
      `);
      
      // Check each alert
      for (const alert of alerts) {
        try {
          const currentPrice = await this.getCryptoPrice(alert.symbol, alert.currency);
          
          let shouldTrigger = false;
          if (alert.condition === 'above' && currentPrice.price >= alert.target_price) {
            shouldTrigger = true;
          } else if (alert.condition === 'below' && currentPrice.price <= alert.target_price) {
            shouldTrigger = true;
          }
          
          if (shouldTrigger) {
            // Trigger alert
            await this.sendPriceAlert(alert, currentPrice.price);
            
            // Deactivate alert
            await database.db.run(`
              UPDATE crypto_alerts 
              SET active = 0 
              WHERE id = ?
            `, [alert.id]);
          }
        } catch (error) {
          Logger.error(`Failed to check crypto alert ${alert.id}: ${error.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check crypto alerts: ${error.message}`);
    }
  }

  async sendPriceAlert(alert, currentPrice) {
    try {
      Logger.info(`Sending crypto price alert to ${alert.user_jid} for ${alert.symbol}`);
      
      // This would use the WhatsApp client to send the alert
      // For now, we'll log it
      Logger.info(`CRYPTO ALERT: ${alert.symbol.toUpperCase()} is now ${alert.condition} ${alert.target_price} ${alert.currency.toUpperCase()}! Current price: ${currentPrice} ${alert.currency.toUpperCase()}`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(alert.user_jid, {
      //   text: `🔔 *Crypto Price Alert*
      //   
      //   ${alert.symbol.toUpperCase()} is now ${alert.condition} ${alert.target_price} ${alert.currency.toUpperCase()}!
      //   Current price: ${currentPrice} ${alert.currency.toUpperCase()}
      //   
      //   Set at: ${new Date(alert.created_at).toLocaleString()}`
      // });
      
    } catch (error) {
      Logger.error(`Failed to send crypto price alert to ${alert.user_jid}: ${error.message}`);
    }
  }

  async addToWatchlist(userId, symbol) {
    try {
      symbol = symbol.toLowerCase();
      
      // Insert into database
      const result = await database.db.run(`
        INSERT OR IGNORE INTO crypto_watchlist 
        (user_jid, symbol, added_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [userId, symbol]);
      
      const watchlistId = result.lastID;
      
      Logger.info(`Added ${symbol} to watchlist for user ${userId}`);
      return watchlistId;
    } catch (error) {
      Logger.error(`Failed to add to watchlist: ${error.message}`);
      throw new Error(`Failed to add to watchlist: ${error.message}`);
    }
  }

  async removeFromWatchlist(userId, symbol) {
    try {
      symbol = symbol.toLowerCase();
      
      await database.db.run(`
        DELETE FROM crypto_watchlist 
        WHERE user_jid = ? AND symbol = ?
      `, [userId, symbol]);
      
      Logger.info(`Removed ${symbol} from watchlist for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove from watchlist: ${error.message}`);
      return false;
    }
  }

  async getWatchlist(userId) {
    try {
      const watchlist = await database.db.all(`
        SELECT * FROM crypto_watchlist 
        WHERE user_jid = ?
        ORDER BY added_at DESC
      `, [userId]);
      
      return watchlist;
    } catch (error) {
      Logger.error(`Failed to get watchlist: ${error.message}`);
      return [];
    }
  }

  async addToPortfolio(userId, symbol, quantity, purchasePrice) {
    try {
      symbol = symbol.toLowerCase();
      
      // Validate inputs
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }
      
      if (isNaN(purchasePrice) || purchasePrice <= 0) {
        throw new Error('Purchase price must be a positive number');
      }
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO crypto_portfolio 
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
        SELECT * FROM crypto_portfolio 
        WHERE user_jid = ?
        ORDER BY added_at DESC
      `, [userId]);
      
      // Get current prices for each coin
      const portfolioWithPrices = [];
      
      for (const item of portfolio) {
        try {
          const currentPrice = await this.getCryptoPrice(item.symbol);
          const currentValue = currentPrice.price * item.quantity;
          const purchaseValue = item.purchase_price * item.quantity;
          const profitLoss = currentValue - purchaseValue;
          const profitLossPercent = purchaseValue > 0 ? ((profitLoss / purchaseValue) * 100) : 0;
          
          portfolioWithPrices.push({
            ...item,
            currentPrice: currentPrice.price,
            currentValue: currentValue,
            purchaseValue: purchaseValue,
            profitLoss: profitLoss,
            profitLossPercent: profitLossPercent
          });
        } catch (error) {
          Logger.error(`Failed to get price for ${item.symbol}: ${error.message}`);
          portfolioWithPrices.push({
            ...item,
            currentPrice: null,
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
        DELETE FROM crypto_portfolio 
        WHERE id = ? AND user_jid = ?
      `, [portfolioId, userId]);
      
      Logger.info(`Removed item ${portfolioId} from portfolio for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove from portfolio: ${error.message}`);
      return false;
    }
  }

  async getTopCryptos(currency = 'usd', limit = 10) {
    try {
      // Check cache first
      const cacheKey = `top_${currency}_${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached top cryptos for ${currency}`);
        return cached.data;
      }

      let results;
      
      if (this.coinGeckoApiKey) {
        results = await this.getTopCoinGecko(currency, limit);
      } else if (this.apiKey) {
        results = await this.getTopCoinMarketCap(currency, limit);
      } else {
        // Return sample data
        results = this.generateSampleTopCryptos(currency, limit);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      Logger.error(`Failed to get top cryptos: ${error.message}`);
      
      // Return sample data on error
      return this.generateSampleTopCryptos(currency, limit);
    }
  }

  async getTopCoinGecko(currency = 'usd', limit = 10) {
    try {
      const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const results = data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        volume24h: coin.total_volume,
        change24h: coin.price_change_percentage_24h,
        change7d: coin.price_change_percentage_7d,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
        ath: coin.ath,
        atl: coin.atl,
        image: coin.image
      }));
      
      Logger.info(`Fetched top ${results.length} cryptos`);
      return results;
      
    } catch (error) {
      Logger.error(`CoinGecko top cryptos error: ${error.message}`);
      throw new Error(`Failed to fetch top cryptos via CoinGecko: ${error.message}`);
    }
  }

  async getTopCoinMarketCap(currency = 'usd', limit = 10) {
    try {
      const apiUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=${limit}&convert=${currency.toUpperCase()}`;
      
      const headers = {
        'X-CMC_PRO_API_KEY': this.apiKey
      };
      
      const data = await this.fetchFromAPI(apiUrl, headers);
      
      const results = data.data.map(coin => {
        const quote = coin.quote[currency.toUpperCase()];
        return {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          currentPrice: quote.price,
          marketCap: quote.market_cap,
          marketCapRank: coin.cmc_rank,
          volume24h: quote.volume_24h,
          change24h: quote.percent_change_24h,
          change7d: quote.percent_change_7d,
          circulatingSupply: coin.circulating_supply,
          totalSupply: coin.total_supply,
          maxSupply: coin.max_supply,
          ath: null, // Not available in this endpoint
          atl: null, // Not available in this endpoint
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`
        };
      });
      
      Logger.info(`Fetched top ${results.length} cryptos`);
      return results;
      
    } catch (error) {
      Logger.error(`CoinMarketCap top cryptos error: ${error.message}`);
      throw new Error(`Failed to fetch top cryptos via CoinMarketCap: ${error.message}`);
    }
  }

  async getMarketOverview() {
    try {
      // Check cache first
      const cacheKey = 'market_overview';
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info('Returning cached market overview');
        return cached.data;
      }

      let overview;
      
      if (this.coinGeckoApiKey) {
        overview = await this.getCoinGeckoMarketOverview();
      } else if (this.apiKey) {
        overview = await this.getCoinMarketCapMarketOverview();
      } else {
        // Return sample data
        overview = this.generateSampleMarketOverview();
      }

      // Cache the result
      this.cache.set(cacheKey, {
         overview,
        timestamp: Date.now()
      });

      return overview;
    } catch (error) {
      Logger.error(`Failed to get market overview: ${error.message}`);
      
      // Return sample data on error
      return this.generateSampleMarketOverview();
    }
  }

  async getCoinGeckoMarketOverview() {
    try {
      const apiUrl = 'https://api.coingecko.com/api/v3/global';
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const result = {
        totalMarketCap: data.data.total_market_cap.usd,
        totalVolume: data.data.total_volume.usd,
        marketCapChangePercentage24h: data.data.market_cap_change_percentage_24h_usd,
        activeCryptocurrencies: data.data.active_cryptocurrencies,
        markets: data.data.markets,
        dominance: {
          btc: data.data.market_cap_percentage.btc,
          eth: data.data.market_cap_percentage.eth
        },
        updatedAt: new Date()
      };
      
      Logger.info('Fetched CoinGecko market overview');
      return result;
      
    } catch (error) {
      Logger.error(`CoinGecko market overview error: ${error.message}`);
      throw new Error(`Failed to fetch market overview via CoinGecko: ${error.message}`);
    }
  }

  async getCoinMarketCapMarketOverview() {
    try {
      const apiUrl = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
      
      const headers = {
        'X-CMC_PRO_API_KEY': this.apiKey
      };
      
      const data = await this.fetchFromAPI(apiUrl, headers);
      
      const result = {
        totalMarketCap: data.data.quote.USD.total_market_cap,
        totalVolume: data.data.quote.USD.total_volume_24h,
        marketCapChangePercentage24h: data.data.quote.USD.market_cap_change_percentage_24h,
        activeCryptocurrencies: data.data.active_cryptocurrencies,
        markets: data.data.active_market_pairs,
        dominance: {
          btc: data.data.btc_dominance,
          eth: data.data.eth_dominance
        },
        updatedAt: new Date(data.data.last_updated)
      };
      
      Logger.info('Fetched CoinMarketCap market overview');
      return result;
      
    } catch (error) {
      Logger.error(`CoinMarketCap market overview error: ${error.message}`);
      throw new Error(`Failed to fetch market overview via CoinMarketCap: ${error.message}`);
    }
  }

  async fetchFromAPI(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: headers
      };
      
      const lib = parsedUrl.protocol === 'https:' ? https : require('http');
      
      const req = lib.request(options, (res) => {
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
      });
      
      req.on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });
      
      req.end();
    });
  }

  getCoinName(symbol) {
    const names = {
      'btc': 'Bitcoin',
      'eth': 'Ethereum',
      'bnb': 'Binance Coin',
      'ada': 'Cardano',
      'sol': 'Solana',
      'xrp': 'Ripple',
      'dot': 'Polkadot',
      'doge': 'Dogecoin',
      'avax': 'Avalanche',
      'matic': 'Polygon',
      'ltc': 'Litecoin',
      'link': 'Chainlink',
      'atom': 'Cosmos',
      'xlm': 'Stellar',
      'vet': 'VeChain',
      'algo': 'Algorand',
      'icp': 'Internet Computer',
      'ftt': 'FTX Token',
      'sand': 'The Sandbox',
      'mana': 'Decentraland'
    };
    
    return names[symbol.toLowerCase()] || symbol.toUpperCase();
  }

  formatCurrency(amount, currency = 'USD') {
    if (amount === null || amount === undefined) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: amount < 1 ? 6 : 2,
      maximumFractionDigits: amount < 1 ? 8 : 2
    });
    
    return formatter.format(amount);
  }

  formatPercent(percent) {
    if (percent === null || percent === undefined) return 'N/A';
    
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${parseFloat(percent).toFixed(2)}%`;
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up crypto cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup crypto cache: ${error.message}`);
    }
  }

  generateSamplePrice(symbol, currency = 'usd') {
    const basePrice = Math.random() * 50000 + 1; // Random price between 1-50001
    const change = (Math.random() - 0.5) * 1000; // Random change between -500 to +500
    const changePercent = ((change / (basePrice - change)) * 100);
    
    return {
      symbol: symbol.toUpperCase(),
      coinId: symbol.toLowerCase(),
      name: this.getCoinName(symbol),
      price: parseFloat(basePrice.toFixed(2)),
      marketCap: parseFloat((basePrice * 1000000).toFixed(2)),
      volume24h: parseFloat((basePrice * 50000).toFixed(2)),
      change24h: parseFloat(changePercent.toFixed(2)),
      lastUpdated: new Date(),
      currency: currency.toUpperCase()
    };
  }

  generateSampleDetails(symbol) {
    return {
      id: symbol.toLowerCase(),
      symbol: symbol.toUpperCase(),
      name: this.getCoinName(symbol),
      description: `Sample description for ${this.getCoinName(symbol)}. This is a decentralized digital currency that enables instant payments to anyone, anywhere in the world.`,
      website: `https://www.${symbol.toLowerCase()}.org`,
      blockchainSite: `https://explorer.${symbol.toLowerCase()}.org`,
      currentPrice: Math.random() * 50000 + 1,
      marketCap: Math.random() * 1000000000 + 100000000,
      marketCapRank: Math.floor(Math.random() * 100) + 1,
      volume24h: Math.random() * 50000000 + 1000000,
      change24h: (Math.random() - 0.5) * 20,
      change7d: (Math.random() - 0.5) * 50,
      change30d: (Math.random() - 0.5) * 100,
      circulatingSupply: Math.random() * 100000000 + 10000000,
      totalSupply: Math.random() * 200000000 + 100000000,
      maxSupply: Math.random() * 300000000 + 200000000,
      ath: Math.random() * 100000 + 50000,
      athDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      atl: Math.random() * 100 + 1,
      atlDate: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000),
      sentiment: Math.random() * 100
    };
  }

  generateSampleSearchResults(query) {
    const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE', 'AVAX', 'MATIC'];
    return symbols.slice(0, 5).map(symbol => ({
      id: symbol.toLowerCase(),
      name: this.getCoinName(symbol),
      symbol: symbol,
      marketCapRank: Math.floor(Math.random() * 50) + 1
    }));
  }

  generateSampleTopCryptos(currency = 'usd', limit = 10) {
    const coins = [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
      { id: 'binancecoin', symbol: 'bnb', name: 'Binance Coin' },
      { id: 'cardano', symbol: 'ada', name: 'Cardano' },
      { id: 'solana', symbol: 'sol', name: 'Solana' },
      { id: 'ripple', symbol: 'xrp', name: 'Ripple' },
      { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
      { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
      { id: 'avalanche', symbol: 'avax', name: 'Avalanche' },
      { id: 'matic-network', symbol: 'matic', name: 'Polygon' }
    ];
    
    return coins.slice(0, limit).map(coin => {
      const basePrice = Math.random() * 50000 + 1;
      const change24h = (Math.random() - 0.5) * 20;
      const change7d = (Math.random() - 0.5) * 50;
      
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        currentPrice: parseFloat(basePrice.toFixed(2)),
        marketCap: parseFloat((basePrice * 1000000).toFixed(2)),
        marketCapRank: coins.findIndex(c => c.id === coin.id) + 1,
        volume24h: parseFloat((basePrice * 50000).toFixed(2)),
        change24h: parseFloat(change24h.toFixed(2)),
        change7d: parseFloat(change7d.toFixed(2)),
        circulatingSupply: Math.random() * 100000000 + 10000000,
        totalSupply: Math.random() * 200000000 + 100000000,
        maxSupply: Math.random() * 300000000 + 200000000,
        ath: Math.random() * 100000 + 50000,
        atl: Math.random() * 100 + 1,
        image: `https://cryptologos.cc/logos/${coin.symbol}-logo.png`
      };
    });
  }

  generateSampleMarketOverview() {
    return {
      totalMarketCap: Math.random() * 2000000000000 + 1000000000000, // 1-3 trillion
      totalVolume: Math.random() * 100000000000 + 50000000000, // 50-150 billion
      marketCapChangePercentage24h: (Math.random() - 0.5) * 10, // -5% to +5%
      activeCryptocurrencies: Math.floor(Math.random() * 10000) + 5000, // 5000-15000
      markets: Math.floor(Math.random() * 50000) + 20000, // 20000-70000
      dominance: {
        btc: Math.random() * 50 + 30, // 30-80%
        eth: Math.random() * 20 + 10 // 10-30%
      },
      updatedAt: new Date()
    };
  }
}

module.exports = new CryptoService();