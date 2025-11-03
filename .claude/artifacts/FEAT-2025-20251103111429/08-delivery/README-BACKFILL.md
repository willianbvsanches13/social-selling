# ⚠️ ATENÇÃO: Backfill Obrigatório!

## Feature: Message Attachments Migration

Esta feature **REQUER** execução de backfill para migrar dados existentes de `mediaUrl` → `attachments`.

---

## 🚨 CRÍTICO: Ordem de Deploy

```
✅ CORRETO:
1. Deploy backend
2. Executar migration 039 (add columns)
3. Executar backfill 040 (migrate data) ← CRÍTICO
4. Deploy frontend

❌ ERRADO:
1. Deploy frontend ANTES do backfill
   → Resultado: Todas as mídias antigas DESAPARECEM
```

---

## 📚 Documentação Completa

### 1. **BACKFILL-DEPLOYMENT-GUIDE.md** (LEIA PRIMEIRO!)
Guia completo com:
- Instruções passo-a-passo
- Opções de execução (SQL vs TypeScript)
- Comandos prontos para copiar
- Verificação de sucesso
- Troubleshooting

### 2. **ROLLBACK-PLAN.md** (Para emergências)
Plano de rollback se algo der errado:
- Rollback rápido (5 min)
- Rollback completo (10 min)
- Restauração de backup

### 3. **deployment-checklist.md** (Checklist oficial)
Seção "⚠️ CRITICAL: Data Backfill" atualizada com todos os passos

---

## ⚡ Quick Start

### Preview (Não faz mudanças)
```bash
npm run backfill:attachments -- --dry-run
```

### Executar Backfill
```bash
# Opção 1: SQL (recomendado para produção)
psql -U social_selling_user -d social_selling \
  -f backend/migrations/040-backfill-attachments-from-mediaurl.sql

# Opção 2: TypeScript (com mais feedback)
npm run backfill:attachments
```

### Verificar Sucesso
```sql
SELECT
  COUNT(*) FILTER (WHERE media_url IS NOT NULL) as with_media,
  COUNT(*) FILTER (WHERE attachments != '[]'::jsonb) as with_attachments
FROM messages;
-- Espera-se: with_media = with_attachments (100% coverage)
```

---

## ⏱️ Tempo Estimado

| Mensagens | Tempo |
|-----------|-------|
| 10,000 | ~3 segundos |
| 100,000 | ~30 segundos |
| 1,000,000 | ~5 minutos |

---

## 📞 Suporte

**Problemas?** Consulte:
1. BACKFILL-DEPLOYMENT-GUIDE.md → Seção "Troubleshooting"
2. ROLLBACK-PLAN.md → Se precisar reverter
3. DevOps team → Em caso de emergência

---

## ✅ Checklist Rápido

Antes de deploy de produção:

- [ ] Backfill testado em staging
- [ ] 100% de cobertura verificado
- [ ] Rollback testado em staging
- [ ] Backup de produção criado
- [ ] Equipe notificada
- [ ] Plano de rollback revisado
- [ ] Backfill executado em produção
- [ ] Frontend deploy SOMENTE após backfill

---

**Feature ID**: FEAT-2025-20251103111429
**Criado**: 2025-11-03
**Autor**: Feature Delivery Pipeline
