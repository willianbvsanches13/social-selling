# ✅ Solução Completa: Scripts para Desenvolvimento E Produção

## 📌 O Que Foi Feito

Adaptei os scripts de backfill para funcionarem tanto em **desenvolvimento** quanto em **produção**.

### Mudanças Realizadas:

#### 1. **`tsconfig.json`** - Inclusão de Scripts na Compilação
```json
"include": ["src/**/*", "scripts/**/*"],
"exclude": ["node_modules", "dist", "test"]
```
✅ Agora o `npm run build` compila os scripts TypeScript para JavaScript

#### 2. **`package.json`** - Novos Comandos para Produção
```json
"backfill:conversations:prod": "node dist/scripts/backfill-conversations-from-logs.js",
"fix:dates:prod": "node dist/scripts/fix-lastmessageat-dates.js"
```
✅ Comandos `:prod` executam os scripts compilados (sem `ts-node`)

#### 3. **Build Verificado** ✅
```
dist/scripts/
├── backfill-conversations-from-logs.js  ✅
├── fix-lastmessageat-dates.js           ✅
└── simulate-webhooks.js                  ✅
```

---

## 🎯 Como Usar

### 🔵 DESENVOLVIMENTO (Local ou Docker Dev)

```bash
# Correção de datas (seguro - não deleta)
npm run fix:dates

# Backfill completo (deleta e recria tudo)
npm run backfill:conversations

# Ou no Docker
npm run fix:dates:docker
npm run backfill:conversations:docker
```

**Usa**: Arquivos TypeScript (`scripts/*.ts`) com `ts-node`

---

### 🔴 PRODUÇÃO (Container de Produção)

#### Passo 1: Build e Deploy

```bash
# 1. Commit das mudanças
git add backend/tsconfig.json backend/package.json
git commit -m "feat: adicionar suporte para scripts em produção"
git push origin main

# 2. Build (CI/CD ou manual)
npm run build  # Compila scripts para dist/scripts/*.js

# 3. Deploy para produção
# (método varia: Docker, K8s, Cloud Run, etc.)
docker compose build backend --no-cache
docker compose up -d backend
```

#### Passo 2: Executar Scripts

```bash
# ⚠️ SEMPRE fazer backup antes!
docker exec <prod-postgres> pg_dump -U social_selling_user -d social_selling > backup.sql

# Correção de datas (seguro)
docker exec <prod-backend> npm run fix:dates:prod

# Backfill completo (destrutivo)
docker exec <prod-backend> npm run backfill:conversations:prod
```

**Usa**: JavaScript compilado (`dist/scripts/*.js`) com `node`

---

## 📚 Documentação Criada

| Arquivo | Propósito |
|---------|-----------|
| `GUIA_PRODUCAO_BACKFILL.md` | **Guia completo para execução em produção** (backup, rollback, monitoramento) |
| `GUIA_RAPIDO_BACKFILL.md` | Guia rápido para desenvolvimento (Docker) |
| `BACKFILL_AND_DATE_FIX.md` | Documentação técnica detalhada |
| `backend/scripts/README.md` | Referência dos scripts |

---

## 🔄 Comparação: Dev vs Prod

### Desenvolvimento:
```bash
npm run fix:dates
# ↓
ts-node -r tsconfig-paths/register scripts/fix-lastmessageat-dates.ts
# ↓
Executa TypeScript diretamente
```

### Produção:
```bash
npm run fix:dates:prod
# ↓
node dist/scripts/fix-lastmessageat-dates.js
# ↓
Executa JavaScript compilado
```

---

## ✅ Checklist: O Que Está Pronto

### Desenvolvimento ✅
- [x] Scripts TypeScript funcionais
- [x] Comandos npm para dev
- [x] Comandos npm para Docker dev
- [x] Documentação completa

### Produção ✅
- [x] Scripts compilam para JavaScript
- [x] Comandos npm `:prod` criados
- [x] Guia de execução em produção
- [x] Instruções de backup/rollback
- [x] Build testado localmente

---

## 🚀 Próximos Passos

### Para Executar em Desenvolvimento AGORA:

