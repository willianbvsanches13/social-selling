#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Instagram Webhook App Secret Verifier');
console.log('=========================================\n');

// Read App Secret from .env file
const envPath = path.join(__dirname, 'backend', '.env');
let appSecret = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/INSTAGRAM_APP_SECRET=(.+)/);
  if (match) {
    appSecret = match[1].trim();
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}

if (!appSecret) {
  console.error('❌ INSTAGRAM_APP_SECRET not found in .env file');
  process.exit(1);
}

console.log(`App Secret from .env: ${appSecret.substring(0, 10)}...`);
console.log('');

// Real webhook bodies from your database
const testCases = [
  {
    name: 'Real Instagram Webhook #1 (read event)',
    body: '{"entry": [{"id": "17841403506636395", "time": 1762011238035, "messaging": [{"read": {"mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAzNTA2NjM2Mzk1OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzM2MTczNzg4MTI5NDExMzU3NjQ4OTczNTY4NDA5NgZDZD"}, "sender": {"id": "1092310252982105"}, "recipient": {"id": "17841403506636395"}, "timestamp": 1762010759340}]}], "object": "instagram"}',
    expectedSignature: 'cdb098266cc3c0515884787c40f12ade791fbe27757f99b6695715c9a5e993de'
  },
  {
    name: 'Real Instagram Webhook #2',
    body: '{"entry": [{"id": "17841403506636395", "time": 1762011256697, "messaging": [{"read": {"mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAzNTA2NjM2Mzk1OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzM2MTczNzg4MTI5NDExMzU3NjQ4OTczNTY4NDA5NgZDZD"}, "sender": {"id": "1092310252982105"}, "recipient": {"id": "17841403506636395"}, "timestamp": 1762010759340}]}], "object": "instagram"}',
    expectedSignature: 'c283e88fe5b9ffb5c160fc83815bc8af15a091f3dffbd4cd78e9372dae6c76f1'
  }
];

let allPassed = true;

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  console.log(`Body length: ${testCase.body.length} bytes`);

  const calculated = crypto
    .createHmac('sha256', appSecret)
    .update(testCase.body)
    .digest('hex');

  const matches = calculated === testCase.expectedSignature;

  console.log(`Expected:   ${testCase.expectedSignature}`);
  console.log(`Calculated: ${calculated}`);

  if (matches) {
    console.log('✅ MATCH!\n');
  } else {
    console.log('❌ MISMATCH!\n');
    allPassed = false;
  }
}

console.log('=========================================');
if (allPassed) {
  console.log('🎉 SUCCESS! All signatures match!');
  console.log('');
  console.log('The INSTAGRAM_APP_SECRET is correct!');
  console.log('Your webhooks should work now.');
  console.log('');
  console.log('Next step: Restart backend');
  console.log('  docker-compose restart backend');
} else {
  console.log('❌ FAILED! Signatures do not match!');
  console.log('');
  console.log('The INSTAGRAM_APP_SECRET is still incorrect.');
  console.log('');
  console.log('Steps to fix:');
  console.log('1. Go to: https://developers.facebook.com/apps/');
  console.log('2. Select your Instagram app');
  console.log('3. Go to: Settings → Basic');
  console.log('4. Click "Show" next to "App Secret"');
  console.log('5. Copy the ENTIRE secret (not the App ID)');
  console.log('6. Update backend/.env file:');
  console.log('   INSTAGRAM_APP_SECRET=paste_the_correct_secret_here');
  console.log('7. Run this script again to verify');
}
