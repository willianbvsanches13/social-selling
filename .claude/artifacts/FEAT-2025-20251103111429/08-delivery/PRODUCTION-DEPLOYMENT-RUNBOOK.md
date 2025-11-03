# Production Deployment Runbook
## Feature: Message Reply & Attachments (FEAT-2025-20251103111429)

**⏱️ Tempo Total Estimado**: 30-45 minutos
**👥 Pessoas Necessárias**: 1 DevOps + 1 Backend Dev (recomendado)
**🕐 Melhor Horário**: Janela de baixo tráfego (ex: madrugada, fim de semana)

---

## 📋 Pré-Requisitos

### Antes de Começar

- [ ] Leia este documento COMPLETAMENTE antes de executar
- [ ] Feature testada em staging e aprovada
- [ ] Janela de manutenção agendada (recomendado: 1 hora)
- [ ] Equipe de suporte alertada
- [ ] Monitoramento ativo (logs, métricas)
- [ ] Acesso SSH/kubectl ao ambiente de produção
- [ ] Acesso ao banco de dados de produção
- [ ] Código na branch main/master atualizado

### Verificar Ambiente

```bash
# 1. Conferir conexão com servidor
ssh user@production-server
# ✓ Deve conectar sem erros

# 2. Conferir acesso ao banco
psql -U social_selling_user -d social_selling -c "SELECT version();"
# ✓ Deve retornar versão do PostgreSQL

# 3. Conferir espaço em disco
df -h
# ✓ Deve ter pelo menos 10GB livres

# 4. Conferir serviços rodando
docker ps
# ✓ Backend e frontend devem estar UP
```

---

## 🎯 PASSO 1: Backup Completo (CRÍTICO!)

**⏱️ Tempo: 5-10 minutos**
**⚠️ NÃO PULE ESTE PASSO!**

### 1.1 Backup do Banco de Dados

```bash
# Criar diretório de backups
mkdir -p ~/backups/feat-attachments-$(date +%Y%m%d)
cd ~/backups/feat-attachments-$(date +%Y%m%d)

# Backup completo do banco
pg_dump -U social_selling_user -d social_selling \
  -F c -f db_backup_$(date +%Y%m%d_%H%M%S).dump

# Verificar backup foi criado
ls -lh db_backup_*.dump
# ✓ Arquivo deve ter tamanho > 0 bytes

# Testar integridade do backup
pg_restore --list db_backup_*.dump | head -20
# ✓ Deve listar tabelas sem erros
```

### 1.2 Backup dos Arquivos de Código

```bash
# Salvar versão atual do código (caso precise voltar)
cd /path/to/backend
git log -1 --oneline > ~/backups/feat-attachments-$(date +%Y%m%d)/current_commit.txt
git diff HEAD > ~/backups/feat-attachments-$(date +%Y%m%d)/current_changes.diff

cd /path/to/frontend
git log -1 --oneline >> ~/backups/feat-attachments-$(date +%Y%m%d)/current_commit.txt
git diff HEAD >> ~/backups/feat-attachments-$(date +%Y%m%d)/current_changes.diff
```

### ✅ Checkpoint 1
- [ ] Backup do banco criado e verificado
- [ ] Commits atuais salvos
- [ ] Arquivos de backup acessíveis

**🔴 Se algo falhar**: Não prossiga. Investigue e corrija antes de continuar.

---

## 🎯 PASSO 2: Deploy do Backend

**⏱️ Tempo: 5-10 minutos**

### 2.1 Atualizar Código Backend

```bash
cd /path/to/backend

# Pull do código mais recente
git fetch origin
git checkout main  # ou master
git pull origin main

# Verificar commit correto
git log -1 --oneline
# ✓ Deve mostrar commit da feature FEAT-2025-20251103111429
```

### 2.2 Instalar Dependências

```bash
# Instalar/atualizar dependências
npm install

# ✓ Deve completar sem erros
# ⚠️ Se houver warnings, revisar mas pode continuar
```

