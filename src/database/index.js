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
        INSERT INTO command_stats (command_name, user_jid, execution_time, success, executed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
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
}

module.exports = new DatabaseManager();