/**
 * Knight Connection Manager
 * Handles WhatsApp connection lifecycle
 */

const Logger = require("../utils/logger");
const eventHandler = require("../handlers/eventHandler");

class ConnectionManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  async initialize(client) {
    this.client = client;

    // Register connection events
    this.client.on("qr", this.handleQR.bind(this));
    this.client.on("ready", this.handleReady.bind(this));
    this.client.on("authenticated", this.handleAuthenticated.bind(this));
    this.client.on("auth_failure", this.handleAuthFailure.bind(this));
    this.client.on("disconnected", this.handleDisconnected.bind(this));
  }

  handleQR(qr) {
    Logger.info("QR Code received - Scan with WhatsApp");
    eventHandler.emit("qr_received", qr);
  }

  handleReady() {
    this.isConnected = true;
    this.isConnecting = false;
    Logger.success("Knight Bot is ready!");
    eventHandler.emit("bot_ready");
  }

  handleAuthenticated() {
    Logger.info("Authentication successful");
    eventHandler.emit("authenticated");
  }

  handleAuthFailure(msg) {
    this.isConnected = false;
    this.isConnecting = false;
    Logger.error(`Authentication failed: ${msg}`);
    eventHandler.emit("auth_failure", msg);
  }

  handleDisconnected(reason) {
    this.isConnected = false;
    Logger.warn(`Disconnected: ${reason}`);
    eventHandler.emit("disconnected", reason);
  }

  async connect() {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;
    Logger.info("Connecting to WhatsApp...");

    try {
      await this.client.initialize();
    } catch (error) {
      Logger.error(`Connection failed: ${error.message}`);
      this.isConnecting = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      botName: this.client ? this.client.info?.pushname : "Unknown",
    };
  }
}

module.exports = new ConnectionManager();