### 2.3 Build do Backend

```bash
# Build do TypeScript
npm run build

# ✓ Deve completar sem erros TypeScript
# ✓ Pasta dist/ deve ser criada/atualizada
```

### 2.4 Reiniciar Serviço Backend

**Opção A: Docker**
```bash
# Rebuild e restart do container
docker-compose build backend
docker-compose up -d backend

# Verificar logs
docker-compose logs -f backend --tail=50
# ✓ Buscar por "Application started" ou similar
# ✓ NÃO deve ter errors fatais
```

**Opção B: PM2**
```bash
# Restart do processo
pm2 restart backend

# Verificar logs
pm2 logs backend --lines 50
# ✓ Buscar por startup confirmado
# ✓ NÃO deve ter errors
```

**Opção C: Systemd**
```bash
# Restart do serviço
sudo systemctl restart social-selling-backend

# Verificar status
sudo systemctl status social-selling-backend
# ✓ Deve estar "active (running)"

# Verificar logs
sudo journalctl -u social-selling-backend -n 50 -f
```

### 2.5 Verificar Backend Está Funcionando

```bash
# Health check
curl http://localhost:3000/health
# ✓ Deve retornar 200 OK

# Testar endpoint de mensagens
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/messaging/conversations
# ✓ Deve retornar 200 e lista de conversas
```

### ✅ Checkpoint 2
- [ ] Backend código atualizado
- [ ] Build completado sem erros
- [ ] Serviço reiniciado
- [ ] Health check passando
- [ ] API respondendo normalmente

**🔴 Se algo falhar**:
```bash
# Rollback rápido do backend
git checkout PREVIOUS_COMMIT_HASH
npm run build
docker-compose restart backend  # ou pm2 restart backend
```

---

## 🎯 PASSO 3: Migration 039 (Schema)

**⏱️ Tempo: < 1 minuto**

### 3.1 Executar Migration

```bash
cd /path/to/backend

# Verificar migrations pendentes
ls -la migrations/ | grep "039-add-message-reply"
# ✓ Deve existir: 039-add-message-reply-and-attachments.sql

# Executar migration
psql -U social_selling_user -d social_selling \
  -f migrations/039-add-message-reply-and-attachments.sql

# OU se usar npm scripts (PRODUÇÃO):
docker compose exec backend npm run migrate:up:prod

# OU dentro do container:
npm run migrate:up:prod
```

### 3.2 Verificar Migration Aplicada

```bash
# Verificar colunas foram criadas
psql -U social_selling_user -d social_selling -c "\d messages" | grep -E "replied_to_message_id|attachments"

# ✓ Deve mostrar:
# replied_to_message_id | uuid
# attachments            | jsonb
```

```sql
-- Verificar índices foram criados
\di idx_messages_replied_to
\di idx_messages_attachments

-- ✓ Ambos devem existir
```

### ✅ Checkpoint 3
- [ ] Migration 039 executada
- [ ] Colunas `replied_to_message_id` e `attachments` existem
- [ ] Índices criados
- [ ] Sem erros no output da migration

**🔴 Se algo falhar**: Migration é transacional, faz rollback automático. Investigue erro antes de continuar.

---

## 🎯 PASSO 4: Backfill de Dados (CRÍTICO!)

**⏱️ Tempo: Varia (veja tabela abaixo)**
**⚠️ PASSO MAIS IMPORTANTE - NÃO PULE!**

### 4.1 Estimar Tempo de Execução

```sql
-- Contar mensagens com media_url
SELECT COUNT(*) as messages_to_migrate
FROM messages
WHERE media_url IS NOT NULL AND media_url != '';
```

**Tempo estimado:**
| Mensagens | Tempo Esperado |
|-----------|----------------|
| < 10,000 | ~3 segundos |
| 10,000 - 50,000 | ~15 segundos |
| 50,000 - 100,000 | ~30 segundos |
| 100,000 - 500,000 | ~2 minutos |
| 500,000 - 1,000,000 | ~5 minutos |
| > 1,000,000 | ~10 minutos |

