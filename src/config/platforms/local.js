/**
 * Local Development Configuration
 */
module.exports = {
  name: "local",
  supports: ["web", "cli", "development"],
  limitations: {
    timeout: "unlimited",
    storage: "persistent",
  },
  environment: {
    PORT: process.env.PORT || 3000,
    NODE_ENV: "development",
  },
};
