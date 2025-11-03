# 🚀 Guia de Execução em PRODUÇÃO

## ⚠️ ATENÇÃO CRÍTICA

Este guia é para executar scripts de backfill e correção de datas em **PRODUÇÃO**.

**RISCOS:**
- ❌ O backfill **DELETA TODOS** os dados de conversas e mensagens
- ❌ Operação irreversível sem backup
- ❌ Pode causar downtime se não for planejado
- ❌ Requer janela de manutenção

---

## 📋 Pré-requisitos

### 1. Entender a Diferença: Desenvolvimento vs Produção

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| Scripts | `ts-node` (TypeScript) | `node` (JavaScript compilado) |
| Localização | `scripts/*.ts` | `dist/scripts/*.js` |
| Comando | `npm run fix:dates` | `npm run fix:dates:prod` |
| Dependências | Inclui `ts-node` | Apenas runtime |

### 2. Compilação Necessária

Os scripts precisam ser compilados antes de executar em produção:

```bash
# No seu ambiente de build/CI
npm run build
```

Isso vai compilar:
- ✅ `scripts/backfill-conversations-from-logs.ts` → `dist/scripts/backfill-conversations-from-logs.js`
- ✅ `scripts/fix-lastmessageat-dates.ts` → `dist/scripts/fix-lastmessageat-dates.js`

### 3. Verificar Build

```bash
# Verificar se scripts foram compilados
ls -la dist/scripts/

# Deve mostrar:
# - backfill-conversations-from-logs.js
# - fix-lastmessageat-dates.js
```

---

## 🔄 Processo Completo para Produção

### Fase 1: Preparação (1-2 dias antes)

#### 1.1 Fazer Deploy do Código Atualizado

```bash
# 1. Commit das mudanças
git add backend/tsconfig.json backend/package.json backend/scripts/
git commit -m "feat: adicionar scripts de backfill compilados para produção"

# 2. Push para produção
git push origin main  # ou sua branch de produção

# 3. Fazer deploy (método varia conforme sua infra)
# Exemplos:
# - Docker: docker compose build backend --no-cache
# - K8s: kubectl rollout restart deployment/backend
# - Cloud Run: gcloud run deploy...
```

#### 1.2 Validar Build em Staging

```bash
# No ambiente de staging (que imita produção)
docker exec <staging-backend-container> ls -la dist/scripts/

# Verificar que os .js existem
```

#### 1.3 Teste em Staging

```bash
# APENAS EM STAGING! Não em produção ainda!

# 1. Backup do staging
docker exec <staging-postgres> pg_dump -U user -d db > staging_backup.sql

# 2. Testar script de datas (seguro)
docker exec <staging-backend> npm run fix:dates:prod

# 3. Se tudo OK, testar backfill
docker exec <staging-backend> npm run backfill:conversations:prod

# 4. Validar resultados
docker exec <staging-postgres> psql -U user -d db -c "
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
"
```

---

### Fase 2: Planejamento da Janela de Manutenção

#### 2.1 Definir Janela

- **Duração estimada**: 10-30 minutos (dependendo do volume de logs)
- **Horário recomendado**: Madrugada ou baixo tráfego
- **Comunicação**: Avisar usuários com antecedência

#### 2.2 Checklist Pré-Execução

- [ ] Código atualizado em produção
- [ ] Scripts compilados verificados (`dist/scripts/*.js`)
- [ ] Testado em staging com sucesso
- [ ] Backup completo do banco agendado
- [ ] Time técnico disponível
- [ ] Plano de rollback preparado
- [ ] Monitoramento ativo

---

### Fase 3: Execução em Produção

#### 3.1 Backup CRÍTICO

```bash
# SEMPRE fazer backup ANTES!
docker exec <prod-postgres> pg_dump -U social_selling_user -d social_selling \
  > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# Verificar tamanho do backup
ls -lh backup_prod_*.sql

# IMPORTANTE: Copiar backup para local seguro
aws s3 cp backup_prod_*.sql s3://seu-bucket/backups/
# ou
scp backup_prod_*.sql usuario@servidor-backup:/backups/
```

#### 3.2 Modo Manutenção (Opcional mas Recomendado)

```bash
# Colocar aplicação em modo manutenção para evitar novas mensagens
docker exec <prod-backend> curl -X POST http://localhost:4000/api/maintenance/enable

# Ou parar o backend temporariamente
docker compose stop backend  # se usar docker compose
```

#### 3.3 Opção A: Apenas Corrigir Datas (SEGURO)

```bash
# ✅ NÃO deleta dados, apenas corrige formato

docker exec <prod-backend> npm run fix:dates:prod

# Verificar logs
docker compose logs backend --tail=50

# Validar resultado
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN last_message_at > '2100-01-01'::timestamptz THEN 1 END) as problematic
FROM conversations;
"
```

#### 3.4 Opção B: Backfill Completo (DESTRUTIVO)

```bash
# ⚠️ DELETA TUDO E RECRIA

# 1. Verificar quantidade de webhooks disponíveis
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) FROM http_request_logs
WHERE path = '/api/instagram/webhooks'
AND method = 'POST'
AND status_code = 200;
"

# 2. Executar backfill
docker exec <prod-backend> npm run backfill:conversations:prod

# 3. Monitorar execução (em outro terminal)
docker compose logs -f backend

# 4. Aguardar conclusão (pode levar alguns minutos)
```

#### 3.5 Validação Pós-Execução

