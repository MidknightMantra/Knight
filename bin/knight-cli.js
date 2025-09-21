#!/usr/bin/env node

/**
 * Knight CLI Interface
 * Terminal-based access to Knight Bot
 */

const readline = require('readline');
const { stdin: input, output } = require('process');
const config = require('../src/config');

// Load commands
const { registry, loadCommands } = require('../src/commands');
loadCommands(); // Load all commands

console.log(`⚔️ ${config.bot.name} CLI Interface`);
console.log(`Version: ${config.bot.version}`);
console.log('Type "help" for available commands or "exit" to quit\n');

const rl = readline.createInterface({ input, output });

// Simulated bot state
let botState = {
  connected: false,
  whatsappConnected: false
};

rl.setPrompt('knight> ');
rl.prompt();

rl.on('line', async (input) => {
  const command = input.trim().toLowerCase();
  
  // Handle built-in CLI commands
  switch(command) {
    case 'help':
      showHelp();
      break;
    case 'status':
      showStatus();
      break;
    case 'config':
      showConfig();
      break;
    case 'connect':
      botState.whatsappConnected = true;
      botState.connected = true;
      console.log('✅ WhatsApp connected successfully!');
      break;
    case 'disconnect':
      botState.whatsappConnected = false;
      console.log('❌ WhatsApp disconnected');
      break;
    case 'exit':
      console.log('Goodbye! ⚔️');
      rl.close();
      return;
    case '':
      break;
    default:
      // Try to execute actual bot commands
      await executeBotCommand(input);
  }
  
  rl.prompt();
}).on('close', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

function showHelp() {
  console.log('Available commands:');
  console.log('  help        - Show this help');
  console.log('  status      - Show bot status');
  console.log('  config      - Show configuration');
  console.log('  connect     - Simulate WhatsApp connection');
  console.log('  disconnect  - Simulate WhatsApp disconnection');
  console.log('  exit        - Exit CLI');
  console.log('\nBot commands (try these too):');
  
  // Show actual bot commands
  const commands = registry.getAll();
  commands.forEach(cmd => {
    console.log(`  ${cmd.name} ${cmd.aliases ? `(${cmd.aliases.join(', ')})` : ''} - ${cmd.description}`);
  });
}

function showStatus() {
  console.log(`\n${config.bot.name} Status:`);
  console.log(`  Bot: ${botState.connected ? '✅ Online' : '❌ Offline'}`);
  console.log(`  WhatsApp: ${botState.whatsappConnected ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`  Platform: ${config.platform.type}`);
  console.log(`  Database: ${config.database.type}`);
}

function showConfig() {
  console.log('\nConfiguration:');
  console.log(`  Name: ${config.bot.name}`);
  console.log(`  Prefix: ${config.bot.prefix}`);
  console.log(`  Owner: ${config.bot.owner.name}`);
  console.log(`  Platform: ${config.platform.type}`);
}

// Simulate bot command execution
async function executeBotCommand(input) {
  const args = input.trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  const command = registry.get(commandName);
  if (command) {
    try {
      // Mock client and message objects for CLI testing
      const mockClient = {
        sendMessage: (to, message) => {
          console.log(message);
          return Promise.resolve();
        }
      };
      
      const mockMessage = {
        from: 'CLI-user',
        body: input,
        key: { fromMe: false }
      };
      
      const response = await command.execute(mockClient, mockMessage, args);
      if (response) {
        console.log(response);
      }
    } catch (error) {
      console.log(`❌ Error executing command: ${error.message}`);
    }
  } else {
    console.log(`Unknown command: ${commandName}`);
    console.log('Type "help" for available commands');
  }
}