const crypto = require('crypto');

// App Secret do .env
const appSecret = '8dce0a9be202a564061968aa1a58dcfa';

// Payload do último webhook
const payload = '{"entry": [{"id": "17841400538867190", "time": 1762021299932, "messaging": [{"sender": {"id": "1129842642640637"}, "message": {"mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzUzNzgwOTczNzAyNzc4NDE5MDU4NzUxMTUwNDg5NgZDZD", "text": "Oi"}, "recipient": {"id": "17841400538867190"}, "timestamp": 1762020315339}]}], "object": "instagram"}';

// Signatures recebidas do Instagram
const receivedSha256 = '636bb435ef0ed4b731acefdaec1b27e53aa108b5de4bf4ef6c0cf72913e2a288';
const receivedSha1 = 'fffd11b8219cc2d0d5f1aef8846c62ea0477f11c';

// Calcular SHA256
const expectedSha256 = crypto
  .createHmac('sha256', appSecret)
  .update(payload)
  .digest('hex');

// Calcular SHA1
const expectedSha1 = crypto
  .createHmac('sha1', appSecret)
  .update(payload)
  .digest('hex');

console.log('='.repeat(80));
console.log('TESTE DE VALIDAÇÃO DE SIGNATURE DO WEBHOOK');
console.log('='.repeat(80));
console.log('\n📋 Dados:');
console.log(`  App Secret: ${appSecret}`);
console.log(`  Payload length: ${payload.length} bytes`);
console.log(`  Payload preview: ${payload.substring(0, 100)}...`);

console.log('\n🔐 SHA-256:');
console.log(`  Received:  ${receivedSha256}`);
console.log(`  Expected:  ${expectedSha256}`);
console.log(`  Match:     ${receivedSha256 === expectedSha256 ? '✅ YES' : '❌ NO'}`);

console.log('\n🔐 SHA-1:');
console.log(`  Received:  ${receivedSha1}`);
console.log(`  Expected:  ${expectedSha1}`);
console.log(`  Match:     ${receivedSha1 === expectedSha1 ? '✅ YES' : '❌ NO'}`);

console.log('\n' + '='.repeat(80));
