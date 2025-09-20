/**
 * Heroku Platform Configuration
 */
module.exports = {
  name: "heroku",
  supports: ["web", "cli"],
  limitations: {
    timeout: 30000, // 30 seconds
    storage: "ephemeral",
  },
  environment: {
    PORT: process.env.PORT || 3000,
    NODE_ENV: "production",
  },
};
