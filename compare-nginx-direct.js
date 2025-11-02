const crypto = require('crypto');
const { execSync } = require('child_process');

// Payload de teste
const payload = '{"object":"instagram","entry":[{"time":1234567890,"id":"test123","messaging":[{"sender":{"id":"sender123"},"message":{"mid":"mid123","text":"test"}}]}]}';

const appSecret = '8dce0a9be202a564061968aa1a58dcfa';

// Calcular signature esperada
const expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

console.log('='.repeat(80));
console.log('TESTE COMPARATIVO: NGINX vs DIRETO');
console.log('='.repeat(80));
console.log('\n📋 Payload de teste:');
console.log(`  ${payload}`);
console.log(`\n🔐 Signature esperada: ${expectedSignature}`);

// Teste 1: Direto no backend (porta 4000)
console.log('\n' + '='.repeat(80));
console.log('TESTE 1: DIRETO no backend (porta 4000)');
console.log('='.repeat(80));

try {
  const result = execSync(`curl -s -X POST http://localhost:4000/api/instagram/webhooks \
    -H "Content-Type: application/json" \
    -H "x-hub-signature-256: sha256=${expectedSignature}" \
    -d '${payload}' \
    -w "\\nHTTP_CODE:%{http_code}"`, { encoding: 'utf-8' });

  const httpCode = result.match(/HTTP_CODE:(\d+)/)?.[1];
  console.log(`Response: ${result.split('HTTP_CODE:')[0]}`);
  console.log(`HTTP Code: ${httpCode}`);
  console.log(`Status: ${httpCode === '200' ? '✅ SUCESSO' : '❌ FALHA'}`);
} catch (error) {
  console.log('❌ ERRO:', error.message);
}

// Aguardar um pouco
execSync('sleep 2');

// Teste 2: Através do nginx (porta 443)
console.log('\n' + '='.repeat(80));
console.log('TESTE 2: ATRAVÉS DO NGINX (porta 443)');
console.log('='.repeat(80));

try {
  const result = execSync(`curl -s -k -X POST https://api.app-socialselling.willianbvsanches.com/api/instagram/webhooks \
    -H "Content-Type: application/json" \
    -H "x-hub-signature-256: sha256=${expectedSignature}" \
    -d '${payload}' \
    -w "\\nHTTP_CODE:%{http_code}"`, { encoding: 'utf-8' });

  const httpCode = result.match(/HTTP_CODE:(\d+)/)?.[1];
  console.log(`Response: ${result.split('HTTP_CODE:')[0]}`);
  console.log(`HTTP Code: ${httpCode}`);
  console.log(`Status: ${httpCode === '200' ? '✅ SUCESSO' : '❌ FALHA'}`);
} catch (error) {
  console.log('❌ ERRO:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('VERIFICANDO LOGS DO BACKEND...');
console.log('='.repeat(80));

// Aguardar logs
execSync('sleep 1');

// Buscar logs
try {
  const logs = execSync('docker logs social-selling-backend --tail 20 2>&1 | grep -E "(Webhook signature verification|VALID|Expected signature)" | tail -8', { encoding: 'utf-8' });
  console.log(logs);
} catch (error) {
  console.log('Nenhum log encontrado');
}

console.log('\n' + '='.repeat(80));
console.log('CONCLUSÃO:');
console.log('='.repeat(80));
console.log('Se ambos os testes retornaram 200 OK, o nginx NÃO está modificando o payload.');
console.log('Se apenas o teste direto funcionou, o nginx AINDA está modificando.');
console.log('='.repeat(80));
