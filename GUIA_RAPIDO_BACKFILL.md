# 🚀 Guia Rápido - Backfill e Correção de Datas

## ⚡ TL;DR - Comandos Rápidos

### Executando com Docker (Recomendado)

O backend está rodando no Docker, então use estes comandos:

```bash
# 1. Corrigir formato de datas
npm run fix:dates:docker

# 2. Backfill completo (DELETA TUDO E RECRIA)
npm run backfill:conversations:docker
```

### Ou execute diretamente no container:

```bash
# Entrar no container
docker exec -it social-selling-backend sh

# Dentro do container:
npm run fix:dates
npm run backfill:conversations
```

---

## 📝 Passo a Passo Recomendado

### Cenário 1: Apenas corrigir datas (não deletar dados)

```bash
# Execute este comando
npm run fix:dates:docker

# Ou manualmente no container
docker exec -it social-selling-backend npm run fix:dates
```

**O que faz:**
- ✅ Verifica se há datas com formato incorreto
- ✅ Corrige automaticamente
- ✅ NÃO deleta nenhum dado

---

### Cenário 2: Backfill completo (reprocessar tudo)

⚠️ **ATENÇÃO:** Este comando deleta TODAS as conversas e mensagens!

```bash
# Execute este comando
npm run backfill:conversations:docker

# Ou manualmente no container
docker exec -it social-selling-backend npm run backfill:conversations
```

**O que faz:**
1. ❌ Deleta todas as conversas
2. ❌ Deleta todas as mensagens
3. ✅ Busca webhooks dos logs HTTP
4. ✅ Reprocessa com a lógica corrigida
5. ✅ Recria conversas e mensagens

---

## 🔍 Verificar os Dados

### Ver conversas no banco:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT
    participant_username,
    last_message_at,
    unread_count
FROM conversations
ORDER BY last_message_at DESC NULLS LAST
LIMIT 10;
"
```

### Ver mensagens:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT
    m.sender_type,
    m.content,
    m.sent_at,
    c.participant_username
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
ORDER BY m.sent_at DESC
LIMIT 10;
"
```

### Ver logs de webhooks:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT
    COUNT(*) as total_webhooks
FROM http_request_logs
WHERE path = '/api/instagram/webhooks'
AND method = 'POST'
AND status_code = 200;
"
```

---

## 🆘 Problemas Comuns

### "Cannot find module"

O container precisa ter os módulos instalados. Reconstrua:

```bash
docker compose up -d --build backend
```

### "Database connection failed"

Verifique se o PostgreSQL está rodando:

```bash
docker compose ps postgres
docker compose logs postgres
```

### "No client account found"

O backfill precisa de uma conta cliente. Verifique:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT id, platform_account_id, instagram_account_id
FROM client_accounts;
"
```

---

## 💾 Fazer Backup (IMPORTANTE!)

Antes de executar o backfill, SEMPRE faça backup:

```bash
# Backup completo
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup apenas de conversas e mensagens
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling \
  -t conversations -t messages > backup_conversations_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar backup (se necessário):

```bash
# Restaurar tudo
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backup_20251103_010000.sql

# Restaurar apenas conversas
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backup_conversations_20251103_010000.sql
```

---

## 📊 Monitorar a Execução

### Ver logs do backend em tempo real:

```bash
docker compose logs -f backend
```

### Ver logs apenas do backfill:

Execute o comando e veja a saída diretamente no terminal.

---

## ✅ Checklist de Execução

### Antes de executar:

- [ ] Fiz backup do banco de dados
- [ ] Tenho certeza do que vou fazer
- [ ] Li a documentação
- [ ] Estou em desenvolvimento (não produção!)

### Para correção de datas apenas:

```bash
npm run fix:dates:docker
```

### Para backfill completo:

```bash
# 1. Fazer backup
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling > backup.sql

# 2. Executar backfill
npm run backfill:conversations:docker

# 3. Verificar resultados
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
"
```

---

## 🎯 Comandos Úteis

```bash
# Ver todos os containers
docker compose ps

# Ver logs do backend
docker compose logs backend

# Reiniciar backend
docker compose restart backend

# Reconstruir backend
docker compose up -d --build backend

# Entrar no container do backend
docker exec -it social-selling-backend sh

# Entrar no PostgreSQL
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- `BACKFILL_AND_DATE_FIX.md` - Documentação completa técnica
- `backend/scripts/README.md` - Detalhes dos scripts
- `backend/src/modules/instagram/handlers/webhook-message.handler.ts` - Código corrigido

---

## 🚨 LEMBRETE IMPORTANTE

⚠️ **NUNCA execute o backfill em produção sem:**
1. Fazer backup completo
2. Testar em desenvolvimento primeiro
3. Ter um plano de rollback
4. Comunicar o time
5. Escolher um horário de baixo tráfego

---

## 🆘 Precisa de Ajuda?

Se algo der errado:

1. **Pare tudo:** `docker compose stop backend`
2. **Restaure o backup:** (veja comandos acima)
3. **Verifique os logs:** `docker compose logs backend`
4. **Revise a documentação completa**
