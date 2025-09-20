/**
 * Knight Message Handler
 * Processes incoming messages and routes to appropriate commands
 */

const { registry } = require("../commands");
const config = require("../config");
const Logger = require("../utils/logger");

class MessageHandler {
  constructor() {
    this.prefix = config.bot.prefix;
  }

  async handle(client, message) {
    // Ignore messages from self
    if (message.key.fromMe) return;

    // Check if message starts with prefix
    if (!message.body || !message.body.startsWith(this.prefix)) return;

    const args = message.body.slice(this.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Find command
    const command = registry.get(commandName);
    if (!command) {
      await client.sendMessage(
        message.from,
        `❌ Command "${commandName}" not found. Type ${this.prefix}help for available commands.`
      );
      return;
    }

    try {
      Logger.info(`Executing command: ${command.name} from ${message.from}`);
      const response = await command.execute(client, message, args);

      if (response) {
        await client.sendMessage(message.from, response);
      }
    } catch (error) {
      Logger.error(`Error executing command ${command.name}: ${error.message}`);
      await client.sendMessage(
        message.from,
        `❌ An error occurred while executing the command.`
      );
    }
  }
}

module.exports = new MessageHandler();
