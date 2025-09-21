/**
 * Knight Logger Utility
 * Standardized logging across all platforms with enhanced features
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  }
};

class Logger {
  constructor() {
    this.logFile = config.logging.file || './logs/knight.log';
    this.level = config.logging.level || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      success: 3,
      debug: 4
    };
  }

  log(message, type = 'info', force = false) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    const currentLevel = this.levels[this.level] || this.levels.info;
    const messageLevel = this.levels[type] || this.levels.info;
    
    // Only log if level is sufficient or forced
    if (messageLevel <= currentLevel || force) {
      let coloredMessage = message;
      let fileMessage = `${prefix} [${type.toUpperCase()}] ${message}`;
      
      switch(type) {
        case 'success':
          coloredMessage = `${colors.fg.green}${prefix} ✅ ${message}${colors.reset}`;
          break;
        case 'error':
          coloredMessage = `${colors.fg.red}${prefix} ❌ ${message}${colors.reset}`;
          break;
        case 'warn':
          coloredMessage = `${colors.fg.yellow}${prefix} ⚠️  ${message}${colors.reset}`;
          break;
        case 'info':
          coloredMessage = `${colors.fg.blue}${prefix} ℹ️  ${message}${colors.reset}`;
          break;
        case 'debug':
          coloredMessage = `${colors.fg.magenta}${prefix} 🐞 ${message}${colors.reset}`;
          break;
        default:
          coloredMessage = `${colors.fg.white}${prefix} 📝 ${message}${colors.reset}`;
      }
      
      console.log(coloredMessage);
      
      // Write to file
      try {
        fs.appendFileSync(this.logFile, `${fileMessage}\n`);
      } catch (error) {
        // Ignore file write errors to prevent infinite loops
      }
    }
  }

  info(message) {
    this.log(message, 'info');
  }

  success(message) {
    this.log(message, 'success');
  }

  error(message) {
    this.log(message, 'error');
  }

  warn(message) {
    this.log(message, 'warn');
  }

  debug(message) {
    this.log(message, 'debug');
  }

  // Force log regardless of level
  force(message, type = 'info') {
    this.log(message, type, true);
  }

  // Log with timestamp
  timestamp(message, type = 'info') {
    const timestamp = new Date().toLocaleString();
    this.log(`[${timestamp}] ${message}`, type);
  }

  // Log with context
  context(context, message, type = 'info') {
    this.log(`[${context}] ${message}`, type);
  }

  // Log array of messages
  logArray(messages, type = 'info') {
    messages.forEach(message => {
      this.log(message, type);
    });
  }

  // Log object
  logObject(obj, label = 'Object') {
    this.debug(`${label}: ${JSON.stringify(obj, null, 2)}`);
  }

  // Log error with stack trace
  logError(error, context = '') {
    this.error(`${context} ${error.message}`);
    if (error.stack) {
      this.debug(`${context} Stack trace: ${error.stack}`);
    }
  }

  // Log HTTP request
  logHttpRequest(method, url, statusCode, responseTime) {
    const statusColor = statusCode >= 400 ? 'error' : 
                       statusCode >= 300 ? 'warn' : 
                       statusCode >= 200 ? 'success' : 'info';
    
    this.info(`HTTP ${method} ${url} ${statusCode} ${responseTime}ms`, statusColor);
  }

  // Log database query
  logDbQuery(query, params = []) {
    this.debug(`DB Query: ${query} ${params.length > 0 ? `Params: [${params.join(', ')}]` : ''}`);
  }

  // Log API call
  logApiCall(service, endpoint, method = 'GET') {
    this.info(`API Call: ${service} ${method} ${endpoint}`);
  }

  // Log file operation
  logFileOperation(operation, filepath, size = null) {
    const sizeInfo = size ? ` (${this.formatBytes(size)})` : '';
    this.info(`File ${operation}: ${filepath}${sizeInfo}`);
  }

  // Log user action
  logUserAction(userId, action, details = {}) {
    this.info(`USER ${userId} ${action} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log system event
  logSystemEvent(event, details = {}) {
    this.info(`SYSTEM ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log performance metric
  logPerformance(metric, value, unit = '') {
    this.info(`PERF ${metric}: ${value}${unit}`);
  }

  // Log security event
  logSecurityEvent(event, userId, details = {}) {
    this.warn(`SECURITY ${event} for user ${userId} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log analytics event
  logAnalyticsEvent(event, userId, details = {}) {
    this.info(`ANALYTICS ${event} for user ${userId} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log cache operation
  logCacheOperation(operation, key, hit = false) {
    const hitStatus = hit ? 'HIT' : 'MISS';
    this.debug(`CACHE ${operation} ${key} ${hitStatus}`);
  }

  // Log network event
  logNetworkEvent(event, details = {}) {
    this.info(`NETWORK ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log schedule event
  logScheduleEvent(event, details = {}) {
    this.info(`SCHEDULE ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log notification event
  logNotificationEvent(event, details = {}) {
    this.info(`NOTIFICATION ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log task event
  logTaskEvent(event, details = {}) {
    this.info(`TASK ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log download event
  logDownloadEvent(event, details = {}) {
    this.info(`DOWNLOAD ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log command event
  logCommandEvent(event, details = {}) {
    this.info(`COMMAND ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log plugin event
  logPluginEvent(event, details = {}) {
    this.info(`PLUGIN ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log service event
  logServiceEvent(event, details = {}) {
    this.info(`SERVICE ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log configuration event
  logConfigEvent(event, details = {}) {
    this.info(`CONFIG ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log database event
  logDatabaseEvent(event, details = {}) {
    this.info(`DATABASE ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log cleanup event
  logCleanupEvent(event, details = {}) {
    this.info(`CLEANUP ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log initialization event
  logInitEvent(event, details = {}) {
    this.success(`INIT ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Log shutdown event
  logShutdownEvent(event, details = {}) {
    this.warn(`SHUTDOWN ${event} ${Object.keys(details).length > 0 ? JSON.stringify(details) : ''}`);
  }

  // Helper methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  formatPercent(percent) {
    if (percent === null || percent === undefined) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${parseFloat(percent).toFixed(2)}%`;
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

  // Cleanup old log files
  cleanupOldLogs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const logDir = path.dirname(this.logFile);
      const files = fs.readdirSync(logDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filepath = path.join(logDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          this.info(`Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error(`Failed to cleanup log files: ${error.message}`);
    }
  }

  // Rotate log file
  rotateLogFile() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        const maxSize = 100 * 1024 * 1024; // 100MB
        
        if (stats.size > maxSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = `${this.logFile}.${timestamp}`;
          
          fs.renameSync(this.logFile, rotatedFile);
          this.info(`Rotated log file to ${rotatedFile}`);
        }
      }
    } catch (error) {
      this.error(`Failed to rotate log file: ${error.message}`);
    }
  }
}

module.exports = new Logger();