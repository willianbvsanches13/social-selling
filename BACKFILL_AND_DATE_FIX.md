# Backfill de Conversas e Correção de Datas

## Problema Identificado

Após a correção da lógica de identificação do usuário no processamento de webhooks do Instagram, os dados existentes precisam ser reprocessados. Além disso, foi identificado um problema de formato na data `lastMessageAt`.

### Problemas:

1. **Lógica de Identificação Incorreta:**
   - Antes: usava `recipient.id` para identificar o usuário
   - Agora: usa `entry.id` corretamente

2. **Formato de Data Incorreto:**
   - Aparece como: `+057808-10-30T11:43:25.000Z`
   - Causa: timestamps em milissegundos sendo interpretados como datas

## Soluções Implementadas

### 1. Script de Backfill (`backfill-conversations-from-logs.ts`)

**Localização:** `backend/scripts/backfill-conversations-from-logs.ts`

**O que faz:**
- Deleta todas as conversas e mensagens existentes
- Busca todos os webhooks da tabela `http_request_logs`
- Reprocessa usando a lógica corrigida do `WebhookMessageHandler`
- Recria conversas e mensagens com os dados corretos

**Como usar:**

```bash
# Executando com Docker (recomendado):
npm run backfill:conversations:docker

# Ou dentro do container:
docker exec -it social-selling-backend npm run backfill:conversations

# Ou se estiver rodando localmente (sem Docker):
cd backend
npm run backfill:conversations
```

**⚠️ AVISO:** Este comando deleta TODOS os dados de conversas e mensagens!

---

### 2. Script de Correção de Datas (`fix-lastmessageat-dates.ts`)

**Localização:** `backend/scripts/fix-lastmessageat-dates.ts`

**O que faz:**
- Identifica datas no futuro distante (> 2100)
- Corrige automaticamente convertendo timestamps incorretos
- Valida que todas as datas estão corretas

**Como usar:**

```bash
# Executando com Docker (recomendado):
npm run fix:dates:docker

# Ou dentro do container:
docker exec -it social-selling-backend npm run fix:dates

# Ou se estiver rodando localmente (sem Docker):
cd backend
npm run fix:dates
```

---

### 3. SQL de Investigação (`fix-lastmessageat-dates.sql`)

**Localização:** `backend/scripts/fix-lastmessageat-dates.sql`

**Para usar manualmente:**

```bash
# Executar diretamente no PostgreSQL
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backend/scripts/fix-lastmessageat-dates.sql
```

---

## Fluxo Recomendado de Execução

### Opção 1: Backfill Completo (Recomendado)

Use quando quiser reconstruir tudo do zero a partir dos logs:

```bash
# 1. FAZER BACKUP PRIMEIRO!
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Execute o backfill (deleta e recria tudo) - COM DOCKER
npm run backfill:conversations:docker

# 3. Verifique se há problemas de data
npm run fix:dates:docker
```

### Opção 2: Apenas Correção de Datas

Use quando não quiser deletar dados, apenas corrigir datas:

```bash
# Com Docker (recomendado)
npm run fix:dates:docker

# Ou dentro do container
docker exec -it social-selling-backend npm run fix:dates
```

---

## Verificação Manual

### Verificar Conversas

```sql
SELECT
    id,
    participant_username,
    participant_platform_id,
    last_message_at,
    unread_count,
    status
FROM conversations
ORDER BY last_message_at DESC NULLS LAST
LIMIT 10;
```

### Verificar Mensagens

```sql
SELECT
    m.id,
    m.sender_type,
    m.sender_platform_id,
    m.content,
    m.sent_at,
    c.participant_username
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
ORDER BY m.sent_at DESC
LIMIT 10;
```

### Verificar Logs de Webhook

```sql
SELECT
    id,
    method,
    path,
    status_code,
    created_at
FROM http_request_logs
WHERE path = '/api/instagram/webhooks'
AND method = 'POST'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Detalhes Técnicos

### Correção da Lógica de Identificação

**Arquivo:** `backend/src/modules/instagram/handlers/webhook-message.handler.ts`

**Mudança Principal:**

```typescript
// ANTES (incorreto)
const isFromCustomer = payload.sender.id !== payload.recipient.id;

// DEPOIS (correto)
const isFromCustomer = payload.sender.id !== payload.entryId;
```

**Explicação:**
- `entry.id` representa o ID da página/conta do Instagram (o proprietário)
- Se `sender.id === entry.id` → mensagem ENVIADA pelo usuário
- Se `sender.id !== entry.id` → mensagem RECEBIDA de um cliente
- O `participantPlatformId` é sempre o outro lado (não o entry.id)

### Correção do Formato de Data

**Problema:**
O PostgreSQL estava armazenando corretamente as datas como `TIMESTAMPTZ`, mas valores incorretos (milissegundos como timestamp) resultavam em datas no futuro distante.

**Solução:**
```sql
UPDATE conversations
SET last_message_at = to_timestamp(EXTRACT(EPOCH FROM last_message_at) / 1000000)
WHERE last_message_at > '2100-01-01'::timestamptz;
```

Esta query:
1. Identifica datas no futuro (> 2100)
2. Extrai o epoch (segundos)
3. Divide por 1.000.000 para converter de microssegundos
4. Reconverte para timestamp

---

## Testes

Foram criados testes unitários que validam a nova lógica:

**Arquivo:** `backend/test/unit/modules/instagram/handlers/webhook-message.handler.test.ts`

**Cenários testados:**
- ✅ Mensagem recebida de cliente (sender.id !== entry.id)
- ✅ Mensagem enviada pelo usuário (sender.id === entry.id)
- ✅ Mensagens echo são ignoradas

**Executar testes:**

```bash
cd backend
npm test -- webhook-message.handler.test.ts
```

---

## Troubleshooting

### Erro: "No client account found"

O backfill precisa de uma conta de cliente com `platform_account_id` correspondente ao `entry.id` do webhook.

**Verificar:**
```sql
SELECT id, platform_account_id, instagram_account_id
FROM client_accounts;
```

### Erro: "Database connection failed"

**Verificar:**
```bash
docker compose ps
docker compose logs postgres
```

### Datas ainda incorretas após fix

Verifique se há dados sendo inseridos com timestamps incorretos:

```sql
SELECT
    id,
    last_message_at,
    EXTRACT(EPOCH FROM last_message_at) as epoch_seconds
FROM conversations
WHERE last_message_at > '2100-01-01'::timestamptz;
```

---

## Backup e Segurança

⚠️ **IMPORTANTE:** Sempre faça backup antes de executar scripts destrutivos!

### Backup do banco de dados:

```bash
# Criar backup
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup (se necessário)
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backup_20251103_010000.sql
```

### Backup apenas de conversas e mensagens:

```bash
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling \
  -t conversations -t messages > conversations_backup.sql
```

---

## Próximos Passos

1. ✅ Executar backfill em desenvolvimento
2. ✅ Validar que os dados estão corretos
3. ✅ Executar testes E2E
4. 📝 Documentar para o time
5. 🚀 Planejar execução em produção

---

## Referências

- Script de Backfill: `backend/scripts/backfill-conversations-from-logs.ts`
- Script de Correção de Datas: `backend/scripts/fix-lastmessageat-dates.ts`
- Handler Corrigido: `backend/src/modules/instagram/handlers/webhook-message.handler.ts`
- Testes: `backend/test/unit/modules/instagram/handlers/webhook-message.handler.test.ts`
- README dos Scripts: `backend/scripts/README.md`
