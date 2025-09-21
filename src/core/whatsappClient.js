/**
 * Knight WhatsApp Client
 * Baileys integration for WhatsApp functionality with status viewing
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const Logger = require('../utils/logger');
const database = require('../database');

class WhatsAppClient {
  constructor() {
    this.sock = null;
    this.authState = null;
  }

  async initialize() {
    // Use multi-file auth state for session persistence
    this.authState = await useMultiFileAuthState('auth_info_baileys');
    
    this.sock = makeWASocket({
      auth: this.authState,
      printQRInTerminal: true,
      browser: ['Knight', 'Chrome', '1.0.0']
    });

    // Initialize connection manager
    await this.setupEventHandlers();
    
    return this.sock;
  }

  async setupEventHandlers() {
    // Connection update handler
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        Logger.info('QR Code generated - Scan with WhatsApp');
        qrcode.generate(qr, { small: true });
        console.log('\n📝 Scan this QR code with your WhatsApp app:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Tap Menu (⋮) → Linked Devices → Link a Device');
        console.log('3. Scan the QR code above\n');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        Logger.warn(`Connection closed. Reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          setTimeout(() => {
            this.initialize();
          }, 3000);
        }
      } else if (connection === 'open') {
        Logger.success('WhatsApp connection opened successfully!');
        Logger.success(`Connected as: ${this.sock.user.name} (${this.sock.user.id})`);
      }
    });

    // Credentials update handler
    this.sock.ev.on('creds.update', async () => {
      await this.authState.saveCreds();
    });

    // Message handler for regular messages
    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      
      for (const msg of m.messages) {
        // Handle regular messages (not status)
        if (!msg.key.fromMe && msg.message && !msg.key.remoteJid.includes('status@broadcast')) {
          // This would call your existing message handler
          // We'll implement this separately to avoid circular dependencies
          this.handleRegularMessage(msg);
        }
        
        // Handle status messages
        if (msg.key.remoteJid.includes('status@broadcast')) {
          await this.handleStatusMessage(msg);
        }
      }
    });

    // Group participants update
    this.sock.ev.on('group-participants.update', (update) => {
      Logger.info(`Group participants update: ${JSON.stringify(update)}`);
      // You can add group management logic here
    });
  }

  async handleRegularMessage(message) {
    try {
      // Import the message handler function
      const { default: handleMessage } = await import('../handlers/messageHandler');
      
      // Call the existing message handler
      if (typeof handleMessage === 'function') {
        await handleMessage(this.sock, message);
      }
    } catch (error) {
      Logger.error(`Error handling regular message: ${error.message}`);
    }
  }

  async handleStatusMessage(message) {
    try {
      Logger.info(`📱 STATUS MESSAGE RECEIVED:`);
      Logger.info(`   From: ${message.key.participant || message.key.remoteJid}`);
      Logger.info(`   Message keys: ${message.message ? Object.keys(message.message).join(', ') : 'none'}`);
      
      // Track status view
      const statusService = require('../services/statusService');
      await statusService.trackStatusView(message);
      
      // Auto-view status (mark as seen)
      if (message.key.id) {
        await this.sock.readMessages([message.key]);
        Logger.info(`   ✅ Status viewed automatically`);
      }
      
      // Check if status contains media to download
      if (message.message?.imageMessage || message.message?.videoMessage) {
        Logger.info(`   📎 Status contains media - downloading...`);
        await statusService.downloadStatusMedia(this.sock, message);
      }
      
    } catch (error) {
      Logger.error(`❌ Error handling status message: ${error.message}`);
    }
  }

  async sendMessage(to, message, options = {}) {
    try {
      if (typeof message === 'string') {
        return await this.sock.sendMessage(to, { text: message }, options);
      } else {
        return await this.sock.sendMessage(to, message, options);
      }
    } catch (error) {
      Logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async downloadMediaMessage(message) {
    try {
      return await this.sock.downloadMediaMessage(message);
    } catch (error) {
      Logger.error(`Failed to download media: ${error.message}`);
      throw error;
    }
  }

  // Additional utility methods for WhatsApp functionality
  async getGroupMetadata(groupId) {
    try {
      return await this.sock.groupMetadata(groupId);
    } catch (error) {
      Logger.error(`Failed to get group metadata: ${error.message}`);
      throw error;
    }
  }

  async sendPresenceUpdate(type, to) {
    try {
      return await this.sock.sendPresenceUpdate(type, to);
    } catch (error) {
      Logger.error(`Failed to send presence update: ${error.message}`);
      throw error;
    }
  }

  async updateProfilePicture(jid, imageBuffer) {
    try {
      return await this.sock.updateProfilePicture(jid, imageBuffer);
    } catch (error) {
      Logger.error(`Failed to update profile picture: ${error.message}`);
      throw error;
    }
  }

  async contactBlock(jid) {
    try {
      return await this.sock.contactBlock(jid);
    } catch (error) {
      Logger.error(`Failed to block contact: ${error.message}`);
      throw error;
    }
  }

  async contactUnblock(jid) {
    try {
      return await this.sock.contactUnblock(jid);
    } catch (error) {
      Logger.error(`Failed to unblock contact: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new WhatsAppClient();