```bash
# 1. Verificar dados atuais
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
"

# 2. Fazer backup (recomendado)
docker exec social-selling-postgres pg_dump -U social_selling_user social_selling > backup_dev.sql

# 3. Executar correção de datas (seguro)
npm run fix:dates:docker

# 4. OU executar backfill completo (deleta tudo)
npm run backfill:conversations:docker
```

### Para Executar em Produção:

**⚠️ LEIA `GUIA_PRODUCAO_BACKFILL.md` COMPLETAMENTE ANTES!**

Resumo:
1. ✅ Fazer build: `npm run build`
2. ✅ Deploy do código atualizado
3. ✅ Testar em staging primeiro
4. ✅ Backup completo: `pg_dump > backup.sql`
5. ✅ Executar: `docker exec <prod-backend> npm run fix:dates:prod`
6. ✅ Validar resultados

---

## 🔍 Validação

### Verificar Scripts Compilados:

```bash
# Localmente
ls -la backend/dist/scripts/

# No container
docker exec social-selling-backend ls -la dist/scripts/
```

Deve mostrar:
```
backfill-conversations-from-logs.js  ✅
fix-lastmessageat-dates.js           ✅
```

### Testar Comando de Produção (Localmente):

```bash
# No diretório backend/
node dist/scripts/fix-lastmessageat-dates.js
```

Se funcionar localmente, funcionará no container de produção.

---

## ⚠️ AVISOS IMPORTANTES

### Para Desenvolvimento:
- ⚠️ `backfill:conversations` **DELETA** todas as conversas e mensagens
- ✅ `fix:dates` é seguro, apenas corrige formato de datas
- 📦 Sempre faça backup antes do backfill

### Para Produção:
- 🚨 **NUNCA execute sem backup completo**
- 🚨 **NUNCA execute em horário de pico**
- 🚨 **SEMPRE teste em staging primeiro**
- 🚨 **Tenha plano de rollback pronto**
- 📖 **Leia `GUIA_PRODUCAO_BACKFILL.md` completamente**

---

## 📊 Comandos de Diagnóstico

### Verificar Webhooks Disponíveis:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT
  COUNT(*) as total_webhooks,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM http_request_logs
WHERE path = '/api/instagram/webhooks'
AND method = 'POST'
AND status_code = 200;
"
```

### Verificar Datas Problemáticas:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*) as problematic_dates
FROM conversations
WHERE last_message_at > '2100-01-01'::timestamptz;
"
```

### Ver Conversas Atuais:

```bash
docker exec -it social-selling-postgres psql -U social_selling_user -d social_selling -c "
SELECT
  participant_username,
  last_message_at,
  unread_count,
  status
FROM conversations
ORDER BY last_message_at DESC NULLS LAST
LIMIT 10;
"
```

---

## 🆘 Troubleshooting

### Erro: "Cannot find module" em Produção

**Causa**: Scripts não foram compilados no build

**Solução**:
```bash
# Rebuild com scripts incluídos
npm run build
docker compose build backend --no-cache
```

### Erro: "ts-node: command not found" em Produção

**Causa**: Tentou usar comando de dev em prod

**Solução**: Use `:prod` em vez de comando normal
```bash
# ❌ Errado
docker exec prod-backend npm run fix:dates

# ✅ Correto
docker exec prod-backend npm run fix:dates:prod
```

### Scripts Não Aparecem em dist/scripts/

**Causa**: `tsconfig.json` não tem `include: ["scripts/**/*"]`

**Solução**: Já aplicada! Verifique se o tsconfig tem:
```json
"include": ["src/**/*", "scripts/**/*"]
```

---

## 📝 Resumo Final

### O Que Mudou:
1. ✅ Scripts agora são compilados para JavaScript
2. ✅ Novos comandos `:prod` para produção
3. ✅ Documentação completa criada
4. ✅ Build testado e funcionando

### Como Usar:
- **Dev**: `npm run fix:dates:docker`
- **Prod**: `npm run fix:dates:prod`

### Próximo Passo:
1. Ler `GUIA_PRODUCAO_BACKFILL.md` se for executar em produção
2. Ou executar agora em dev com `npm run fix:dates:docker`

---

*Criado em: 3 de Novembro de 2025*
