/**
 * View-Once Command
 * Send view-once messages to your DM
 */

const Logger = require('../utils/logger');

module.exports = {
  name: 'vv',
  aliases: ['viewonce', 'once'],
  category: 'media',
  description: 'Send view-once messages to your DM',
  usage: '!vv <message> or reply to media with !vv',
  
  async execute(client, message, args) {
    try {
      const userId = message.key.remoteJid;
      
      // Check if message is a reply with media
      if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMessage = message.message.extendedTextMessage.contextInfo.quotedMessage;
        
        // Send the quoted media as view-once
        if (quotedMessage.imageMessage) {
          const mediaBuffer = await client.downloadMediaMessage({
            key: message.key,
            message: { imageMessage: quotedMessage.imageMessage }
          });
          
          await client.sendMessage(userId, {
            image: mediaBuffer,
            viewOnce: true,
            caption: args.join(' ') || 'View-once image'
          });
          
          return '✅ View-once image sent to your DM!';
        } else if (quotedMessage.videoMessage) {
          const mediaBuffer = await client.downloadMediaMessage({
            key: message.key,
            message: { videoMessage: quotedMessage.videoMessage }
          });
          
          await client.sendMessage(userId, {
            video: mediaBuffer,
            viewOnce: true,
            caption: args.join(' ') || 'View-once video'
          });
          
          return '✅ View-once video sent to your DM!';
        } else {
          return '❌ Please reply to an image or video to send as view-once.';
        }
      }
      
      // Check if message itself contains media
      if (message.message?.imageMessage) {
        const mediaBuffer = await client.downloadMediaMessage(message);
        
        await client.sendMessage(userId, {
          image: mediaBuffer,
          viewOnce: true,
          caption: args.join(' ') || 'View-once image'
        });
        
        return '✅ View-once image sent to your DM!';
      } else if (message.message?.videoMessage) {
        const mediaBuffer = await client.downloadMediaMessage(message);
        
        await client.sendMessage(userId, {
          video: mediaBuffer,
          viewOnce: true,
          caption: args.join(' ') || 'View-once video'
        });
        
        return '✅ View-once video sent to your DM!';
      }
      
      // Handle text view-once messages
      if (args.length > 0) {
        const textMessage = args.join(' ');
        
        await client.sendMessage(userId, {
          text: textMessage,
          viewOnce: true
        });
        
        return '✅ View-once text message sent to your DM!';
      }
      
      return `❌ Usage: !vv <message> or reply to media with !vv
      
Examples:
!vv Secret message
!vv Check this out (reply to image/video)
!vv Confidential info (reply to document)`;
    } catch (error) {
      Logger.error(`VV command error: ${error.message}`);
      return `❌ Failed to send view-once message: ${error.message}`;
    }
  }
};