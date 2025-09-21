/**
 * Example Plugin for Knight
 * Demonstrates plugin system capabilities
 */

const Logger = require('../../src/utils/logger');

// Plugin commands
const commands = {
  'hello': {
    description: 'Say hello from the example plugin',
    usage: '!hello [name]',
    category: 'fun',
    async execute(client, message, args) {
      const name = args[0] || 'World';
      return `👋 Hello ${name}! This message is from the example plugin!`;
    }
  },
  
  'plugin-test': {
    description: 'Test plugin functionality',
    usage: '!plugin-test',
    category: 'utility',
    async execute(client, message, args) {
      return `🧪 This is a test command from the example plugin!`;
    }
  }
};

// Plugin initialization
async function init(plugin) {
  Logger.info(`Example plugin initialized: ${plugin.name} v${plugin.version}`);
}

// Plugin enable handler
async function enable(plugin) {
  Logger.info(`Example plugin enabled: ${plugin.name}`);
}

// Plugin disable handler
async function disable(plugin) {
  Logger.info(`Example plugin disabled: ${plugin.name}`);
}

// Plugin unload handler
async function unload(plugin) {
  Logger.info(`Example plugin unloaded: ${plugin.name}`);
}

// Export plugin
module.exports = {
  commands,
  init,
  enable,
  disable,
  unload
};