### 4.2 DRY RUN (Preview - NÃO faz mudanças)

```bash
# Testar ANTES de executar de verdade (PRODUÇÃO)
docker compose exec backend npm run backfill:attachments:prod -- --dry-run

# OU dentro do container:
npm run backfill:attachments:prod -- --dry-run

# ✓ Revisar output
# ✓ Verificar números fazem sentido
# ✓ Ver exemplos de dados que serão migrados
```

### 4.3 Executar Backfill

**Opção A: SQL Migration (RECOMENDADO para Produção)**

```bash
# Executar migration SQL
psql -U social_selling_user -d social_selling \
  -f migrations/040-backfill-attachments-from-mediaurl.sql

# Monitorar output para mensagens como:
# NOTICE: Total messages in database: XXXXX
# NOTICE: Messages with media_url: XXXXX
# NOTICE: Messages to migrate: XXXXX
# ...
# NOTICE: Migration completed successfully!
# NOTICE: Migration verification PASSED - 100% coverage
```

**Opção B: TypeScript Script**

```bash
# Executar script TypeScript
npm run backfill:attachments

# OU se estiver usando Docker:
docker exec social-selling-backend npm run backfill:attachments

# OU em produção:
npm run backfill:attachments:prod
```

### 4.4 Verificar Backfill Completou com Sucesso

```sql
-- Verificar cobertura de 100%
SELECT
  COUNT(*) FILTER (WHERE media_url IS NOT NULL AND media_url != '') as with_media,
  COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb) as with_attachments,
  ROUND(
    COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE media_url IS NOT NULL AND media_url != ''), 0) * 100,
    2
  ) as coverage_percent
FROM messages;

-- ✓ Esperado: coverage_percent = 100.00
```

### 4.5 Spot Check (Verificação Manual)

```sql
-- Ver 5 exemplos aleatórios
SELECT
  id,
  LEFT(content, 50) as content_preview,
  media_url,
  attachments->0->>'url' as attachment_url,
  attachments->0->>'type' as attachment_type
FROM messages
WHERE media_url IS NOT NULL
  AND media_url != ''
ORDER BY RANDOM()
LIMIT 5;

-- ✓ Verificar que:
--   - media_url == attachment_url
--   - attachment_type está correto (image/video)
```

### ✅ Checkpoint 4
- [ ] Dry-run executado e revisado
- [ ] Backfill executado sem erros
- [ ] Cobertura = 100%
- [ ] Spot check passou
- [ ] Tempo de execução foi razoável

**🔴 Se coverage < 100%**:
```bash
# Investigar mensagens não migradas
psql -U social_selling_user -d social_selling

SELECT id, media_url, attachments
FROM messages
WHERE media_url IS NOT NULL
  AND media_url != ''
  AND (attachments IS NULL OR attachments = '[]'::jsonb)
LIMIT 10;

-- Ver BACKFILL-DEPLOYMENT-GUIDE.md seção "Troubleshooting"
```

---

## 🎯 PASSO 5: Deploy do Frontend

**⏱️ Tempo: 5-10 minutos**
**⚠️ SÓ EXECUTE APÓS BACKFILL COMPLETO (100% coverage)**

### 5.1 Atualizar Código Frontend

```bash
cd /path/to/frontend

# Pull do código mais recente
git fetch origin
git checkout main  # ou master
git pull origin main

# Verificar commit correto
git log -1 --oneline
# ✓ Deve mostrar commit da feature
```

### 5.2 Instalar Dependências

```bash
npm install
# ✓ Sem erros
```

### 5.3 Build do Frontend

```bash
# Build de produção
npm run build

# ✓ Build deve completar sem erros
# ✓ Pasta .next/ ou out/ criada
```

### 5.4 Reiniciar Serviço Frontend

**Opção A: Docker**
```bash
docker-compose build frontend
docker-compose up -d frontend

# Verificar logs
docker-compose logs -f frontend --tail=50
```