```bash
# 1. Verificar contagem de dados
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT
  (SELECT COUNT(*) FROM conversations) as conversations,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM http_request_logs
   WHERE path = '/api/instagram/webhooks') as webhooks_processed;
"

# 2. Verificar datas
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT
  participant_username,
  last_message_at,
  unread_count
FROM conversations
ORDER BY last_message_at DESC NULLS LAST
LIMIT 10;
"

# 3. Verificar mensagens
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
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

#### 3.6 Reativar Sistema

```bash
# Tirar do modo manutenção
docker exec <prod-backend> curl -X POST http://localhost:4000/api/maintenance/disable

# Ou reiniciar backend
docker compose start backend
docker compose restart backend  # para garantir
```

---

### Fase 4: Monitoramento Pós-Deploy

#### 4.1 Monitoramento Imediato (primeiras 2 horas)

```bash
# 1. Logs de erro
docker compose logs backend --tail=100 -f | grep -i error

# 2. Verificar novos webhooks sendo processados
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) FROM messages
WHERE created_at > NOW() - INTERVAL '10 minutes';
"

# 3. Health check
curl https://seu-dominio.com/health
```

#### 4.2 Verificações nas próximas 24h

- [ ] Novas mensagens sendo recebidas corretamente
- [ ] Conversas sendo criadas/atualizadas
- [ ] Datas com formato correto
- [ ] Sem erros nos logs
- [ ] Performance normal

---

## 🆘 Plano de Rollback

### Se algo der errado:

#### 1. Rollback Imediato (Restaurar Backup)

```bash
# 1. PARAR o backend IMEDIATAMENTE
docker compose stop backend

# 2. Restaurar backup
docker exec -i <prod-postgres> psql -U social_selling_user -d social_selling < backup_prod_TIMESTAMP.sql

# 3. Reiniciar backend
docker compose start backend

# 4. Verificar restauração
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
"
```

#### 2. Rollback do Código (se necessário)

```bash
# Voltar para commit anterior
git revert <commit-hash>
git push origin main

# Fazer redeploy
docker compose build backend --no-cache
docker compose up -d backend
```

---

## 📊 Comandos de Diagnóstico

### Durante a Execução

```bash
# Ver progresso do script
docker compose logs backend --tail=50 -f

# Verificar uso de recursos
docker stats

# Verificar conexões do banco
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT count(*) FROM pg_stat_activity WHERE datname = 'social_selling';
"
```

### Após Execução

```bash
# Relatório completo
docker exec <prod-postgres> psql -U social_selling_user -d social_selling << EOF
-- Total de conversas e mensagens
SELECT
  'conversations' as table_name,
  COUNT(*) as total,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM conversations
UNION ALL
SELECT
  'messages' as table_name,
  COUNT(*) as total,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM messages;

-- Conversas por status
SELECT status, COUNT(*) as total
FROM conversations
GROUP BY status;

-- Mensagens por tipo de remetente
SELECT sender_type, COUNT(*) as total
FROM messages
GROUP BY sender_type;

-- Verificar datas problemáticas
SELECT COUNT(*) as problematic_dates
FROM conversations
WHERE last_message_at > '2100-01-01'::timestamptz
   OR last_message_at < '2020-01-01'::timestamptz;
EOF
```

---

## 🎯 Resumo: Comandos Rápidos para Produção

### Preparação:
```bash
# Build e deploy
npm run build
git commit -m "feat: scripts compilados"
git push origin main
# ... fazer deploy conforme sua infra
```

### Execução:
```bash
# 1. BACKUP PRIMEIRO!
docker exec <prod-postgres> pg_dump -U social_selling_user -d social_selling > backup.sql

# 2. Correção de datas (seguro)
docker exec <prod-backend> npm run fix:dates:prod

# 3. OU Backfill completo (destrutivo)
docker exec <prod-backend> npm run backfill:conversations:prod
```

### Validação:
```bash
docker exec <prod-postgres> psql -U social_selling_user -d social_selling -c "
SELECT
  (SELECT COUNT(*) FROM conversations) as conversations,
  (SELECT COUNT(*) FROM messages) as messages;
"
```

---

## 📚 Referências

- **Scripts Source**: `backend/scripts/`
- **Scripts Compilados**: `backend/dist/scripts/`
- **Documentação Dev**: `GUIA_RAPIDO_BACKFILL.md`
- **Documentação Técnica**: `BACKFILL_AND_DATE_FIX.md`
- **Package.json**: Comandos `:prod` para produção

---

## ⚡ Diferenças dos Comandos

| Ambiente | Comando | O que executa |
|----------|---------|---------------|
| **Dev Local** | `npm run fix:dates` | `ts-node scripts/fix-lastmessageat-dates.ts` |
| **Dev Docker** | `npm run fix:dates:docker` | Executa no container dev |
| **Produção** | `npm run fix:dates:prod` | `node dist/scripts/fix-lastmessageat-dates.js` |

---

## 🚨 Lembretes Finais

### NUNCA em Produção sem:
1. ✅ Backup completo do banco
2. ✅ Teste em staging primeiro
3. ✅ Plano de rollback documentado
4. ✅ Janela de manutenção agendada
5. ✅ Time técnico disponível
6. ✅ Monitoramento ativo

### Se tiver QUALQUER dúvida:
1. ❌ NÃO execute
2. ✅ Teste em staging novamente
3. ✅ Faça dry-run dos comandos
4. ✅ Revise esta documentação
5. ✅ Peça segunda opinião

---

## 🆘 Contatos de Emergência

**Durante a execução, ter disponível:**
- [ ] Acesso ao servidor de produção
- [ ] Acesso ao backup externo
- [ ] Logs de monitoramento
- [ ] Plano de comunicação com usuários
- [ ] Time DevOps de plantão

**Em caso de problemas:**
1. Parar backend imediatamente
2. Restaurar backup
3. Documentar erro
4. Analisar logs
5. Planejar nova tentativa

---

*Última atualização: Novembro 2025*
