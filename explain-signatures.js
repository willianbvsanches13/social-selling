const crypto = require('crypto');

const appSecret = '8dce0a9be202a564061968aa1a58dcfa';

// Exemplo: 3 webhooks diferentes
const webhooks = [
  { payload: '{"message": "Oi", "timestamp": 1001}' },
  { payload: '{"message": "Tudo bem?", "timestamp": 1002}' },
  { payload: '{"message": "Oi", "timestamp": 1003}' }, // Mesma mensagem, timestamp diferente
];

console.log('='.repeat(80));
console.log('DEMONSTRAÇÃO: Por que cada webhook tem SHA1 diferente');
console.log('='.repeat(80));
console.log(`\nApp Secret (SEMPRE O MESMO): ${appSecret}\n`);

webhooks.forEach((webhook, index) => {
  const sha1 = crypto.createHmac('sha1', appSecret).update(webhook.payload).digest('hex');
  const sha256 = crypto.createHmac('sha256', appSecret).update(webhook.payload).digest('hex');

  console.log(`Webhook ${index + 1}:`);
  console.log(`  Payload: ${webhook.payload}`);
  console.log(`  SHA1:    ${sha1}`);
  console.log(`  SHA256:  ${sha256}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('CONCLUSÃO:');
console.log('  - App Secret: SEMPRE o mesmo para todos os webhooks');
console.log('  - SHA1/SHA256: DIFERENTE para cada webhook (porque o payload muda)');
console.log('='.repeat(80));
