/**
 * Knight News Service
 * Real-time news aggregation from multiple sources
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class NewsService {
  constructor() {
    this.cache = new Map(); // Cache for news data
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes cache
    this.newsApi = process.env.NEWS_API_KEY;
    this.guardianApi = process.env.GUARDIAN_API_KEY;
    this.nytimesApi = process.env.NYTIMES_API_KEY;
  }

  async initialize() {
    try {
      Logger.success('News service initialized');
      
      // Start periodic news alert checking if API keys are available
      if (this.newsApi || this.guardianApi || this.nytimesApi) {
        setInterval(() => {
          this.checkNewsAlerts();
        }, 15 * 60 * 1000); // Check every 15 minutes
      }
    } catch (error) {
      Logger.error(`News service initialization failed: ${error.message}`);
    }
  }

  async getTopHeadlines(options = {}) {
    try {
      const {
        category = null,
        country = 'us',
        sources = null,
        pageSize = 10,
        page = 1
      } = options;

      // Check cache first
      const cacheKey = `headlines_${category}_${country}_${sources}_${pageSize}_${page}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached headlines for ${cacheKey}`);
        return cached.data;
      }

      let articles;
      
      // Try different APIs based on availability
      if (this.newsApi) {
        articles = await this.getNewsApiHeadlines(options);
      } else if (this.guardianApi) {
        articles = await this.getGuardianHeadlines(options);
      } else if (this.nytimesApi) {
        articles = await this.getNYTimesHeadlines(options);
      } else {
        // Return sample data if no API keys
        articles = this.generateSampleNews(pageSize);
      }

      const result = {
        status: 'ok',
        totalResults: articles.length,
        articles: articles,
        category: category,
        country: country
      };

      // Cache the result
      this.cache.set(cacheKey, {
         result,
        timestamp: Date.now()
      });

      Logger.info(`Fetched ${articles.length} top headlines`);
      return result;

    } catch (error) {
      Logger.error(`Failed to get top headlines: ${error.message}`);
      
      // Return sample data on error
      const articles = this.generateSampleNews(options.pageSize || 10);
      return {
        status: 'error',
        totalResults: articles.length,
        articles: articles,
        category: options.category,
        country: options.country
      };
    }
  }

  async getNewsApiHeadlines(options = {}) {
    try {
      const {
        category = null,
        country = 'us',
        sources = null,
        pageSize = 10,
        page = 1
      } = options;

      let apiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${this.newsApi}&pageSize=${pageSize}&page=${page}&country=${country}`;
      
      if (category) {
        apiUrl += `&category=${category}`;
      }
      
      if (sources) {
        apiUrl += `&sources=${sources}`;
      }

      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.articles.map(article => ({
        source: article.source.name,
        author: article.author,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: new Date(article.publishedAt),
        content: article.content
      }));

      return articles;
    } catch (error) {
      Logger.error(`NewsAPI headlines error: ${error.message}`);
      throw new Error(`Failed to fetch headlines via NewsAPI: ${error.message}`);
    }
  }

  async getGuardianHeadlines(options = {}) {
    try {
      const {
        category = null,
        pageSize = 10,
        page = 1
      } = options;

      let apiUrl = `https://content.guardianapis.com/search?api-key=${this.guardianApi}&page-size=${pageSize}&page=${page}&show-fields=thumbnail,trailText,byline`;
      
      if (category) {
        apiUrl += `&section=${category}`;
      }

      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.response.results.map(article => ({
        source: 'The Guardian',
        author: article.fields?.byline || 'The Guardian',
        title: article.webTitle,
        description: article.fields?.trailText || 'No description available',
        url: article.webUrl,
        urlToImage: article.fields?.thumbnail || null,
        publishedAt: new Date(article.webPublicationDate),
        content: null
      }));

      return articles;
    } catch (error) {
      Logger.error(`Guardian headlines error: ${error.message}`);
      throw new Error(`Failed to fetch headlines via Guardian: ${error.message}`);
    }
  }

  async getNYTimesHeadlines(options = {}) {
    try {
      const {
        category = null,
        pageSize = 10
      } = options;

      let apiUrl = `https://api.nytimes.com/svc/topstories/v2/${category || 'home'}.json?api-key=${this.nytimesApi}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.results.slice(0, pageSize).map(article => ({
        source: 'The New York Times',
        author: article.byline || 'NYTimes Staff',
        title: article.title,
        description: article.abstract || 'No description available',
        url: article.url,
        urlToImage: article.multimedia?.find(media => media.format === 'Standard Thumbnail')?.url || null,
        publishedAt: new Date(article.published_date),
        content: null
      }));

      return articles;
    } catch (error) {
      Logger.error(`NYTimes headlines error: ${error.message}`);
      throw new Error(`Failed to fetch headlines via NYTimes: ${error.message}`);
    }
  }

  async searchNews(query, options = {}) {
    try {
      const {
        sortBy = 'publishedAt', // relevancy, popularity, publishedAt
        pageSize = 10,
        page = 1,
        language = 'en',
        from = null,
        to = null
      } = options;

      // Check cache first
      const cacheKey = `search_${query}_${sortBy}_${pageSize}_${page}_${language}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached search results for ${cacheKey}`);
        return cached.data;
      }

      let articles;
      
      if (this.newsApi) {
        articles = await this.searchNewsApi(query, options);
      } else if (this.guardianApi) {
        articles = await this.searchGuardian(query, options);
      } else if (this.nytimesApi) {
        articles = await this.searchNYTimes(query, options);
      } else {
        // Return sample data
        articles = this.generateSampleNews(pageSize, query);
      }

      const result = {
        status: 'ok',
        totalResults: articles.length,
        articles: articles,
        query: query
      };

      // Cache the result
      this.cache.set(cacheKey, {
         result,
        timestamp: Date.now()
      });

      Logger.info(`Search for "${query}" returned ${articles.length} articles`);
      return result;

    } catch (error) {
      Logger.error(`Failed to search news for "${query}": ${error.message}`);
      
      // Return sample data on error
      const articles = this.generateSampleNews(options.pageSize || 10, query);
      return {
        status: 'error',
        totalResults: articles.length,
        articles: articles,
        query: query
      };
    }
  }

  async searchNewsApi(query, options = {}) {
    try {
      const {
        sortBy = 'publishedAt',
        pageSize = 10,
        page = 1,
        language = 'en',
        from = null,
        to = null
      } = options;

      let apiUrl = `https://newsapi.org/v2/everything?apiKey=${this.newsApi}&q=${encodeURIComponent(query)}&sortBy=${sortBy}&pageSize=${pageSize}&page=${page}&language=${language}`;
      
      if (from) {
        apiUrl += `&from=${from}`;
      }
      
      if (to) {
        apiUrl += `&to=${to}`;
      }

      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.articles.map(article => ({
        source: article.source.name,
        author: article.author,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: new Date(article.publishedAt),
        content: article.content
      }));

      return articles;
    } catch (error) {
      Logger.error(`NewsAPI search error: ${error.message}`);
      throw new Error(`Failed to search via NewsAPI: ${error.message}`);
    }
  }

  async searchGuardian(query, options = {}) {
    try {
      const {
        pageSize = 10,
        page = 1
      } = options;

      const apiUrl = `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&api-key=${this.guardianApi}&page-size=${pageSize}&page=${page}&show-fields=thumbnail,trailText,byline`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.response.results.map(article => ({
        source: 'The Guardian',
        author: article.fields?.byline || 'The Guardian',
        title: article.webTitle,
        description: article.fields?.trailText || 'No description available',
        url: article.webUrl,
        urlToImage: article.fields?.thumbnail || null,
        publishedAt: new Date(article.webPublicationDate),
        content: null
      }));

      return articles;
    } catch (error) {
      Logger.error(`Guardian search error: ${error.message}`);
      throw new Error(`Failed to search via Guardian: ${error.message}`);
    }
  }

  async searchNYTimes(query, options = {}) {
    try {
      const {
        pageSize = 10
      } = options;

      const apiUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&api-key=${this.nytimesApi}&sort=newest`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const articles = data.response.docs.slice(0, pageSize).map(article => ({
        source: 'The New York Times',
        author: article.byline?.original || 'NYTimes Staff',
        title: article.headline?.main || 'No title',
        description: article.snippet || 'No description available',
        url: article.web_url,
        urlToImage: article.multimedia?.length > 0 ? 
          `https://static01.nyt.com/${article.multimedia[0].url}` : null,
        publishedAt: new Date(article.pub_date),
        content: null
      }));

      return articles;
    } catch (error) {
      Logger.error(`NYTimes search error: ${error.message}`);
      throw new Error(`Failed to search via NYTimes: ${error.message}`);
    }
  }

  async getNewsSources() {
    try {
      // Check cache first
      const cacheKey = 'sources';
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      let sources;
      
      if (this.newsApi) {
        sources = await this.getNewsApiSources();
      } else if (this.guardianApi) {
        sources = await this.getGuardianSources();
      } else if (this.nytimesApi) {
        sources = await this.getNYTimesSources();
      } else {
        // Return sample sources
        sources = this.generateSampleSources();
      }

      const result = {
        status: 'ok',
        sources: sources
      };

      // Cache the result
      this.cache.set(cacheKey, {
         result,
        timestamp: Date.now()
      });

      Logger.info(`Fetched ${sources.length} news sources`);
      return result;

    } catch (error) {
      Logger.error(`Failed to get news sources: ${error.message}`);
      
      // Return sample sources on error
      const sources = this.generateSampleSources();
      return {
        status: 'error',
        sources: sources
      };
    }
  }

  async getNewsApiSources() {
    try {
      const apiUrl = `https://newsapi.org/v2/sources?apiKey=${this.newsApi}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const sources = data.sources.map(source => ({
        id: source.id,
        name: source.name,
        description: source.description,
        url: source.url,
        category: source.category,
        language: source.language,
        country: source.country
      }));

      return sources;
    } catch (error) {
      Logger.error(`NewsAPI sources error: ${error.message}`);
      throw new Error(`Failed to fetch sources via NewsAPI: ${error.message}`);
    }
  }

  async getGuardianSources() {
    try {
      const apiUrl = `https://content.guardianapis.com/sections?api-key=${this.guardianApi}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const sources = data.response.results.map(section => ({
        id: section.id,
        name: section.webTitle,
        description: section.editions?.[0]?.webTitle || 'News section',
        url: `https://www.theguardian.com/${section.id}`,
        category: 'news',
        language: 'en',
        country: 'gb'
      }));

      return sources;
    } catch (error) {
      Logger.error(`Guardian sources error: ${error.message}`);
      throw new Error(`Failed to fetch sources via Guardian: ${error.message}`);
    }
  }

  async getNYTimesSources() {
    try {
      // NYTimes doesn't have a sources endpoint, so we'll return sample data
      return this.generateSampleSources();
    } catch (error) {
      Logger.error(`NYTimes sources error: ${error.message}`);
      throw new Error(`Failed to fetch sources via NYTimes: ${error.message}`);
    }
  }

  async setNewsAlert(userId, keyword, category = null) {
    try {
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO news_alerts 
        (user_jid, keyword, category, active, created_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, keyword, category]);
      
      const alertId = result.lastID;
      
      Logger.info(`Set news alert ${alertId} for keyword "${keyword}"`);
      return alertId;
    } catch (error) {
      Logger.error(`Failed to set news alert: ${error.message}`);
      throw new Error(`Failed to set news alert: ${error.message}`);
    }
  }

  async getNewsAlerts(userId) {
    try {
      const alerts = await database.db.all(`
        SELECT * FROM news_alerts 
        WHERE user_jid = ? AND active = 1
        ORDER BY created_at DESC
      `, [userId]);
      
      return alerts;
    } catch (error) {
      Logger.error(`Failed to get news alerts: ${error.message}`);
      return [];
    }
  }

  async removeNewsAlert(alertId, userId) {
    try {
      await database.db.run(`
        UPDATE news_alerts 
        SET active = 0 
        WHERE id = ? AND user_jid = ?
      `, [alertId, userId]);
      
      Logger.info(`Removed news alert ${alertId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove news alert ${alertId}: ${error.message}`);
      return false;
    }
  }

  async checkNewsAlerts() {
    try {
      // Get all active alerts
      const alerts = await database.db.all(`
        SELECT * FROM news_alerts 
        WHERE active = 1
      `);
      
      // Check each alert
      for (const alert of alerts) {
        try {
          const searchResults = await this.searchNews(alert.keyword, {
            pageSize: 5,
            sortBy: 'publishedAt'
          });
          
          // Check if there are new articles (published after alert creation)
          const newArticles = searchResults.articles.filter(article => 
            article.publishedAt > new Date(alert.created_at)
          );
          
          if (newArticles.length > 0) {
            // Trigger alert
            await this.sendNewsAlert(alert, newArticles);
          }
        } catch (error) {
          Logger.error(`Failed to check news alert ${alert.id}: ${error.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check news alerts: ${error.message}`);
    }
  }

  async sendNewsAlert(alert, articles) {
    try {
      Logger.info(`Sending news alert to ${alert.user_jid} for keyword "${alert.keyword}"`);
      
      // This would use the WhatsApp client to send the alert
      // For now, we'll log it
      Logger.info(`NEWS ALERT: Found ${articles.length} new articles for "${alert.keyword}"`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(alert.user_jid, {
      //   text: `📰 *News Alert*
      //   
      //   Found ${articles.length} new articles for "${alert.keyword}":
      //   
      //   ${articles.slice(0, 3).map((article, index) => 
      //     `${index + 1}. ${article.title}\n${article.url}`
      //   ).join('\n\n')}
      //   
      //   Set at: ${new Date(alert.created_at).toLocaleString()}`
      // });
      
    } catch (error) {
      Logger.error(`Failed to send news alert to ${alert.user_jid}: ${error.message}`);
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

  generateSampleNews(count = 10, query = null) {
    const sampleTitles = [
      "Technology Breakthrough Changes Everything",
      "Global Markets React to Economic News",
      "Scientists Discover Revolutionary Treatment",
      "Sports Team Wins Championship After Dramatic Season",
      "Entertainment Industry Announces Major Partnership",
      "Health Experts Warn About New Trend",
      "Environmental Study Reveals Important Findings",
      "Political Leaders Meet to Discuss Key Issues",
      "Business Giant Announces Expansion Plans",
      "Educational Institution Receives Major Donation",
      "Space Mission Achieves Historic Milestone",
      "Artificial Intelligence Makes Significant Advance",
      "Renewable Energy Project Breaks Records",
      "Medical Research Shows Promising Results",
      "International Cooperation Leads to Breakthrough"
    ];

    const sampleDescriptions = [
      "A groundbreaking discovery has the potential to revolutionize multiple industries and change how we approach complex challenges.",
      "Experts analyze the implications of recent developments and what they mean for the future of the field.",
      "New research findings offer hope and insight into previously unsolved problems.",
      "Industry leaders gather to discuss strategies and share innovations that will shape tomorrow's landscape.",
      "Comprehensive study reveals important trends and patterns that experts believe will influence policy decisions.",
      "Innovative approach combines traditional methods with cutting-edge technology to achieve remarkable results.",
      "Collaborative effort brings together diverse perspectives to tackle one of the field's most pressing challenges.",
      "Long-term analysis provides valuable data that could reshape our understanding of fundamental principles."
    ];

    const sampleSources = [
      "BBC News", "CNN", "Reuters", "TechCrunch", 
      "The Verge", "The Guardian", "Financial Times", "Wall Street Journal"
    ];

    const articles = [];
    for (let i = 0; i < count; i++) {
      const titleIndex = Math.floor(Math.random() * sampleTitles.length);
      const descIndex = Math.floor(Math.random() * sampleDescriptions.length);
      const sourceIndex = Math.floor(Math.random() * sampleSources.length);
      
      // If query is provided, make sure some titles contain it
      let title = sampleTitles[titleIndex];
      if (query && !title.toLowerCase().includes(query.toLowerCase())) {
        title = `${query.charAt(0).toUpperCase() + query.slice(1)}: ${title}`;
      }
      
      articles.push({
        source: sampleSources[sourceIndex],
        author: ["John Smith", "Jane Doe", "Alex Johnson", "Maria Garcia", "David Lee"][Math.floor(Math.random() * 5)],
        title: title,
        description: sampleDescriptions[descIndex],
        url: "https://example.com/news/article",
        urlToImage: "https://example.com/news/image.jpg",
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        content: `${sampleDescriptions[descIndex]} This is extended content that would normally appear in a full news article. It provides additional details and context that readers might find valuable.`
      });
    }

    return articles;
  }

  generateSampleSources() {
    return [
      {
        id: "bbc-news",
        name: "BBC News",
        description: "Use BBC News for up-to-the-minute news, breaking news, videos, radio and podcasts.",
        url: "http://www.bbc.co.uk/news",
        category: "general",
        language: "en",
        country: "gb"
      },
      {
        id: "cnn",
        name: "CNN",
        description: "View the latest news and breaking news today for U.S., world, politics, business, tech, science and health.",
        url: "http://www.cnn.com",
        category: "general",
        language: "en",
        country: "us"
      },
      {
        id: "techcrunch",
        name: "TechCrunch",
        description: "TechCrunch is a leading technology media property, delivering definitive coverage of tech startups.",
        url: "https://techcrunch.com",
        category: "technology",
        language: "en",
        country: "us"
      },
      {
        id: "the-verge",
        name: "The Verge",
        description: "The Verge covers the intersection of technology, science, art, and culture.",
        url: "http://www.theverge.com",
        category: "technology",
        language: "en",
        country: "us"
      },
      {
        id: "the-guardian",
        name: "The Guardian",
        description: "Latest UK news, world news, sports, business, opinion, analysis and reviews from the Guardian.",
        url: "https://www.theguardian.com",
        category: "general",
        language: "en",
        country: "gb"
      },
      {
        id: "nytimes",
        name: "The New York Times",
        description: "The New York Times: Find breaking news, multimedia, reviews & opinion on Washington, business, sports, movies, travel, books, jobs, education, real estate, cars & more at nytimes.com.",
        url: "https://www.nytimes.com",
        category: "general",
        language: "en",
        country: "us"
      }
    ];
  }

  formatArticle(article, index = null) {
    const prefix = index ? `${index + 1}. ` : '';
    const dateStr = article.publishedAt.toLocaleDateString();
    const timeStr = article.publishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return `${prefix}*${article.title}*
📰 ${article.source} | ${article.author || 'Anonymous'}
📅 ${dateStr} at ${timeStr}
${article.description ? `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}` : 'No description available'}

🔗 Read more: ${article.url}`;
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up news cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup news cache: ${error.message}`);
    }
  }
}

module.exports = new NewsService();