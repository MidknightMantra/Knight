/**
 * Knight Command Registry
 * Central command registration and handler
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.categories = new Set();
  }

  // Register a new command
  register(command) {
    if (!command.name || !command.execute) {
      Logger.error('Invalid command structure');
      return false;
    }

    this.commands.set(command.name.toLowerCase(), command);
    
    // Register aliases
    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach(alias => {
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
    return this.getAll().filter(cmd => cmd.category === category);
  }

  // List all categories
  getCategories() {
    return Array.from(this.categories);
  }

  // Get command count by category
  getCommandCountByCategory() {
    const counts = {};
    this.categories.forEach(category => {
      counts[category] = this.getByCategory(category).length;
    });
    return counts;
  }

  // Search commands by name or description
  search(query) {
    const normalizedQuery = query.toLowerCase();
    return this.getAll().filter(cmd => 
      cmd.name.toLowerCase().includes(normalizedQuery) ||
      cmd.description.toLowerCase().includes(normalizedQuery) ||
      (cmd.aliases && cmd.aliases.some(alias => alias.toLowerCase().includes(normalizedQuery)))
    );
  }

  // Get help for a specific command
  getHelp(commandName) {
    const command = this.get(commandName);
    if (!command) return null;
    
    const prefix = '!'; // This will come from config later
    
    return `⚔️ *${command.name.charAt(0).toUpperCase() + command.name.slice(1)} Command*

📝 *Description:* ${command.description}
📌 *Usage:* ${prefix}${command.usage}
📋 *Category:* ${command.category}
${command.aliases && command.aliases.length > 0 ? 
  `🔄 *Aliases:* ${command.aliases.map(a => prefix + a).join(', ')}` : ''}
    `.trim();
  }

  // Get help for all commands
  getAllHelp() {
    const prefix = '!'; // This will come from config later
    let helpText = `⚔️ *Knight Bot Commands*\n\n`;
    
    const categories = this.getCategories();
    categories.forEach(category => {
      const commands = this.getByCategory(category);
      if (commands.length > 0) {
        helpText += `*${category.toUpperCase()}*\n`;
        commands.forEach(cmd => {
          helpText += `▫️ ${prefix}${cmd.name} - ${cmd.description}\n`;
        });
        helpText += `\n`;
      }
    });
    
    helpText += `📝 *Tip:* Use ${prefix}help <command> for detailed info`;
    
    return helpText;
  }
}

// Initialize global command registry
const commandRegistry = new CommandRegistry();

// Auto-load commands from commands directory
function loadCommands() {
  const commandsPath = path.join(__dirname);
  const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file !== 'index.js' && file.endsWith('.js'));

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
  loadCommands
};