**Opção B: PM2**
```bash
pm2 restart frontend
pm2 logs frontend --lines 50
```

**Opção C: Systemd**
```bash
sudo systemctl restart social-selling-frontend
sudo systemctl status social-selling-frontend
```

### 5.5 Verificar Frontend

```bash
# Acessar no browser
# https://your-production-domain.com

# ✓ Site carrega
# ✓ Sem erros no console do browser (F12)
# ✓ Login funciona
```

### ✅ Checkpoint 5
- [ ] Frontend código atualizado
- [ ] Build completado
- [ ] Serviço reiniciado
- [ ] Site acessível
- [ ] Sem erros JavaScript no console

---

## 🎯 PASSO 6: Testes de Fumaça (Smoke Tests)

**⏱️ Tempo: 5-10 minutos**

### 6.1 Testar Mensagens Antigas (Com mediaUrl migrado)

```
1. Login no sistema
2. Ir para Inbox / Mensagens
3. Abrir uma conversa com mensagens antigas (de antes do deploy)
4. ✓ Verificar: Imagens/vídeos antigos APARECEM
5. ✓ Verificar: Não há mensagem de erro "Content unavailable"
6. ✓ Verificar: Pode clicar nas mídias
```

### 6.2 Testar Nova Funcionalidade (Attachments Modal)

```
1. Encontrar mensagem com imagem/vídeo
2. Clicar na thumbnail
3. ✓ Modal abre em tela cheia
4. ✓ Mídia aparece em tamanho grande
5. ✓ Botão X fecha o modal
6. ✓ ESC fecha o modal
7. ✓ Se múltiplos anexos: setas de navegação funcionam
```

### 6.3 Testar Mensagens Respondidas (Reply Context)

```
1. Encontrar mensagem que é resposta (se houver)
2. ✓ Verificar: Aparece box de "Replied to [user]"
3. ✓ Verificar: Mostra preview da mensagem original
4. ✓ Verificar: Se mensagem deletada, mostra mensagem adequada
```

### 6.4 Testar Fallback de Mídia

```
1. Encontrar mensagem com mídia quebrada (URL inválida)
   OU modificar no banco temporariamente:

   UPDATE messages
   SET attachments = jsonb_set(
     attachments,
     '{0,url}',
     '"https://invalid-url-404.jpg"'
   )
   WHERE id = 'ALGUM_ID'
   LIMIT 1;

2. ✓ Verificar: Aparece "Content unavailable" ao invés de erro HTML
3. ✓ Verificar: Layout não quebra
4. ✓ Verificar: Sem erros no console

   (Reverter mudança no banco depois)
```

### 6.5 Testar Performance

```bash
# Verificar tempo de resposta da API
curl -w "@curl-format.txt" -o /dev/null -s \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/messaging/conversations/CONV_ID/messages

# ✓ Tempo total < 500ms (depende do número de mensagens)
```

### ✅ Checkpoint 6
- [ ] Mensagens antigas aparecem corretamente
- [ ] Modal de attachments funciona
- [ ] Reply context funciona (se houver)
- [ ] Fallback de mídia funciona
- [ ] Performance aceitável
- [ ] Sem erros no console do browser
- [ ] Sem erros nos logs do backend

**🔴 Se algum teste falhar**: Ver seção "Rollback de Emergência" abaixo.

---

## 🎯 PASSO 7: Monitoramento (Primeiras 2 horas)

**⏱️ Tempo: 2 horas (passivo)**

### 7.1 Monitorar Logs em Tempo Real

```bash
# Backend logs
docker-compose logs -f backend
# OU
pm2 logs backend

# ✓ Buscar por erros relacionados a:
#   - "attachments"
#   - "replied_to_message_id"
#   - "mediaUrl"

# Frontend logs
docker-compose logs -f frontend
# OU
pm2 logs frontend
```

### 7.2 Monitorar Métricas

