const crypto = require('crypto');

// Your exact webhook data
const body = {
  "entry": [
    {
      "id": "17841400538867190",
      "time": 1762010783728,
      "messaging": [
        {
          "sender": {
            "id": "17841400538867190"
          },
          "message": {
            "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzM2MTczNzg4MTI5NDExMzU3NjQ4OTczNTY4NDA5NgZDZD",
            "text": "Olá, testando amor 🥰",
            "is_echo": true
          },
          "recipient": {
            "id": "1129842642640637"
          },
          "timestamp": 1762010770464
        }
      ]
    }
  ],
  "object": "instagram"
};

// The signatures from Meta
const receivedSignatureSha1 = "eb165430f2d912e9ab79cd4372193cf7904d7f18";
const receivedSignatureSha256 = "766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8";

// You need to provide your app secret
const appSecret = process.env.INSTAGRAM_APP_SECRET || '';

if (!appSecret) {
  console.error('❌ INSTAGRAM_APP_SECRET environment variable not set');
  console.error('Please run: INSTAGRAM_APP_SECRET=your_secret node test-signature.js');
  process.exit(1);
}

console.log('Testing webhook signature validation...\n');
console.log('App Secret:', appSecret.substring(0, 10) + '...');
console.log('Received SHA-1:', receivedSignatureSha1);
console.log('Received SHA-256:', receivedSignatureSha256);
console.log('');

// Test with different JSON serialization approaches
const tests = [
  {
    name: 'JSON.stringify (no spacing)',
    payload: JSON.stringify(body)
  },
  {
    name: 'JSON.stringify (with spacing)',
    payload: JSON.stringify(body, null, 2)
  },
  {
    name: 'JSON.stringify (with 4 spaces)',
    payload: JSON.stringify(body, null, 4)
  },
  {
    name: 'Exact payload (content-length 442)',
    // This will need to be manually constructed to match the exact 442 bytes
    payload: JSON.stringify(body)
  }
];

console.log('═══════════════════════════════════════════════════════════════\n');

for (const test of tests) {
  console.log(`Test: ${test.name}`);
  console.log(`Payload length: ${test.payload.length} bytes`);
  console.log(`Payload preview: ${test.payload.substring(0, 100)}...`);
  console.log('');

  // Calculate SHA-1
  const sha1Hash = crypto
    .createHmac('sha1', appSecret)
    .update(test.payload)
    .digest('hex');

  const sha1Match = sha1Hash === receivedSignatureSha1;
  console.log(`  SHA-1 Calculated: ${sha1Hash}`);
  console.log(`  SHA-1 Expected:   ${receivedSignatureSha1}`);
  console.log(`  SHA-1 Match:      ${sha1Match ? '✅ YES' : '❌ NO'}`);
  console.log('');

  // Calculate SHA-256
  const sha256Hash = crypto
    .createHmac('sha256', appSecret)
    .update(test.payload)
    .digest('hex');

  const sha256Match = sha256Hash === receivedSignatureSha256;
  console.log(`  SHA-256 Calculated: ${sha256Hash}`);
  console.log(`  SHA-256 Expected:   ${receivedSignatureSha256}`);
  console.log(`  SHA-256 Match:      ${sha256Match ? '✅ YES' : '❌ NO'}`);
  console.log('');

  if (sha1Match || sha256Match) {
    console.log(`🎉 FOUND MATCHING SIGNATURE with "${test.name}"!`);
  }

  console.log('─────────────────────────────────────────────────────────────────\n');
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('The content-length header shows 442 bytes.');
console.log('Standard JSON.stringify produces:', JSON.stringify(body).length, 'bytes');
console.log('');
console.log('If none of the tests match, the issue might be:');
console.log('1. Wrong App Secret being used');
console.log('2. Nginx/proxy is modifying the request body');
console.log('3. The raw body is not being captured correctly');
console.log('4. Character encoding issues (UTF-8 vs others)');
console.log('');
console.log('To debug further:');
console.log('- Check the INSTAGRAM_APP_SECRET in your .env file');
console.log('- Verify it matches the App Secret in Meta App Dashboard');
console.log('- Check if nginx is adding/removing whitespace');
console.log('- Enable debug logging to see the exact raw body received');
