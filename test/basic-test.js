// Simple test to verify dependencies
try {
  require('dotenv');
  require('express');
  require('@whiskeysockets/baileys');
  console.log('✅ All basic dependencies loaded successfully!');
} catch (error) {
  console.error('❌ Dependency error:', error.message);
}