```bash
# Taxa de erro (deve permanecer baixa)
# Latência da API (não deve aumentar significativamente)
# Queries ao banco (monitorar queries lentas)

# PostgreSQL: queries lentas
SELECT
  calls,
  mean_exec_time,
  query
FROM pg_stat_statements
WHERE query LIKE '%messages%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 7.3 Feedback dos Usuários

- Monitorar canal de suporte
- Verificar se há relatos de mídia sumida
- Verificar se há relatos de erros

### ✅ Checkpoint 7
- [ ] Sem picos de erros nos logs (primeiros 30 min)
- [ ] Performance estável (primeira 1 hora)
- [ ] Sem reclamações de usuários (primeiras 2 horas)

---

## 🔄 Rollback de Emergência

### Se Algo Der Muito Errado

**⏱️ Tempo: 5-10 minutos**

### Rollback Rápido (Frontend + Backend)

```bash
# 1. PARAR SERVIÇOS
docker-compose stop backend frontend

# 2. VOLTAR CÓDIGO
cd /path/to/backend
git checkout COMMIT_BEFORE_FEATURE
npm run build

cd /path/to/frontend
git checkout COMMIT_BEFORE_FEATURE
npm run build

# 3. REINICIAR
docker-compose up -d backend frontend

# 4. VERIFICAR
curl http://localhost:3000/health
curl http://localhost:3001/
```

### Rollback do Backfill (Se necessário)

```sql
-- Limpar attachments migrados
BEGIN;

UPDATE messages
SET attachments = '[]'::jsonb,
    updated_at = NOW()
WHERE attachments @> '[{"source": "legacy_migration"}]'::jsonb;

COMMIT;

-- Verificar
SELECT COUNT(*) FROM messages WHERE attachments != '[]'::jsonb;
-- ✓ Deve ser 0 (se não havia attachments manuais)
```

### Rollback Completo (Database Restore)

```bash
# Restaurar backup completo
pg_restore -U social_selling_user -d social_selling -c \
  ~/backups/feat-attachments-YYYYMMDD/db_backup_*.dump
```

**Ver `ROLLBACK-PLAN.md` para detalhes completos**

---

## ✅ Critérios de Sucesso

Deploy considerado bem-sucedido quando:

- [x] Backfill executado com 100% de cobertura
- [x] Todos os smoke tests passaram
- [x] Mensagens antigas aparecem corretamente
- [x] Nova funcionalidade (modal) funciona
- [x] Sem erros nos logs (primeiras 2 horas)
- [x] Performance estável
- [x] Sem reclamações de usuários

---

## 📞 Suporte Durante Deploy

### Se Precisar de Ajuda

1. **Consultar Documentação**:
   - `BACKFILL-DEPLOYMENT-GUIDE.md` → Troubleshooting detalhado
   - `ROLLBACK-PLAN.md` → Procedimentos de emergência
   - `README-BACKFILL.md` → Quick reference

2. **Logs para Compartilhar**:
   ```bash
   # Coletar logs para debug
   docker-compose logs backend > backend-logs.txt
   docker-compose logs frontend > frontend-logs.txt

   # Queries no banco
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. **Escalação**:
   - DevOps on-call
   - Backend Lead
   - Database Admin

---

## 📝 Pós-Deploy Checklist

### Após 24 Horas

- [ ] Verificar backfill coverage ainda 100%
- [ ] Revisar logs para padrões de erro
- [ ] Verificar performance não degradou
- [ ] Coletar feedback de usuários

### Após 1 Semana

- [ ] Confirmar feature estável
- [ ] Considerar deprecar `mediaUrl` (futuro)
- [ ] Documentar lições aprendidas

---

## 🎉 Conclusão

Se chegou aqui com todos os checkpoints ✅, **PARABÉNS!**

A feature foi deployada com sucesso em produção! 🚀

---

**Criado**: 2025-11-03
**Feature**: FEAT-2025-20251103111429
**Versão**: 1.0
