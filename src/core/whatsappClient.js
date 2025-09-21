/**
 * Knight WhatsApp Client
 * Baileys integration for WhatsApp functionality
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const Logger = require('../utils/logger');
const connectionManager = require('./connectionManager');
const messageHandler = require('../handlers/messageHandler');
const eventHandler = require('../handlers/eventHandler');

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
    await connectionManager.initialize(this.sock);

    // Register event handlers
    this.setupEventHandlers();
    
    return this.sock;
  }

  setupEventHandlers() {
    // Connection update handler
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        Logger.info('QR Code generated - Scan with WhatsApp');
        qrcode.generate(qr, { small: true });
        eventHandler.emit('qr_generated', qr);
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        Logger.warn(`Connection closed. Reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          setTimeout(() => {
            this.initialize();
          }, 3000);
        }
      } else if (connection === 'open') {
        Logger.success('WhatsApp connection opened successfully!');
        eventHandler.emit('whatsapp_connected');
      }
    });

    // Message handler
    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await messageHandler.handle(this.sock, msg);
          }
        }
      }
    });

    // Group participants update
    this.sock.ev.on('group-participants.update', (update) => {
      Logger.info(`Group participants update: ${JSON.stringify(update)}`);
      eventHandler.emit('group_update', update);
    });
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
}

module.exports = new WhatsAppClient();