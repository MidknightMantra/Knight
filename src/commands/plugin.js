/**
 * Plugin Command
 * Plugin management and extension system
 */

const pluginManager = require('../services/pluginManager');
const Logger = require('../utils/logger');

module.exports = {
  name: 'plugin',
  aliases: ['plugins', 'extension'],
  category: 'admin',
  description: 'Plugin management and extension system',
  usage: '!plugin <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'list';
    
    switch (subcommand) {
      case 'help':
        return `🔌 *Knight Plugin System*
        
Available subcommands:
▫️ help - Show this help
▫️ list - List all plugins
▫️ info <plugin> - Show plugin information
▫️ enable <plugin> - Enable a plugin
▫️ disable <plugin> - Disable a plugin
▫️ load <plugin> - Load a plugin
▫️ unload <plugin> - Unload a plugin
▫️ install <path> <name> - Install plugin from directory
▫️ uninstall <plugin> - Uninstall a plugin
▫️ reload <plugin> - Reload a plugin
▫️ stats - Show plugin statistics

Examples:
!plugin list
!plugin info myplugin
!plugin enable myplugin
!plugin disable myplugin
!plugin stats`;

      case 'list':
        try {
          const plugins = pluginManager.getAllPlugins();
          
          if (plugins.length === 0) {
            return '🔌 No plugins installed.';
          }
          
          let response = `🔌 *Installed Plugins* (${plugins.length})\n\n`;
          
          plugins.forEach((plugin, index) => {
            const status = plugin.enabled ? '✅' : '❌';
            const version = plugin.version ? `v${plugin.version}` : '';
            response += `${index + 1}. ${status} ${plugin.name} ${version}
📝 ${plugin.description || 'No description'}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Plugin list error: ${error.message}`);
          return `❌ Failed to list plugins: ${error.message}`;
        }

      case 'info':
        if (args.length < 2) {
          return '❌ Usage: !plugin info <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const pluginInfo = await pluginManager.getPluginInfo(pluginName);
          
          if (!pluginInfo) {
            return `❌ Plugin ${pluginName} not found.`;
          }
          
          return `🔌 *Plugin Information: ${pluginInfo.name}*
          
📝 Name: ${pluginInfo.name}
🔢 Version: ${pluginInfo.version}
👤 Author: ${pluginInfo.author || 'Unknown'}
📊 Status: ${pluginInfo.enabled ? 'Enabled' : 'Disabled'}
📅 Loaded: ${pluginInfo.loadedAt ? pluginInfo.loadedAt.toLocaleString() : 'Never'}
📋 Description: ${pluginInfo.description || 'No description'}
${pluginInfo.commands.length > 0 ? `🔧 Commands: ${pluginInfo.commands.join(', ')}` : ''}`;
        } catch (error) {
          Logger.error(`Plugin info error: ${error.message}`);
          return `❌ Failed to get plugin info: ${error.message}`;
        }

      case 'enable':
        if (args.length < 2) {
          return '❌ Usage: !plugin enable <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const success = await pluginManager.enablePlugin(pluginName);
          
          return success ? 
            `✅ Plugin ${pluginName} enabled successfully` : 
            `❌ Failed to enable plugin ${pluginName}`;
        } catch (error) {
          Logger.error(`Plugin enable error: ${error.message}`);
          return `❌ Failed to enable plugin: ${error.message}`;
        }

      case 'disable':
        if (args.length < 2) {
          return '❌ Usage: !plugin disable <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const success = await pluginManager.disablePlugin(pluginName);
          
          return success ? 
            `✅ Plugin ${pluginName} disabled successfully` : 
            `❌ Failed to disable plugin ${pluginName}`;
        } catch (error) {
          Logger.error(`Plugin disable error: ${error.message}`);
          return `❌ Failed to disable plugin: ${error.message}`;
        }

      case 'load':
        if (args.length < 2) {
          return '❌ Usage: !plugin load <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const pluginPath = pluginManager.pluginDir + '/' + pluginName;
          
          const plugin = await pluginManager.loadPlugin(pluginName, pluginPath);
          
          return `✅ Plugin ${plugin.name} loaded successfully`;
        } catch (error) {
          Logger.error(`Plugin load error: ${error.message}`);
          return `❌ Failed to load plugin: ${error.message}`;
        }

      case 'unload':
        if (args.length < 2) {
          return '❌ Usage: !plugin unload <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const success = await pluginManager.unloadPlugin(pluginName);
          
          return success ? 
            `✅ Plugin ${pluginName} unloaded successfully` : 
            `❌ Failed to unload plugin ${pluginName}`;
        } catch (error) {
          Logger.error(`Plugin unload error: ${error.message}`);
          return `❌ Failed to unload plugin: ${error.message}`;
        }

      case 'install':
        if (args.length < 3) {
          return '❌ Usage: !plugin install <source_path> <plugin_name>';
        }
        
        try {
          const sourcePath = args[1];
          const pluginName = args[2];
          
          const plugin = await pluginManager.installPluginFromDirectory(sourcePath, pluginName);
          
          return `✅ Plugin ${plugin.name} installed successfully`;
        } catch (error) {
          Logger.error(`Plugin install error: ${error.message}`);
          return `❌ Failed to install plugin: ${error.message}`;
        }

      case 'uninstall':
        if (args.length < 2) {
          return '❌ Usage: !plugin uninstall <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          const success = await pluginManager.uninstallPlugin(pluginName);
          
          return success ? 
            `✅ Plugin ${pluginName} uninstalled successfully` : 
            `❌ Failed to uninstall plugin ${pluginName}`;
        } catch (error) {
          Logger.error(`Plugin uninstall error: ${error.message}`);
          return `❌ Failed to uninstall plugin: ${error.message}`;
        }

      case 'reload':
        if (args.length < 2) {
          return '❌ Usage: !plugin reload <plugin_name>';
        }
        
        try {
          const pluginName = args[1];
          
          // Unload plugin
          await pluginManager.unloadPlugin(pluginName);
          
          // Load plugin
          const pluginPath = pluginManager.pluginDir + '/' + pluginName;
          const plugin = await pluginManager.loadPlugin(pluginName, pluginPath);
          
          // Enable if it was enabled before
          if (plugin.enabled) {
            await pluginManager.enablePlugin(pluginName);
          }
          
          return `✅ Plugin ${plugin.name} reloaded successfully`;
        } catch (error) {
          Logger.error(`Plugin reload error: ${error.message}`);
          return `❌ Failed to reload plugin: ${error.message}`;
        }

      case 'stats':
        try {
          const stats = await pluginManager.getPluginStats();
          
          return `🔌 *Plugin Statistics*
          
📊 Total Plugins: ${stats.total}
✅ Enabled: ${stats.enabled}
❌ Disabled: ${stats.disabled}

${stats.plugins.map(p => 
  `${p.enabled ? '✅' : '❌'} ${p.name} v${p.version} (${p.loadedAt ? 'Loaded' : 'Not loaded'})`
).join('\n')}`;
        } catch (error) {
          Logger.error(`Plugin stats error: ${error.message}`);
          return `❌ Failed to get plugin statistics: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !plugin help for available commands`;
    }
  }
};