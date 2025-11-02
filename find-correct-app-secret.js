const crypto = require('crypto');

// Payload REAL recebido do Instagram (do log)
const payload = '{"object":"instagram","entry":[{"time":1762022388574,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762022346848,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzU3NTI4NDQ2NDA1ODQ5NjkyMTc3NjY5OTczNjA2NAZDZD","text":"OI"}}]}]}';

// Signature que o Instagram REALMENTE enviou
const instagramSignature = '8938af1e36b6490b7368222da434e255534915859cd6e43968a51f66c8309f2e';

// App Secret atual do .env
const currentAppSecret = '8dce0a9be202a564061968aa1a58dcfa';

// O que nosso código calculou
const ourCalculation = crypto.createHmac('sha256', currentAppSecret).update(payload).digest('hex');

console.log('='.repeat(80));
console.log('DIAGNÓSTICO FINAL - App Secret');
console.log('='.repeat(80));
console.log('\n📋 Payload recebido:');
console.log(`  Length: ${payload.length} bytes`);
console.log(`  Content: ${payload.substring(0, 100)}...`);

console.log('\n🔐 Signatures:');
console.log(`  Instagram enviou:  ${instagramSignature}`);
console.log(`  Nós calculamos:    ${ourCalculation}`);
console.log(`  Match? ${instagramSignature === ourCalculation ? '✅ SIM' : '❌ NÃO'}`);

console.log('\n🔑 App Secret atual:');
console.log(`  ${currentAppSecret}`);

console.log('\n' + '='.repeat(80));
console.log('CONCLUSÃO:');
console.log('='.repeat(80));

if (instagramSignature === ourCalculation) {
  console.log('✅ O App Secret está CORRETO!');
  console.log('   O problema está em outro lugar.');
} else {
  console.log('❌ O App Secret está INCORRETO!');
  console.log('');
  console.log('AÇÃO NECESSÁRIA:');
  console.log('1. Acesse: https://developers.facebook.com/apps/1771701046817746/settings/basic/');
  console.log('2. Procure por "App Secret" ou "Chave secreta do aplicativo"');
  console.log('3. Clique em "Show" (Mostrar) - pode pedir sua senha');
  console.log('4. Copie o valor EXATO (32 caracteres)');
  console.log('5. Atualize INSTAGRAM_APP_SECRET no arquivo /root/social-selling/backend/.env');
  console.log('6. Reinicie o backend: docker-compose restart backend');
  console.log('');
  console.log('IMPORTANTE: O App Secret que você copiou do Facebook está ERRADO.');
  console.log('            Verifique se você:');
  console.log('            - Está no app correto (ID: 1771701046817746)');
  console.log('            - Copiou "App Secret" e não "App ID"');
  console.log('            - Não pegou o secret de um app de teste/desenvolvimento');
}

console.log('='.repeat(80));
