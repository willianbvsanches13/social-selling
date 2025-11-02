const crypto = require('crypto');

// Payload do último webhook
const payload = '{"object":"instagram","entry":[{"time":1762031165141,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762031146380,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzczNzYwNzE3OTkwMDgyNTYzNjIwMjQ5NzQ0MTc5MgZDZD","text":"oi"}}]}]}';

// Signature que o Instagram enviou
const instagramSignature = '4d9f9a4cb4256267b89fe0a048dfe2d9344a7286981278e750e9be5699dab1e5';

// NOVO Instagram App Secret
const instagramAppSecret = 'dc074b4cd5c4679002750832c2065bc8';

// Calcular
const calculated = crypto.createHmac('sha256', instagramAppSecret).update(payload).digest('hex');

console.log('='.repeat(80));
console.log('TESTE COM INSTAGRAM APP SECRET');
console.log('='.repeat(80));
console.log(`\nInstagram App ID: 1524822958652015`);
console.log(`Instagram App Secret: ${instagramAppSecret}`);
console.log(`\nPayload (${payload.length} bytes):`);
console.log(payload.substring(0, 100) + '...');
console.log(`\nInstagram enviou: ${instagramSignature}`);
console.log(`Nós calculamos:   ${calculated}`);
console.log(`\nMatch: ${calculated === instagramSignature ? '✅ SIM! ESTE É O CORRETO!' : '❌ NÃO'}`);

if (calculated === instagramSignature) {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 SUCESSO! O Instagram App Secret está CORRETO!');
  console.log('='.repeat(80));
  console.log('\nPróximos passos:');
  console.log('1. Reiniciar o backend');
  console.log('2. Enviar uma mensagem no Instagram');
  console.log('3. Ver os webhooks sendo processados com sucesso!');
  console.log('='.repeat(80));
} else {
  console.log('\n❌ Ainda não é este... vamos investigar mais');
}
