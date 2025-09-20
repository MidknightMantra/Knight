/**
 * Knight Command System
 * Central command registry and handler
 */

const fs = require("fs");
const path = require("path");
const Logger = require("../utils/logger");

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.categories = new Set();
  }

  // Register a new command
  register(command) {
    if (!command.name || !command.execute) {
      Logger.error("Invalid command structure");
      return false;
    }

    this.commands.set(command.name.toLowerCase(), command);

    // Register aliases
    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach((alias) => {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      });
    }

    // Add category
    if (command.category) {
      this.categories.add(command.category);
    }

    Logger.success(`Registered command: ${command.name}`);
    return true;
  }

  // Get command by name or alias
  get(name) {
    const normalizedName = name.toLowerCase();

    // Check direct command
    if (this.commands.has(normalizedName)) {
      return this.commands.get(normalizedName);
    }

    // Check alias
    if (this.aliases.has(normalizedName)) {
      const actualName = this.aliases.get(normalizedName);
      return this.commands.get(actualName);
    }

    return null;
  }

  // Get all commands
  getAll() {
    return Array.from(this.commands.values());
  }

  // Get commands by category
  getByCategory(category) {
    return this.getAll().filter((cmd) => cmd.category === category);
  }

  // List all categories
  getCategories() {
    return Array.from(this.categories);
  }
}

// Initialize global command registry
const commandRegistry = new CommandRegistry();

// Auto-load commands from commands directory
function loadCommands() {
  const commandsPath = path.join(__dirname);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file !== "index.js" && file.endsWith(".js"));

  Logger.info(`Loading ${commandFiles.length} commands...`);

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      commandRegistry.register(command);
    } catch (error) {
      Logger.error(`Failed to load command ${file}: ${error.message}`);
    }
  }

  Logger.success(`Loaded ${commandRegistry.commands.size} commands`);
}

module.exports = {
  registry: commandRegistry,
  loadCommands,
};
