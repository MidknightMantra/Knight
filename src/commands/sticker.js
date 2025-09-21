/**
 * Sticker Command
 * Creates stickers from images/videos with enhanced features
 */

const mediaHandler = require('../handlers/mediaHandler');
const fs = require('fs');
const Logger = require('../utils/logger');

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stik', 'stickerify'],
  category: 'media',
  description: 'Create stickers from images/videos with text overlay',
  usage: '!sticker [with media reply] or !sticker <text>',
  
  async execute(client, message, args) {
    try {
      // Handle text-only sticker creation
      if (args.length > 0) {
        const text = args.join(' ');
        return `🎨 *Text Sticker Creation*
        
Text: "${text}"
Note: Text-only sticker creation requires additional setup.

For now, you can:
1. Reply to an image/video with !sticker
2. Send an image/video with caption !sticker`;
      }
      
      // Handle replied media message
      if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMessage = message.message.extendedTextMessage.contextInfo.quotedMessage;
        
        // Create a mock message object for media download
        const mockMessage = {
          key: message.key,
          message: quotedMessage,
          pushName: message.pushName
        };
        
        const media = await mediaHandler.downloadMedia(client, mockMessage);
        if (media) {
          await client.sendMessage(message.key.remoteJid, { 
            text: '🔄 Creating sticker...' 
          });
          
          let stickerResult;
          
          // Create sticker based on media type
          if (media.type === 'imageMessage') {
            stickerResult = await mediaHandler.createStickerFromImage(media.filepath);
          } else if (media.type === 'videoMessage') {
            stickerResult = await mediaHandler.createStickerFromVideo(media.filepath);
          } else {
            return '❌ Unsupported media type. Please use images or videos.';
          }
          
          // Send the sticker
          const stickerBuffer = fs.readFileSync(stickerResult.filepath);
          await client.sendMessage(message.key.remoteJid, {
            sticker: stickerBuffer,
            fileName: stickerResult.filename
          });
          
          return `✅ *Sticker Created Successfully!*
📁 Filename: ${stickerResult.filename}
📏 Size: ${(stickerResult.size / 1024).toFixed(2)} KB
🕒 Type: ${media.type.replace('Message', '')}`;
        }
      }
      
      // Handle direct media message
      if (message.message?.imageMessage || message.message?.videoMessage) {
        await client.sendMessage(message.key.remoteJid, { 
          text: '🔄 Creating sticker...' 
        });
        
        const media = await mediaHandler.downloadMedia(client, message);
        if (media) {
          let stickerResult;
          
          // Create sticker based on media type
          if (media.type === 'imageMessage') {
            stickerResult = await mediaHandler.createStickerFromImage(media.filepath);
          } else if (media.type === 'videoMessage') {
            stickerResult = await mediaHandler.createStickerFromVideo(media.filepath);
          } else {
            return '❌ Unsupported media type. Please use images or videos.';
          }
          
          // Send the sticker
          const stickerBuffer = fs.readFileSync(stickerResult.filepath);
          await client.sendMessage(message.key.remoteJid, {
            sticker: stickerBuffer,
            fileName: stickerResult.filename
          });
          
          return `✅ *Sticker Created Successfully!*
📁 Filename: ${stickerResult.filename}
📏 Size: ${(stickerResult.size / 1024).toFixed(2)} KB
🕒 Type: ${media.type.replace('Message', '')}`;
        }
      }
      
      return `🎨 *Sticker Creation Help*
      
Usage:
1. Reply to an image/video with !sticker
2. Send an image/video with caption !sticker
3. !sticker <text> (text-only stickers - coming soon)

Supported formats: JPG, PNG, MP4, GIF
Max duration: 10 seconds for video stickers`;
    } catch (error) {
      Logger.error(`Sticker command error: ${error.message}`);
      return `❌ Failed to create sticker: ${error.message}`;
    }
  }
};