/**
 * Knight Database Manager
 * Universal database integration supporting multiple database types with enhanced features
 */

const config = require('../config');
const Logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.type = config.database.type;
    this.dbPath = config.database.url || './knight.db';
  }

  async initialize() {
    try {
      switch (this.type) {
        case 'mongodb':
          await this.initMongoDB();
          break;
        case 'postgresql':
          await this.initPostgreSQL();
          break;
        case 'sqlite':
        default:
          await this.initSQLite();
          break;
      }
      Logger.success(`Database initialized: ${this.type}`);
      await this.createTables();
    } catch (error) {
      Logger.error(`Database initialization failed: ${error.message}`);
      throw error;
    }
  }

  async initSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    Logger.info('SQLite connected');
  }

  async initMongoDB() {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(config.database.url);
    await client.connect();
    this.db = client.db();
    Logger.info('MongoDB connected');
  }

  async initPostgreSQL() {
    const { Pool } = require('pg');
    this.db = new Pool({
      connectionString: config.database.url
    });
    await this.db.connect();
    Logger.info('PostgreSQL connected');
  }

  async createTables() {
    if (this.type !== 'sqlite') return;

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT UNIQUE,
        name TEXT,
        commands_used INTEGER DEFAULT 0,
        downloads_made INTEGER DEFAULT 0,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT UNIQUE,
        name TEXT,
        commands_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS download_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT,
        service TEXT,
        title TEXT,
        filename TEXT,
        size INTEGER,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS command_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command_name TEXT,
        user_jid TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        success BOOLEAN,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT,
        user_id TEXT,
        message TEXT,
        scheduled_time DATETIME,
        recurring BOOLEAN DEFAULT FALSE,
        interval TEXT,
        expires_at DATETIME,
        timezone TEXT DEFAULT 'UTC',
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups (jid)
      );

      -- Status viewing tables
      CREATE TABLE IF NOT EXISTS status_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status_id TEXT UNIQUE,
        user_jid TEXT,
        viewed_at DATETIME,
        has_media BOOLEAN DEFAULT FALSE,
        message_type TEXT,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS status_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status_id TEXT,
        filepath TEXT,
        filename TEXT,
        media_type TEXT,
        downloaded_at DATETIME,
        user_jid TEXT,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        FOREIGN KEY (status_id) REFERENCES status_views (status_id)
      );

      -- Notification tables
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        message TEXT,
        type TEXT DEFAULT 'info', -- info, warning, error, success
        priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
        target TEXT DEFAULT 'all', -- all, users, groups
        recipients TEXT, -- JSON array of jids
        scheduled_time DATETIME,
        recurring BOOLEAN DEFAULT FALSE,
        interval TEXT, -- for recurring notifications (e.g., "1d", "2h")
        expires_at DATETIME,
        channel_id TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT,
        notification_type TEXT DEFAULT 'all',
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, notification_type)
      );

      CREATE TABLE IF NOT EXISTS notification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        recipients_count INTEGER,
        FOREIGN KEY (notification_id) REFERENCES notifications (id)
      );

      -- Task management tables
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        user_jid TEXT NOT NULL,
        due_date DATETIME,
        priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
        category TEXT DEFAULT 'personal',
        completed BOOLEAN DEFAULT FALSE,
        recurring BOOLEAN DEFAULT FALSE,
        interval TEXT, -- for recurring tasks (e.g., "1d", "1w")
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      -- Cryptocurrency tables
      CREATE TABLE IF NOT EXISTS crypto_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        target_price REAL NOT NULL,
        condition TEXT DEFAULT 'above', -- above, below
        currency TEXT DEFAULT 'usd',
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS crypto_watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, symbol)
      );

      CREATE TABLE IF NOT EXISTS crypto_price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'usd',
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_symbol_time (symbol, recorded_at)
      );

      -- News tables
      CREATE TABLE IF NOT EXISTS news_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        keyword TEXT NOT NULL,
        category TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS news_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT,
        category TEXT,
        language TEXT DEFAULT 'en',
        country TEXT DEFAULT 'us',
        enabled BOOLEAN DEFAULT TRUE,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS news_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE,
        data TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_query_time (query_hash, fetched_at)
      );

      -- Weather tables
      CREATE TABLE IF NOT EXISTS weather_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        location TEXT NOT NULL,
        conditions TEXT NOT NULL, -- JSON string of alert conditions
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS weather_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        location TEXT NOT NULL,
        nickname TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, location)
      );

      CREATE TABLE IF NOT EXISTS weather_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        data_type TEXT NOT NULL, -- current, forecast, hourly
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_location_type (location, data_type)
      );

      -- Stock tables
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        target_price REAL NOT NULL,
        condition TEXT DEFAULT 'above', -- above, below
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS stock_portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        quantity REAL NOT NULL,
        purchase_price REAL NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS stock_watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, symbol)
      );

      CREATE TABLE IF NOT EXISTS stock_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_symbol_time (symbol, fetched_at)
      );

      -- Fitness tables
      CREATE TABLE IF NOT EXISTS fitness_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        exercise TEXT NOT NULL,
        duration INTEGER NOT NULL, -- in minutes
        intensity TEXT DEFAULT 'medium', -- low, medium, high
        calories_burned INTEGER NOT NULL,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS fitness_nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        food TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'serving',
        calories INTEGER NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        fiber REAL NOT NULL,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS fitness_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        goal_type TEXT NOT NULL, -- workouts_per_week, calories_burned, weight_loss, muscle_gain
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0,
        deadline DATETIME,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS fitness_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        metric TEXT NOT NULL, -- weight, body_fat, muscle_mass, etc.
        value REAL NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS fitness_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        reminder_type TEXT NOT NULL, -- workout, meal, water, sleep
        time TIME NOT NULL,
        days_of_week TEXT, -- comma-separated list of days (0-6)
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      -- Recipe tables
      CREATE TABLE IF NOT EXISTS recipe_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        recipe_id TEXT NOT NULL,
        recipe_name TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS recipe_meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS recipe_meal_plan_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        meal_date DATE NOT NULL,
        meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
        recipe_id TEXT NOT NULL,
        recipe_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES recipe_meal_plans (id)
      );

      CREATE TABLE IF NOT EXISTS recipe_shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        recipe_ids TEXT NOT NULL, -- JSON array of recipe IDs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS recipe_shopping_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        ingredient_name TEXT NOT NULL,
        amount REAL NOT NULL,
        unit TEXT NOT NULL,
        recipes TEXT, -- JSON array of recipe names using this ingredient
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES recipe_shopping_lists (id)
      );

      CREATE TABLE IF NOT EXISTS recipe_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE,
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_query_time (query_hash, fetched_at)
      );

      -- Entertainment tables
      CREATE TABLE IF NOT EXISTS entertainment_watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        media_id TEXT NOT NULL,
        media_type TEXT NOT NULL, -- movie, tv
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, media_id)
      );

      CREATE TABLE IF NOT EXISTS entertainment_watched (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        media_id TEXT NOT NULL,
        media_type TEXT NOT NULL, -- movie, tv
        rating REAL,
        watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, media_id)
      );

      CREATE TABLE IF NOT EXISTS entertainment_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        show_id TEXT NOT NULL,
        season_number INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        air_date DATETIME NOT NULL,
        reminded BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS entertainment_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE,
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_query_time (query_hash, fetched_at)
      );

      -- Financial tables
      CREATE TABLE IF NOT EXISTS financial_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL, -- food, transport, housing, utilities, entertainment, shopping, healthcare, education, travel, other
        description TEXT,
        currency TEXT DEFAULT 'USD',
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT NOT NULL, -- salary, freelance, investment, gift, other_income
        description TEXT,
        currency TEXT DEFAULT 'USD',
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly', -- daily, weekly, monthly, yearly
        currency TEXT DEFAULT 'USD',
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, category)
      );

      CREATE TABLE IF NOT EXISTS financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        goal_type TEXT NOT NULL, -- savings, debt_reduction, investment, emergency_fund, vacation, other
        target_amount REAL NOT NULL,
        deadline DATETIME,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        alert_type TEXT NOT NULL, -- daily_spending, weekly_spending, monthly_spending, budget_exceeded
        threshold REAL NOT NULL,
        condition TEXT DEFAULT 'above', -- above, below
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        symbol TEXT NOT NULL,
        quantity REAL NOT NULL,
        purchase_price REAL NOT NULL,
        current_price REAL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE,
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_query_time (query_hash, fetched_at)
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL, -- expense, income, transfer
        category TEXT NOT NULL,
        description TEXT,
        currency TEXT DEFAULT 'USD',
        reference TEXT,
        balance_after REAL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- cash, bank, credit_card, investment, loan
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- expense, income
        icon TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        UNIQUE(user_jid, name)
      );

      CREATE TABLE IF NOT EXISTS financial_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        report_type TEXT NOT NULL, -- monthly, quarterly, yearly
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        data TEXT NOT NULL, -- JSON string of report data
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS financial_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        reminder_type TEXT NOT NULL, -- bill_due, budget_check, investment_review
        amount REAL,
        description TEXT NOT NULL,
        due_date DATETIME NOT NULL,
        recurring BOOLEAN DEFAULT FALSE,
        interval TEXT, -- for recurring reminders (e.g., "1m", "1d")
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      -- Contact management tables
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        email TEXT,
        address TEXT,
        company TEXT,
        position TEXT,
        birthday DATE,
        notes TEXT,
        group_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        FOREIGN KEY (group_id) REFERENCES contact_groups (id),
        UNIQUE(user_jid, phone_number)
      );

      CREATE TABLE IF NOT EXISTS contact_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id),
        UNIQUE(contact_id, tag)
      );

      CREATE TABLE IF NOT EXISTS contact_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        contact_id INTEGER NOT NULL,
        reminder_type TEXT NOT NULL, -- call, meeting, follow_up, birthday
        message TEXT NOT NULL,
        due_date DATETIME NOT NULL,
        recurring BOOLEAN DEFAULT FALSE,
        interval TEXT, -- for recurring reminders (e.g., "1d", "1w")
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        FOREIGN KEY (contact_id) REFERENCES contacts (id)
      );

      CREATE TABLE IF NOT EXISTS contact_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        interaction_type TEXT NOT NULL, -- call, message, meeting, email
        notes TEXT,
        interaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id)
      );

      CREATE TABLE IF NOT EXISTS contact_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS contact_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id),
        FOREIGN KEY (group_id) REFERENCES contact_groups (id),
        UNIQUE(contact_id, group_id)
      );

      CREATE TABLE IF NOT EXISTS contact_portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        contact_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid),
        FOREIGN KEY (contact_id) REFERENCES contacts (id),
        UNIQUE(user_jid, contact_id)
      );

      CREATE TABLE IF NOT EXISTS contact_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE,
        data TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_query_time (query_hash, fetched_at)
      );

      CREATE TABLE IF NOT EXISTS contact_exports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filename TEXT NOT NULL,
        format TEXT DEFAULT 'json', -- json, csv
        count INTEGER NOT NULL,
        exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );

      CREATE TABLE IF NOT EXISTS contact_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_jid TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filename TEXT NOT NULL,
        format TEXT DEFAULT 'json', -- json, csv
        imported_count INTEGER NOT NULL,
        failed_count INTEGER NOT NULL,
        total_count INTEGER NOT NULL,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_jid) REFERENCES users (jid)
      );
    `);
  }

  // User management
  async getUser(jid) {
    if (this.type === 'sqlite') {
      return await this.db.get('SELECT * FROM users WHERE jid = ?', [jid]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  async createUser(jid, name) {
    if (this.type === 'sqlite') {
      try {
        await this.db.run(`
          INSERT INTO users (jid, name, first_seen, last_seen) 
          VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [jid, name]);
        return await this.getUser(jid);
      } catch (error) {
        // User might already exist
        return await this.getUser(jid);
      }
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  async updateUserStats(jid, commandsUsed = 0, downloadsMade = 0) {
    if (this.type === 'sqlite') {
      await this.db.run(`
        UPDATE users 
        SET commands_used = commands_used + ?, 
            downloads_made = downloads_made + ?,
            last_seen = CURRENT_TIMESTAMP
        WHERE jid = ?
      `, [commandsUsed, downloadsMade, jid]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  // Settings management
  async getSetting(key) {
    if (this.type === 'sqlite') {
      const row = await this.db.get('SELECT value FROM settings WHERE key = ?', [key]);
      return row ? row.value : null;
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  async setSetting(key, value) {
    if (this.type === 'sqlite') {
      await this.db.run(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [key, value]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  // Download history
  async addDownloadHistory(userJid, service, title, filename, size) {
    if (this.type === 'sqlite') {
      await this.db.run(`
        INSERT INTO download_history (user_jid, service, title, filename, size, downloaded_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userJid, service, title, filename, size]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  // Command statistics
  async logCommandExecution(commandName, userJid, executionTime, success) {
    if (this.type === 'sqlite') {
      await this.db.run(`
        INSERT INTO command_stats (command_name, user_jid, executed_at, execution_time, success)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      `, [commandName, userJid, executionTime, success ? 1 : 0]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  // Analytics
  async getTopUsers(limit = 10) {
    if (this.type === 'sqlite') {
      return await this.db.all(`
        SELECT jid, name, commands_used, downloads_made, last_seen
        FROM users 
        ORDER BY commands_used DESC 
        LIMIT ?
      `, [limit]);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  async getCommandStats(limit = 30) {
    if (this.type === 'sqlite') {
      return await this.db.all(`
        SELECT command_name, COUNT(*) as count, AVG(execution_time) as avg_time
        FROM command_stats 
        WHERE executed_at > datetime('now', '-${limit} days')
        GROUP BY command_name
        ORDER BY count DESC
      `);
    }
    // Add MongoDB/PostgreSQL implementations here
  }

  async cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const cutoff = new Date(Date.now() - maxAge).toISOString();
      
      // Clean up old command stats
      await this.db.run(`
        DELETE FROM command_stats 
        WHERE executed_at < ?
      `, [cutoff]);
      
      // Clean up old download history
      await this.db.run(`
        DELETE FROM download_history 
        WHERE downloaded_at < ?
      `, [cutoff]);
      
      // Clean up old scheduled messages
      await this.db.run(`
        DELETE FROM scheduled_messages 
        WHERE scheduled_time < ? AND recurring = 0
      `, [cutoff]);
      
      // Clean up old notification logs
      await this.db.run(`
        DELETE FROM notification_logs 
        WHERE sent_at < ?
      `, [cutoff]);
      
      // Clean up old task logs
      await this.db.run(`
        DELETE FROM task_logs 
        WHERE completed_at < ?
      `, [cutoff]);
      
      // Clean up old crypto price history
      await this.db.run(`
        DELETE FROM crypto_price_history 
        WHERE recorded_at < ?
      `, [cutoff]);
      
      // Clean up old news cache
      await this.db.run(`
        DELETE FROM news_cache 
        WHERE fetched_at < ?
      `, [cutoff]);
      
      // Clean up old weather cache
      await this.db.run(`
        DELETE FROM weather_cache 
        WHERE fetched_at < ?
      `, [cutoff]);
      
      // Clean up old stock cache
      await this.db.run(`
        DELETE FROM stock_cache 
        WHERE fetched_at < ?
      `, [cutoff]);
      
      // Clean up old fitness logs
      await this.db.run(`
        DELETE FROM fitness_logs 
        WHERE logged_at < ?
      `, [cutoff]);
      
      // Clean up old recipe cache
      await this.db.run(`
        DELETE FROM recipe_cache 
        WHERE fetched_at < ?
      `, [cutoff]);
      
      // Clean up old entertainment cache
      await this.db.run(`
        DELETE FROM entertainment_cache 
        WHERE fetched_at < ?
      `, [cutoff]);
      
      // Clean up old financial logs
      await this.db.run(`
        DELETE FROM financial_logs 
        WHERE added_at < ?
      `, [cutoff]);
      
      // Clean up old contact logs
      await this.db.run(`
        DELETE FROM contact_logs 
        WHERE added_at < ?
      `, [cutoff]);
      
      Logger.info('Cleaned up old data');
    } catch (error) {
      Logger.error(`Failed to cleanup old data: ${error.message}`);
    }
  }
}

module.exports = new DatabaseManager();