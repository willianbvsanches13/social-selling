const crypto = require('crypto');

// App Secret do .env
const appSecret = '8dce0a9be202a564061968aa1a58dcfa';

// Payload EXATO do último log (raw body com 393 bytes)
const payload = '{"object":"instagram","entry":[{"time":1762021299932,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762020315339,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzUzNzgwOTczNzAyNzc4NDE5MDU4NzUxMTUwNDg5NgZDZD","text":"Oi"}}]}]}';

// Signatures EXATAS que o Instagram enviou
const receivedSha256 = '636bb435ef0ed4b731acefdaec1b27e53aa108b5de4bf4ef6c0cf72913e2a288';
const receivedSha1 = 'fffd11b8219cc2d0d5f1aef8846c62ea0477f11c';

// O que o backend calculou
const backendCalculatedSha256 = '1264dba596799d7f5fde6e3016adfd586315586c29783c4a99a5a3c6344e6971';

// Calcular com o App Secret atual
const calculatedSha256 = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
const calculatedSha1 = crypto.createHmac('sha1', appSecret).update(payload).digest('hex');

console.log('='.repeat(80));
console.log('TESTE COM WEBHOOK REAL DO LOG');
console.log('='.repeat(80));
console.log(`\nApp Secret: ${appSecret}`);
console.log(`Payload length: ${payload.length} bytes`);
console.log(`Payload: ${payload}\n`);

console.log('SHA-256:');
console.log(`  Instagram enviou:    ${receivedSha256}`);
console.log(`  Backend calculou:    ${backendCalculatedSha256}`);
console.log(`  Meu cálculo agora:   ${calculatedSha256}`);
console.log(`  Meu cálculo == Backend? ${calculatedSha256 === backendCalculatedSha256 ? '✅ SIM' : '❌ NÃO'}`);
console.log(`  Meu cálculo == Instagram? ${calculatedSha256 === receivedSha256 ? '✅ SIM (App Secret CORRETO!)' : '❌ NÃO (App Secret ERRADO!)'}`);

console.log('\nSHA-1:');
console.log(`  Instagram enviou:    ${receivedSha1}`);
console.log(`  Meu cálculo agora:   ${calculatedSha1}`);
console.log(`  Match? ${calculatedSha1 === receivedSha1 ? '✅ SIM (App Secret CORRETO!)' : '❌ NÃO (App Secret ERRADO!)'}`);

console.log('\n' + '='.repeat(80));
console.log('DIAGNÓSTICO:');
if (calculatedSha256 === receivedSha256) {
  console.log('✅ App Secret está CORRETO!');
  console.log('   O problema pode estar em:');
  console.log('   - Payload sendo modificado antes de chegar no verifySignature()');
  console.log('   - Codificação de caracteres (UTF-8 vs outro)');
  console.log('   - Buffer vs String');
} else {
  console.log('❌ App Secret está INCORRETO ou payload foi modificado!');
  console.log(`   - Você está usando: ${appSecret}`);
  console.log('   - Verifique no Facebook Developers se esse é o App Secret correto');
}
console.log('='.repeat(80));
