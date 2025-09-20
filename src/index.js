/**
 * Knight - Advanced Multi-Platform WhatsApp Bot
 * @version 1.0.0
 * @author Your Name
 */

require("dotenv").config();
const express = require("express");
const path = require("path");

// Initialize Express app for web interface
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Routes
app.get("/", (req, res) => {
  res.json({
    name: process.env.BOT_NAME || "Knight",
    status: "Online",
    version: "1.0.0",
    message: "Knight Bot is running!",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚔️ Knight Bot listening on port ${PORT}`);
  console.log(`🎮 Access interface at http://localhost:${PORT}`);
});

// Export for testing
module.exports = app;
