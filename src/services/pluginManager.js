/**
 * Knight Plugin Manager
 * Plugin system for extending Knight functionality
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const database = require('../database');

class PluginManager {
  constructor() {
    this.plugins = new Map(); // Store loaded plugins
    this.pluginDir = path.join(__dirname, '..', '..', 'plugins');
    this.ensurePluginDirectory();
  }

  ensurePluginDirectory() {
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }
  }

  async loadPlugins() {
    try {
      Logger.info('Loading plugins...');
      
      // Check if plugins directory exists
      if (!fs.existsSync(this.pluginDir)) {
        Logger.info('No plugins directory found');
        return;
      }
      
      // Read plugin directories
      const pluginDirs = fs.readdirSync(this.pluginDir);
      
      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(this.pluginDir, pluginDir);
        
        // Check if it's a directory
        if (!fs.statSync(pluginPath).isDirectory()) {
          continue;
        }
        
        try {
          await this.loadPlugin(pluginDir, pluginPath);
        } catch (error) {
          Logger.error(`Failed to load plugin ${pluginDir}: ${error.message}`);
        }
      }
      
      Logger.success(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      Logger.error(`Failed to load plugins: ${error.message}`);
    }
  }

  async loadPlugin(pluginName, pluginPath) {
    try {
      // Check for package.json or plugin.json
      const pluginConfigPath = path.join(pluginPath, 'plugin.json');
      const packagePath = path.join(pluginPath, 'package.json');
      
      let pluginConfig = {};
      
      // Load plugin configuration
      if (fs.existsSync(pluginConfigPath)) {
        pluginConfig = JSON.parse(fs.readFileSync(pluginConfigPath, 'utf8'));
      } else if (fs.existsSync(packagePath)) {
        pluginConfig = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      }
      
      // Set default values
      pluginConfig.name = pluginConfig.name || pluginName;
      pluginConfig.version = pluginConfig.version || '1.0.0';
      pluginConfig.main = pluginConfig.main || 'index.js';
      
      // Load plugin module
      const mainPath = path.join(pluginPath, pluginConfig.main);
      if (!fs.existsSync(mainPath)) {
        throw new Error(`Plugin main file not found: ${mainPath}`);
      }
      
      // Import plugin
      const pluginModule = require(mainPath);
      
      // Validate plugin structure
      if (typeof pluginModule !== 'object') {
        throw new Error('Plugin must export an object');
      }
      
      // Create plugin instance
      const plugin = {
        name: pluginConfig.name,
        version: pluginConfig.version,
        description: pluginConfig.description || '',
        author: pluginConfig.author || '',
        main: pluginModule,
        config: pluginConfig,
        path: pluginPath,
        enabled: await this.isPluginEnabled(pluginName),
        loadedAt: new Date()
      };
      
      // Initialize plugin if it has an init method
      if (typeof plugin.main.init === 'function') {
        await plugin.main.init(plugin);
      }
      
      // Store plugin
      this.plugins.set(pluginName, plugin);
      
      Logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      
      return plugin;
    } catch (error) {
      Logger.error(`Failed to load plugin ${pluginName}: ${error.message}`);
      throw error;
    }
  }

  async unloadPlugin(pluginName) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} not found`);
      }
      
      // Call unload method if it exists
      if (typeof plugin.main.unload === 'function') {
        await plugin.main.unload(plugin);
      }
      
      // Remove plugin
      this.plugins.delete(pluginName);
      
      Logger.info(`Unloaded plugin: ${pluginName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to unload plugin ${pluginName}: ${error.message}`);
      return false;
    }
  }

  async enablePlugin(pluginName) {
    try {
      await database.setSetting(`plugin_${pluginName}_enabled`, 'true');
      
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        plugin.enabled = true;
        
        // Call enable method if it exists
        if (typeof plugin.main.enable === 'function') {
          await plugin.main.enable(plugin);
        }
      }
      
      Logger.info(`Enabled plugin: ${pluginName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to enable plugin ${pluginName}: ${error.message}`);
      return false;
    }
  }

  async disablePlugin(pluginName) {
    try {
      await database.setSetting(`plugin_${pluginName}_enabled`, 'false');
      
      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        plugin.enabled = false;
        
        // Call disable method if it exists
        if (typeof plugin.main.disable === 'function') {
          await plugin.main.disable(plugin);
        }
      }
      
      Logger.info(`Disabled plugin: ${pluginName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to disable plugin ${pluginName}: ${error.message}`);
      return false;
    }
  }

  async isPluginEnabled(pluginName) {
    try {
      const setting = await database.getSetting(`plugin_${pluginName}_enabled`);
      return setting !== 'false'; // Default to enabled
    } catch (error) {
      return true; // Default to enabled on error
    }
  }

  getPlugin(pluginName) {
    return this.plugins.get(pluginName);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
  }

  async getPluginInfo(pluginName) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        return null;
      }
      
      return {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        enabled: plugin.enabled,
        loadedAt: plugin.loadedAt,
        commands: plugin.main.commands ? Object.keys(plugin.main.commands) : []
      };
    } catch (error) {
      Logger.error(`Failed to get plugin info for ${pluginName}: ${error.message}`);
      return null;
    }
  }

  async installPluginFromDirectory(sourcePath, pluginName) {
    try {
      const targetPath = path.join(this.pluginDir, pluginName);
      
      // Copy plugin directory
      this.copyDirectory(sourcePath, targetPath);
      
      // Load the newly installed plugin
      const plugin = await this.loadPlugin(pluginName, targetPath);
      
      Logger.success(`Installed plugin: ${pluginName}`);
      return plugin;
    } catch (error) {
      Logger.error(`Failed to install plugin from ${sourcePath}: ${error.message}`);
      throw error;
    }
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async uninstallPlugin(pluginName) {
    try {
      // Unload plugin first
      await this.unloadPlugin(pluginName);
      
      // Remove plugin directory
      const pluginPath = path.join(this.pluginDir, pluginName);
      if (fs.existsSync(pluginPath)) {
        fs.rmSync(pluginPath, { recursive: true, force: true });
      }
      
      // Remove plugin settings
      await database.setSetting(`plugin_${pluginName}_enabled`, null);
      
      Logger.success(`Uninstalled plugin: ${pluginName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to uninstall plugin ${pluginName}: ${error.message}`);
      return false;
    }
  }

  // Register plugin commands with the command system
  registerPluginCommands(commandRegistry) {
    try {
      for (const [pluginName, plugin] of this.plugins) {
        if (plugin.enabled && plugin.main.commands) {
          for (const [commandName, command] of Object.entries(plugin.main.commands)) {
            commandRegistry.register({
              name: commandName,
              ...command,
              plugin: pluginName
            });
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to register plugin commands: ${error.message}`);
    }
  }

  // Handle plugin events
  async handlePluginEvent(eventName, data) {
    try {
      for (const [pluginName, plugin] of this.plugins) {
        if (plugin.enabled && typeof plugin.main[eventName] === 'function') {
          try {
            await plugin.main[eventName](data, plugin);
          } catch (error) {
            Logger.error(`Plugin ${pluginName} failed to handle event ${eventName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to handle plugin event ${eventName}: ${error.message}`);
    }
  }

  async getPluginStats() {
    try {
      const plugins = this.getAllPlugins();
      const enabledPlugins = plugins.filter(p => p.enabled);
      
      return {
        total: plugins.length,
        enabled: enabledPlugins.length,
        disabled: plugins.length - enabledPlugins.length,
        plugins: plugins.map(p => ({
          name: p.name,
          version: p.version,
          enabled: p.enabled,
          loadedAt: p.loadedAt
        }))
      };
    } catch (error) {
      Logger.error(`Failed to get plugin stats: ${error.message}`);
      return { total: 0, enabled: 0, disabled: 0, plugins: [] };
    }
  }
}

module.exports = new PluginManager();