/**
 * Knight Configuration
 * Universal configuration system supporting multiple environments
 */

require('dotenv').config();

const config = {
  // Bot Settings
  bot: {
    name: process.env.BOT_NAME || 'Knight',
    prefix: process.env.BOT_PREFIX || '!',
    version: '1.0.0',
    owner: {
      number: process.env.OWNER_NUMBER || '',
      name: process.env.OWNER_NAME || 'Knight Owner'
    }
  },

  // Platform Settings
  platform: {
    type: process.env.PLATFORM_TYPE || 'local',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Database Settings
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    url: process.env.DB_URL || './knight.db'
  },

  // API Keys
  api: {
    openai: process.env.OPENAI_API_KEY || '',
    weather: process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || '',
    news: process.env.NEWS_API_KEY || '',
    crypto: process.env.COINMARKETCAP_API_KEY || process.env.CRYPTO_API_KEY || '',
    stock: process.env.ALPHA_VANTAGE_API_KEY || process.env.STOCK_API_KEY || '',
    finnhub: process.env.FINNHUB_API_KEY || '',
    iex: process.env.IEX_CLOUD_API_KEY || '',
    youtube: process.env.YOUTUBE_API_KEY || '',
    spotify: process.env.SPOTIFY_CLIENT_ID || '',
    tmdb: process.env.TMDB_API_KEY || '',
    omdb: process.env.OMDB_API_KEY || ''
  },

  // Service Settings
  services: {
    youtube: {
      maxFileSize: process.env.YOUTUBE_MAX_FILE_SIZE || '100MB',
      maxDuration: process.env.YOUTUBE_MAX_DURATION || '10m',
      quality: process.env.YOUTUBE_QUALITY || 'best',
      format: process.env.YOUTUBE_FORMAT || 'mp4'
    },
    music: {
      maxFileSize: process.env.MUSIC_MAX_FILE_SIZE || '50MB',
      maxDuration: process.env.MUSIC_MAX_DURATION || '10m',
      quality: process.env.MUSIC_QUALITY || 'best',
      format: process.env.MUSIC_FORMAT || 'mp3'
    },
    weather: {
      units: process.env.WEATHER_UNITS || 'metric',
      language: process.env.WEATHER_LANGUAGE || 'en',
      cacheTime: process.env.WEATHER_CACHE_TIME || '300000' // 5 minutes
    },
    crypto: {
      currency: process.env.CRYPTO_CURRENCY || 'usd',
      cacheTime: process.env.CRYPTO_CACHE_TIME || '300000' // 5 minutes
    },
    stock: {
      cacheTime: process.env.STOCK_CACHE_TIME || '300000' // 5 minutes
    },
    news: {
      language: process.env.NEWS_LANGUAGE || 'en',
      country: process.env.NEWS_COUNTRY || 'us',
      cacheTime: process.env.NEWS_CACHE_TIME || '600000' // 10 minutes
    },
    fitness: {
      units: process.env.FITNESS_UNITS || 'metric'
    },
    recipe: {
      maxIngredients: process.env.RECIPE_MAX_INGREDIENTS || '20'
    },
    entertainment: {
      cacheTime: process.env.ENTERTAINMENT_CACHE_TIME || '3600000' // 1 hour
    },
    financial: {
      currency: process.env.FINANCIAL_CURRENCY || 'USD',
      cacheTime: process.env.FINANCIAL_CACHE_TIME || '300000' // 5 minutes
    },
    contact: {
      cacheTime: process.env.CONTACT_CACHE_TIME || '300000' // 5 minutes
    }
  },

  // Logging Settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE || './logs/knight.log',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '10'
  },

  // Security Settings
  security: {
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW || '60000', // 1 minute
      max: process.env.RATE_LIMIT_MAX || '30' // 30 requests per window
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'knight-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY || 'knight-encryption-key'
    }
  },

  // Notification Settings
  notifications: {
    email: {
      host: process.env.EMAIL_HOST || '',
      port: process.env.EMAIL_PORT || '587',
      secure: process.env.EMAIL_SECURE === 'true' || false,
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    },
    sms: {
      provider: process.env.SMS_PROVIDER || 'twilio',
      accountSid: process.env.SMS_ACCOUNT_SID || '',
      authToken: process.env.SMS_AUTH_TOKEN || '',
      fromNumber: process.env.SMS_FROM_NUMBER || ''
    },
    push: {
      enabled: process.env.PUSH_ENABLED === 'true' || false,
      service: process.env.PUSH_SERVICE || 'firebase'
    }
  },

  // Cache Settings
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true' || true,
    ttl: process.env.CACHE_TTL || '300000', // 5 minutes
    maxSize: process.env.CACHE_MAX_SIZE || '1000'
  },

  // Analytics Settings
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true' || true,
    trackingId: process.env.ANALYTICS_TRACKING_ID || '',
    debug: process.env.ANALYTICS_DEBUG === 'true' || false
  },

  // Schedule Settings
  schedule: {
    enabled: process.env.SCHEDULE_ENABLED === 'true' || true,
    checkInterval: process.env.SCHEDULE_CHECK_INTERVAL || '30000' // 30 seconds
  },

  // Performance Settings
  performance: {
    maxConcurrent: process.env.PERFORMANCE_MAX_CONCURRENT || '10',
    timeout: process.env.PERFORMANCE_TIMEOUT || '30000', // 30 seconds
    retryAttempts: process.env.PERFORMANCE_RETRY_ATTEMPTS || '3'
  },

  // Feature Flags
  features: {
    youtube: process.env.FEATURE_YOUTUBE === 'true' || true,
    music: process.env.FEATURE_MUSIC === 'true' || true,
    weather: process.env.FEATURE_WEATHER === 'true' || true,
    crypto: process.env.FEATURE_CRYPTO === 'true' || true,
    stock: process.env.FEATURE_STOCK === 'true' || true,
    news: process.env.FEATURE_NEWS === 'true' || true,
    fitness: process.env.FEATURE_FITNESS === 'true' || true,
    recipe: process.env.FEATURE_RECIPE === 'true' || true,
    entertainment: process.env.FEATURE_ENTERTAINMENT === 'true' || true,
    financial: process.env.FEATURE_FINANCIAL === 'true' || true,
    contact: process.env.FEATURE_CONTACT === 'true' || true,
    task: process.env.FEATURE_TASK === 'true' || true,
    group: process.env.FEATURE_GROUP === 'true' || true,
    notification: process.env.FEATURE_NOTIFICATION === 'true' || true,
    schedule: process.env.FEATURE_SCHEDULE === 'true' || true,
    status: process.env.FEATURE_STATUS === 'true' || true
  }
};

module.exports = config;