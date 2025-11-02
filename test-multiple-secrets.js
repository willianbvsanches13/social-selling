const crypto = require('crypto');

// Payload REAL do Instagram
const payload = '{"object":"instagram","entry":[{"time":1762022388574,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762022346848,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzU3NTI4NDQ2NDA1ODQ5NjkyMTc3NjY5OTczNjA2NAZDZD","text":"OI"}}]}]}';

// Signature que o Instagram REALMENTE enviou
const instagramSignature = '8938af1e36b6490b7368222da434e255534915859cd6e43968a51f66c8309f2e';

// ADICIONE AQUI todos os App Secrets que você tem acesso
// Copie de TODOS os seus Facebook Apps
const appSecretsToTest = [
  { name: 'App atual (.env)', secret: '8dce0a9be202a564061968aa1a58dcfa' },
  // Adicione mais aqui:
  // { name: 'App 2', secret: 'cole_aqui_o_secret_do_app_2' },
  // { name: 'App 3', secret: 'cole_aqui_o_secret_do_app_3' },
];

console.log('='.repeat(80));
console.log('TESTANDO MÚLTIPLOS APP SECRETS');
console.log('='.repeat(80));
console.log(`\nPayload (${payload.length} bytes):`);
console.log(payload.substring(0, 100) + '...');
console.log(`\nSignature do Instagram: ${instagramSignature}`);
console.log('\n' + '='.repeat(80));
console.log('TESTANDO CADA APP SECRET:');
console.log('='.repeat(80));

let found = false;

appSecretsToTest.forEach((app, index) => {
  const calculated = crypto.createHmac('sha256', app.secret).update(payload).digest('hex');
  const match = calculated === instagramSignature;

  console.log(`\n${index + 1}. ${app.name}`);
  console.log(`   Secret: ${app.secret}`);
  console.log(`   Calculado: ${calculated}`);
  console.log(`   Match: ${match ? '✅ ESTE É O CORRETO!' : '❌ Não é este'}`);

  if (match) {
    found = true;
  }
});

console.log('\n' + '='.repeat(80));
if (found) {
  console.log('🎉 ENCONTRADO! Use o App Secret que deu match acima!');
} else {
  console.log('❌ Nenhum App Secret testado funciona.');
  console.log('');
  console.log('PRÓXIMOS PASSOS:');
  console.log('1. Acesse: https://developers.facebook.com/apps/');
  console.log('2. Liste TODOS os apps que você tem (incluindo de teste/dev)');
  console.log('3. Para cada app:');
  console.log('   - Abra Settings → Basic');
  console.log('   - Copie o App Secret');
  console.log('   - Adicione no array acima');
  console.log('4. Execute este script novamente: node test-multiple-secrets.js');
  console.log('');
  console.log('DICA: O Instagram pode estar configurado para usar um app diferente');
  console.log('      do que você pensa. Teste TODOS os seus apps!');
}
console.log('='.repeat(80));
