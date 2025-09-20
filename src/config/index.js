/**
 * Knight Configuration System
 * Handles environment variables and platform-specific settings
 */

require("dotenv").config();

const config = {
  // Bot Settings
  bot: {
    name: process.env.BOT_NAME || "Knight",
    prefix: process.env.BOT_PREFIX || "!",
    version: "1.0.0",
    owner: {
      number: process.env.OWNER_NUMBER || "",
      name: process.env.OWNER_NAME || "Knight Owner",
    },
  },

  // WhatsApp Settings
  whatsapp: {
    sessionName: process.env.SESSION_NAME || "knight-session",
    multiDevice: process.env.MULTI_DEVICE === "true" || true,
    qrTimeout: 60000, // 60 seconds
  },

  // Database Settings
  database: {
    type: process.env.DB_TYPE || "sqlite",
    url: process.env.DB_URL || "./database.sqlite",
  },

  // Platform Detection
  platform: {
    type: detectPlatform(),
    port: process.env.PORT || 3000,
  },

  // API Keys
  api: {
    openai: process.env.OPENAI_API_KEY || "",
    weather: process.env.WEATHER_API_KEY || "",
  },
};

function detectPlatform() {
  // Detect hosting platform
  if (process.env.DYNO) return "heroku";
  if (process.env.RAILWAY_STATIC_URL) return "railway";
  if (process.env.RENDER) return "render";
  if (process.env.REPLIT_CLUSTER) return "replit";
  if (process.env.PANEL) return "panel";
  return "local";
}

module.exports = config;
