# Backend Scripts

Este diretório contém scripts utilitários para manutenção e operações do backend.

## 🚨 IMPORTANTE: Desenvolvimento vs Produção

| Ambiente | Como Executar | Arquivo Usado |
|----------|---------------|---------------|
| **Desenvolvimento** | `npm run fix:dates` | `scripts/*.ts` (TypeScript) |
| **Dev Docker** | `npm run fix:dates:docker` | `scripts/*.ts` (via ts-node) |
| **Produção** | `npm run fix:dates:prod` | `dist/scripts/*.js` (JavaScript compilado) |

⚠️ **Para produção**: Consulte `GUIA_PRODUCAO_BACKFILL.md` na raiz do projeto.

---

## Scripts Disponíveis

### 1. Backfill de Conversas (`backfill-conversations-from-logs.ts`)

**Propósito:** Reprocessa mensagens do Instagram a partir dos logs de requisição HTTP para reconstruir conversas e mensagens com a lógica corrigida.

**Quando usar:**
- Após correções na lógica de processamento de webhooks
- Para reconstruir dados de conversas que foram processados incorretamente
- Para popular o banco de dados a partir de logs históricos

**Como executar:**

```bash
# Via npm script (recomendado)
npm run backfill:conversations

# Ou diretamente com ts-node
ts-node -r tsconfig-paths/register scripts/backfill-conversations-from-logs.ts
```

**O que o script faz:**

1. **Limpa dados existentes** - Remove todas as conversas e mensagens atuais
2. **Busca logs de webhooks** - Recupera todos os webhooks do Instagram da tabela `http_request_logs`
3. **Reprocessa webhooks** - Processa cada webhook usando o `WebhookMessageHandler` com a lógica corrigida
4. **Relatório final** - Exibe estatísticas sobre o processamento

**⚠️ AVISO:** Este script deleta **TODAS** as conversas e mensagens existentes! Use com cuidado.

**Exemplo de saída:**

```
🚀 Starting backfill process...

📦 Step 1: Cleaning existing data...
   ✓ Deleted all messages
   ✓ Deleted all conversations

📦 Step 2: Fetching webhook logs from http_request_logs...
   ✓ Found 150 webhook logs to process

📦 Step 3: Processing webhooks...
   ⏳ Processed 10 messages...
   ⏳ Processed 20 messages...
   ...

📊 Backfill Summary:
   ✓ Total webhook logs: 150
   ✓ Messages processed: 145
   ✓ Errors: 0

📈 Final Statistics:
   ✓ Conversations created: 45
   ✓ Messages created: 145

✅ Backfill completed successfully!
```

---

### 2. Correção de Datas (`fix-lastmessageat-dates.ts`)

**Propósito:** Investiga e corrige problemas de formato na coluna `lastMessageAt` das conversas.

**Quando usar:**
- Quando datas aparecem com formato incorreto (ex: `+057808-10-30T11:43:25.000Z`)
- Após migração de dados
- Para verificar a integridade das datas armazenadas

**Como executar:**

```bash
# Via npm script (recomendado)
npm run fix:dates

# Ou diretamente com ts-node
ts-node -r tsconfig-paths/register scripts/fix-lastmessageat-dates.ts
```

**O que o script faz:**

1. **Verifica datas problemáticas** - Identifica datas no futuro distante (> 2100)
2. **Corrige automaticamente** - Converte timestamps incorretos para datas válidas
3. **Relatório de verificação** - Mostra estatísticas antes e depois da correção

**Exemplo de saída (com problemas):**

```
🔍 Starting date investigation and fix...

📦 Step 1: Checking for problematic dates...
   ⚠️  Found 12 conversations with problematic dates

Examples of problematic dates:
   - john_doe: +057808-10-30T11:43:25.000Z (epoch: 1761948183080)
   - jane_smith: +057808-10-30T11:45:12.000Z (epoch: 1761948312000)

📦 Step 2: Fixing problematic dates...
   ✓ Fixed 12 dates

Examples of fixed dates:
   - john_doe: 2025-10-31T22:03:03.080Z
   - jane_smith: 2025-10-31T22:05:12.000Z

📊 Final Statistics:
   Total conversations: 45
   Conversations with messages: 45
   Still problematic: 0

✅ All dates are now correct!
```

**Exemplo de saída (sem problemas):**

```
🔍 Starting date investigation and fix...

📦 Step 1: Checking for problematic dates...
   ✓ No problematic dates found!

📊 Sample of current dates:
   john_doe: 2025-10-31T22:03:03.080Z
   jane_smith: 2025-10-31T22:05:12.000Z
   bob_wilson: 2025-10-31T21:58:45.123Z

📊 Final Statistics:
   Total conversations: 45
   Conversations with messages: 45
   Still problematic: 0

✅ All dates are now correct!
```

---

### 3. Simulação de Webhooks (`simulate-webhooks.ts`)

**Propósito:** Gera webhooks simulados do Instagram para testes.

**Como executar:**

```bash
npm run simulate-webhooks
```

---

## Troubleshooting

### Erro: "Cannot find module"

Certifique-se de que as dependências estão instaladas:

```bash
npm install
```

### Erro: "Database connection failed"

Verifique se:
1. O Docker está rodando: `docker compose ps`
2. O PostgreSQL está acessível: `docker compose logs postgres`
3. As variáveis de ambiente estão configuradas corretamente

### Erro: "No client account found"

O script de backfill precisa que exista pelo menos uma conta de cliente (`client_accounts`) no banco de dados com o `platform_account_id` correspondente ao `entry.id` do webhook.

Verifique se há contas cadastradas:

```sql
SELECT id, platform_account_id, instagram_account_id
FROM client_accounts;
```

---

## Desenvolvimento

Para adicionar um novo script:

1. Crie o arquivo TypeScript em `backend/scripts/`
2. Adicione o shebang: `#!/usr/bin/env ts-node`
3. Adicione um comentário descritivo no início
4. Adicione o npm script em `package.json`:

```json
{
  "scripts": {
    "your-script": "ts-node -r tsconfig-paths/register scripts/your-script.ts"
  }
}
```

5. Documente o script neste README

---

## Logs e Debugging

Todos os scripts usam `console.log` para saída. Para salvar logs em arquivo:

```bash
npm run backfill:conversations > backfill.log 2>&1
npm run fix:dates > fix-dates.log 2>&1
```

---

## Segurança

⚠️ **IMPORTANTE:**
- Scripts como `backfill:conversations` **deletam dados**
- Sempre faça backup antes de executar scripts destrutivos
- Teste em ambiente de desenvolvimento primeiro
- Nunca execute scripts de produção sem revisar o código

---

## Contribuindo

Ao adicionar novos scripts:
- Use TypeScript para type safety
- Adicione tratamento de erros adequado
- Forneça feedback claro ao usuário
- Documente o propósito e uso
- Inclua exemplos de saída
