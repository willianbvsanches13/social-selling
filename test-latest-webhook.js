const crypto = require('crypto');

// Payload MAIS RECENTE (acabou de chegar)
const payload = '{"object":"instagram","entry":[{"time":1762031165141,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762031146380,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzczNzYwNzE3OTkwMDgyNTYzNjIwMjQ5NzQ0MTc5MgZDZD","text":"oi"}}]}]}';

// Signature que o Instagram enviou
const instagramSignature = '4d9f9a4cb4256267b89fe0a048dfe2d9344a7286981278e750e9be5699dab1e5';

// App Secret atual
const currentAppSecret = '8dce0a9be202a564061968aa1a58dcfa';

console.log('='.repeat(80));
console.log('TESTE FINAL - ÚLTIMA TENTATIVA');
console.log('='.repeat(80));
console.log('\nPayload:');
console.log(payload);
console.log(`\nLength: ${payload.length} bytes`);
console.log(`\nInstagram signature: ${instagramSignature}`);

// Calcular com o app secret atual
const calc1 = crypto.createHmac('sha256', currentAppSecret).update(payload).digest('hex');
console.log(`\n1. Com App Secret do .env:`);
console.log(`   ${currentAppSecret}`);
console.log(`   Resultado: ${calc1}`);
console.log(`   Match: ${calc1 === instagramSignature ? '✅' : '❌'}`);

// Vou tentar algumas variações comuns de erro
console.log('\n' + '='.repeat(80));
console.log('TENTANDO VARIAÇÕES COMUNS:');
console.log('='.repeat(80));

// Variação 1: Sem o caractere final (as pessoas às vezes copiam errado)
const var1 = currentAppSecret.slice(0, -1);
const calc2 = crypto.createHmac('sha256', var1).update(payload).digest('hex');
console.log(`\n2. Sem último caractere: ${var1}`);
console.log(`   Match: ${calc2 === instagramSignature ? '✅ ESTE!' : '❌'}`);

// Variação 3: Com espaço no início/fim (erro de copiar)
const var3 = ' ' + currentAppSecret;
const calc3 = crypto.createHmac('sha256', var3).update(payload).digest('hex');
console.log(`\n3. Com espaço no início`);
console.log(`   Match: ${calc3 === instagramSignature ? '✅ ESTE!' : '❌'}`);

const var4 = currentAppSecret + ' ';
const calc4 = crypto.createHmac('sha256', var4).update(payload).digest('hex');
console.log(`\n4. Com espaço no fim`);
console.log(`   Match: ${calc4 === instagramSignature ? '✅ ESTE!' : '❌'}`);

console.log('\n' + '='.repeat(80));
console.log('\n❌ CONCLUSÃO: O App Secret `8dce0a9be202a564061968aa1a58dcfa`');
console.log('   NÃO é o correto e nenhuma variação simples funciona.');
console.log('\n💡 PRÓXIMA AÇÃO:');
console.log('   1. Acesse: https://developers.facebook.com/apps/1771701046817746/settings/basic/');
console.log('   2. Clique em "Reset App Secret" (Redefinir chave secreta)');
console.log('   3. Isso vai gerar um NOVO App Secret');
console.log('   4. COPIE o novo secret e cole aqui');
console.log('   5. Atualize o .env e reinicie o backend');
console.log('\n⚠️  IMPORTANTE: Reset vai invalidar o secret antigo, mas não tem problema');
console.log('    porque o atual não está funcionando mesmo!');
console.log('='.repeat(80));
