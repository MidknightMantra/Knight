/**
 * YouTube Download Command
 * Download YouTube videos/audio with real functionality and proper filenames
 */

const youtubeService = require('../services/youtubeService');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

module.exports = {
  name: 'youtube',
  aliases: ['yt', 'ytdl'],
  category: 'media',
  description: 'Download YouTube videos/audio with proper filenames',
  usage: '!youtube <video_url> [audio/video/quality]',
  
  async execute(client, message, args) {
    if (args.length === 0) {
      return `🎵 *YouTube Downloader*
      
Usage: !youtube <video_url> [option]

Options:
▫️ audio - Download audio only (MP3 with fallback to original format)
▫️ video - Download video (default quality)
▫️ 360p, 480p, 720p, 1080p - Specific video quality

Examples:
!youtube https://youtube.com/watch?v=xyz123
!youtube https://youtube.com/watch?v=xyz123 audio
!youtube https://youtube.com/watch?v=xyz123 720p

⚠️ Note: Large files may take time to process.`;
    }
    
    const url = args[0];
    const option = args[1] || 'video';
    
    // Validate YouTube URL
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return '❌ Please provide a valid YouTube URL.';
    }
    
    try {
      // Send processing message
      await client.sendMessage(message.key.remoteJid, { 
        text: '🔄 Fetching video information...' 
      });
      
      // Get video info
      const videoInfo = await youtubeService.getVideoInfo(url);
      
      // Check video duration (limit to 10 minutes for now to prevent huge files)
      if (videoInfo.duration > 600) { // 10 minutes
        return '❌ Video is too long (over 10 minutes). Please choose a shorter video.';
      }
      
      // Send video info
      await client.sendMessage(message.key.remoteJid, { 
        text: `🎵 *Video Found*
📺 Title: ${videoInfo.title}
👤 Channel: ${videoInfo.uploader}
⏱️ Duration: ${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}
👁️ Views: ${videoInfo.views?.toLocaleString() || 'Unknown'}

🔄 Downloading ${option.toUpperCase()}...` 
      });
      
      let downloadResult;
      
      // Process based on option
      if (option === 'audio') {
        // Try with ffmpeg conversion first, fallback to original format if it fails
        try {
          downloadResult = await youtubeService.downloadAudio(url, true);
        } catch (error) {
          // If conversion fails, try without conversion
          Logger.warn('FFmpeg conversion failed, trying original format...');
          await client.sendMessage(message.key.remoteJid, { 
            text: '⚠️ FFmpeg conversion failed, downloading original audio format...' 
          });
          downloadResult = await youtubeService.downloadAudio(url, false);
        }
      } else if (['360p', '480p', '720p', '1080p'].includes(option)) {
        // For quality options, we'd need more complex format selection
        downloadResult = await youtubeService.downloadVideo(url, { 
          format: `best[height<=${option.replace('p', '')}]` 
        });
      } else {
        downloadResult = await youtubeService.downloadVideo(url);
      }
      
      // Check file size
      if (!youtubeService.isWithinSizeLimit(downloadResult.size)) {
        const fileSize = youtubeService.formatBytes(downloadResult.size);
        return `❌ File is too large (${fileSize}). WhatsApp has a 100MB limit. Try a shorter video or lower quality.`;
      }
      
      // Send file to user
      await client.sendMessage(message.key.remoteJid, { 
        text: `✅ Download complete! Sending file...` 
      });
      
      // Send the actual file
      const fileBuffer = fs.readFileSync(downloadResult.filepath);
      const fileInfo = youtubeService.getFileTypeInfo(downloadResult.filename);
      
      if (option === 'audio') {
        await client.sendMessage(message.key.remoteJid, {
          audio: fileBuffer,
          fileName: downloadResult.filename,
          mimetype: fileInfo.mimeType,
          caption: `🎵 ${downloadResult.title}\n👤 ${downloadResult.uploader}\n📥 Downloaded via Knight Bot`
        });
      } else {
        await client.sendMessage(message.key.remoteJid, {
          video: fileBuffer,
          fileName: downloadResult.filename,
          caption: `🎵 ${downloadResult.title}\n👤 ${downloadResult.uploader}\n📥 Downloaded via Knight Bot`
        });
      }
      
      // Format response for confirmation
      const fileSize = youtubeService.formatBytes(downloadResult.size);
      
      return `✅ *Download Sent Successfully!*
      
🎵 Title: ${downloadResult.title}
📁 Filename: ${downloadResult.filename}
📏 Size: ${fileSize}
🕒 Type: ${option.toUpperCase()}
🔤 Format: ${fileInfo.extension}`;
      
    } catch (error) {
      Logger.error(`YouTube command error: ${error.message}`);
      return `❌ Failed to process YouTube download: ${error.message}`;
    }
  }
};