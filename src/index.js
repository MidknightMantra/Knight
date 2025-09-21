/**
 * Knight - Advanced Multi-Platform WhatsApp Bot
 * @version 1.0.0
 * @author Your Name
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const { loadCommands } = require('./commands');
const Logger = require('./utils/logger');
const qrcode = require('qrcode-terminal');
const database = require('./database');

// Initialize Express app
const app = express();
const PORT = config.platform.port;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.json({
    name: config.bot.name,
    status: 'Online',
    version: config.bot.version,
    platform: config.platform.type,
    message: `${config.bot.name} Bot is running!`,
    links: {
      health: '/health',
      status: '/status',
      analytics: '/analytics',
      analytics_dashboard: '/analytics.html'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    platform: config.platform.type
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    bot: {
      name: config.bot.name,
      version: config.bot.version,
      prefix: config.bot.prefix
    },
    platform: config.platform.type
  });
});

// Analytics dashboard route
app.get('/analytics', async (req, res) => {
  try {
    const database = require('./database');
    
    // Get statistics
    const topUsers = await database.getTopUsers(10);
    const commandStats = await database.getCommandStats(30);
    const totalUsers = await database.db.get('SELECT COUNT(*) as count FROM users');
    const totalCommands = await database.db.get('SELECT COUNT(*) as count FROM command_stats');
    const totalDownloads = await database.db.get('SELECT COUNT(*) as count FROM download_history');
    
    res.json({
      stats: {
        totalUsers: totalUsers.count,
        totalCommands: totalCommands.count,
        totalDownloads: totalDownloads.count,
        topUsers: topUsers,
        commandStats: commandStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User statistics route
app.get('/analytics/users', async (req, res) => {
  try {
    const database = require('./database');
    const users = await database.db.all(`
      SELECT jid, name, commands_used, downloads_made, first_seen, last_seen
      FROM users 
      ORDER BY last_seen DESC
      LIMIT 50
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Command statistics route
app.get('/analytics/commands', async (req, res) => {
  try {
    const database = require('./database');
    const commands = await database.db.all(`
      SELECT command_name, COUNT(*) as count, AVG(execution_time) as avg_time
      FROM command_stats 
      GROUP BY command_name
      ORDER BY count DESC
    `);
    res.json(commands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download history route
app.get('/analytics/downloads', async (req, res) => {
  try {
    const database = require('./database');
    const downloads = await database.db.all(`
      SELECT dh.*, u.name as user_name
      FROM download_history dh
      LEFT JOIN users u ON dh.user_jid = u.jid
      ORDER BY dh.downloaded_at DESC
      LIMIT 50
    `);
    res.json(downloads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time stats endpoint
app.get('/analytics/realtime', async (req, res) => {
  try {
    const database = require('./database');
    
    // Get last hour stats
    const recentCommands = await database.db.get(`
      SELECT COUNT(*) as count 
      FROM command_stats 
      WHERE executed_at > datetime('now', '-1 hour')
    `);
    
    const recentUsers = await database.db.get(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE last_seen > datetime('now', '-1 hour')
    `);
    
    res.json({
      activeUsers: recentUsers.count,
      commandsLastHour: recentCommands.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize Knight Bot
async function initializeKnight() {
  try {
    Logger.info(`Initializing ${config.bot.name} v${config.bot.version}`);
    Logger.info(`Platform: ${config.platform.type}`);
    
    // Initialize database
    await database.initialize();
    Logger.success('Database initialized');
    
    // Initialize plugin manager
    const pluginManager = require('./services/pluginManager');
    await pluginManager.loadPlugins();
    Logger.success('Plugins loaded');
    
    // Initialize notification service
    const notificationService = require('./services/notificationService');
    await notificationService.initialize();
    Logger.success('Notification service initialized');
    
    // Load commands
    loadCommands();
    Logger.success('Commands loaded');
    
    // Register plugin commands
    const { registry } = require('./commands');
    pluginManager.registerPluginCommands(registry);
    Logger.success('Plugin commands registered');
    
    // Initialize schedule service
    const scheduleService = require('./services/scheduleService');
    await scheduleService.initialize();
    
    // Set up message execution callback
    scheduleService.setOnMessageExecute(async (scheduledMessage) => {
      try {
        // This would send the actual message
        Logger.info(`Sending scheduled message to ${scheduledMessage.group_id}`);
        // In a real implementation, you'd use the WhatsApp client to send the message
      } catch (error) {
        Logger.error(`Failed to send scheduled message: ${error.message}`);
      }
    });
    
    Logger.success('Schedule service initialized');
    
    // Start Express server
    app.listen(PORT, () => {
      Logger.success(`${config.bot.name} listening on port ${PORT}`);
      Logger.info(`Access interface at http://localhost:${PORT}`);
      Logger.info('Starting WhatsApp connection...');
    });
    
    // Initialize WhatsApp (this will show QR code)
    await initializeWhatsApp();
    
    // Add cleanup task for old downloads
    setInterval(() => {
      try {
        const youtubeService = require('./services/youtubeService');
        youtubeService.cleanupOldDownloads();
      } catch (error) {
        Logger.error(`Cleanup error: ${error.message}`);
      }
    }, 60 * 60 * 1000); // Run every hour
    
    // Add notification cleanup
    setInterval(() => {
      try {
        notificationService.cleanupOldNotifications();
      } catch (error) {
        Logger.error(`Notification cleanup error: ${error.message}`);
      }
    }, 24 * 60 * 60 * 1000); // Run every day
    
  } catch (error) {
    Logger.error(`Failed to initialize ${config.bot.name}: ${error.message}`);
    process.exit(1);
  }
}

// Initialize WhatsApp Client
async function initializeWhatsApp() {
  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
    const { Boom } = require('@hapi/boom');
    const pino = require('pino');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Knight', 'Chrome', '1.0.0']
    });
    
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Handle QR code
      if (qr) {
        Logger.info('QR Code generated - Scan with WhatsApp');
        console.log('\n🔍 Scan this QR code with your WhatsApp app:');
        qrcode.generate(qr, { small: true });
        console.log('\n📝 Instructions:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Tap Menu (⋮) → Linked Devices → Link a Device');
        console.log('3. Scan the QR code above\n');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        Logger.warn(`Connection closed. Reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          setTimeout(() => {
            initializeWhatsApp();
          }, 3000);
        }
      } else if (connection === 'open') {
        Logger.success('WhatsApp connection opened successfully!');
        Logger.success(`Connected as: ${sock.user.name} (${sock.user.id})`);
      }
    });
    
    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });
    
    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            await handleMessage(sock, msg);
          }
        }
      }
    });
    
    Logger.info('WhatsApp client initialized. Generating QR code...');
    
  } catch (error) {
    Logger.error(`WhatsApp initialization failed: ${error.message}`);
  }
}

// Handle incoming messages
async function handleMessage(client, message) {
  try {
    // Track user (create if new, update stats)
    if (message.key.remoteJid && !message.key.remoteJid.includes('@broadcast')) {
      try {
        const userName = message.pushName || 'Unknown';
        await database.createUser(message.key.remoteJid, userName);
      } catch (error) {
        // User might already exist, that's fine
        Logger.debug(`User tracking: ${error.message}`);
      }
    }

    // Extract message body properly for different message types
    let messageBody = '';
    
    if (message.message?.conversation) {
      messageBody = message.message.conversation;
    } else if (message.message?.extendedTextMessage?.text) {
      messageBody = message.message.extendedTextMessage.text;
    } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
      messageBody = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
    }
    
    Logger.info(`📥 MESSAGE RECEIVED DEBUG:`);
    Logger.info(`   From: ${message.key.remoteJid}`);
    Logger.info(`   Message body: "${messageBody}"`);
    Logger.info(`   Message keys: ${message.message ? Object.keys(message.message).join(', ') : 'none'}`);
    Logger.info(`   From me: ${message.key.fromMe}`);
    
    // Check if we should process this message
    if (message.key.fromMe) {
      Logger.info(`   ❌ Ignoring message from self`);
      return;
    }
    
    if (!messageBody) {
      Logger.info(`   ❌ No message body found`);
      return;
    }
    
    // Set the body property for compatibility with existing code
    message.body = messageBody;
    
    const prefix = config.bot.prefix;
    Logger.info(`   Prefix configured: "${prefix}"`);
    
    // Check if message starts with prefix
    if (!messageBody.startsWith(prefix)) {
      Logger.info(`   ❌ Message doesn't start with prefix "${prefix}"`);
      return;
    }
    
    Logger.info(`   ✅ Message has correct prefix`);
    
    const args = messageBody.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    Logger.info(`   🎯 Extracted command: "${commandName}" with ${args.length} args`);
    
    // Find command
    const { registry } = require('./commands');
    const command = registry.get(commandName);
    
    if (command) {
      Logger.info(`   🚀 Found command: ${command.name}`);
      
      // Track command usage
      const startTime = Date.now();
      let success = false;
      
      try {
        const response = await command.execute(client, message, args);
        success = true;
        Logger.info(`   💬 Command response generated: ${typeof response}`);
        
        if (response) {
          Logger.info(`   📤 Sending response: ${response.toString().substring(0, 100)}...`);
          await client.sendMessage(message.key.remoteJid, { text: response.toString() });
          Logger.info(`   ✅ Response sent successfully`);
        }
        
        // Update user stats
        if (message.key.remoteJid && !message.key.remoteJid.includes('@broadcast')) {
          await database.updateUserStats(message.key.remoteJid, 1, 0);
        }
      } catch (error) {
        Logger.error(`   ❌ Error executing command ${command.name}: ${error.message}`);
        await client.sendMessage(message.key.remoteJid, { text: '❌ An error occurred while executing the command.' });
      } finally {
        // Log command execution
        const executionTime = Date.now() - startTime;
        try {
          await database.logCommandExecution(command.name, message.key.remoteJid, executionTime, success);
        } catch (logError) {
          Logger.error(`   ❌ Failed to log command execution: ${logError.message}`);
        }
      }
    } else {
      Logger.info(`   ❓ Command "${commandName}" not found`);
      await client.sendMessage(message.key.remoteJid, { 
        text: `❌ Command "${commandName}" not found. Type ${prefix}help for available commands.` 
      });
    }
  } catch (error) {
    Logger.error(`❌ Error handling message: ${error.message}`);
    Logger.error(`Stack trace: ${error.stack}`);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  Logger.warn('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.warn('Termination signal received...');
  process.exit(0);
});

// Start the bot
initializeKnight();

// Export for testing
module.exports = app;