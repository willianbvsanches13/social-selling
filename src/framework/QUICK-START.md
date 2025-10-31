# 🚀 Quick Start - Framework de Entrega Automatizada

Guia rápido para começar a usar o framework em 5 minutos.

## ⚡ Setup Rápido

### 1. Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.framework.example .env

# Edite e adicione sua chave da Anthropic
nano .env
```

Adicione sua chave:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### 2. Instale dependências (se ainda não instalou)

```bash
npm install @anthropic-ai/sdk @nestjs/event-emitter
```

### 3. Importe o módulo no seu app

Edite `src/app.module.ts`:

```typescript
import { FrameworkModule } from './framework/framework.module';

@Module({
  imports: [
    FrameworkModule,  // <-- Adicione esta linha
    // ... outros módulos
  ],
})
export class AppModule {}
```

### 4. Inicie o servidor

```bash
npm run start:dev
```

### 5. Teste o framework!

```bash
# Health check
curl http://localhost:3000/framework/health

# Iniciar uma feature
curl -X POST http://localhost:3000/framework/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Adicionar autenticação JWT",
    "description": "Implementar autenticação usando JWT com refresh tokens, incluindo endpoints de login, logout e refresh",
    "priority": "high",
    "requestedBy": "seu-nome"
  }'
```

## 📋 Exemplos de Features

### Exemplo 1: Nova Feature Backend

```json
{
  "title": "API de upload de arquivos",
  "description": "Criar endpoint para upload de arquivos com validação de tipo, tamanho máximo de 10MB, armazenamento em S3 e geração de URLs pré-assinadas para download",
  "priority": "high",
  "requestedBy": "backend-team"
}
```

### Exemplo 2: Feature de Integração

```json
{
  "title": "Integração com sistema de pagamentos",
  "description": "Integrar com Stripe para processar pagamentos via cartão de crédito, incluindo webhooks para notificações de status, gestão de assinaturas e relatórios de transações",
  "priority": "critical",
  "requestedBy": "payments-team"
}
```

### Exemplo 3: Melhoria de Performance

```json
{
  "title": "Otimizar consultas de dashboard",
  "description": "Implementar cache Redis para queries do dashboard, adicionar índices no banco de dados e implementar paginação para listagens grandes",
  "priority": "medium",
  "requestedBy": "performance-team"
}
```

### Exemplo 4: Feature de Segurança

```json
{
  "title": "Rate limiting e proteção contra ataques",
  "description": "Implementar rate limiting por IP e por usuário, adicionar proteção contra brute force em endpoints de autenticação, e implementar CORS adequado",
  "priority": "critical",
  "requestedBy": "security-team"
}
```

## 🔍 Acompanhando o Progresso

### Verificar status do workflow

```bash
# Substitua FEAT-2025-XXXXXX pelo featureId retornado
curl http://localhost:3000/framework/workflow/FEAT-2025-XXXXXX/status
```

### Ver workflows ativos

```bash
curl http://localhost:3000/framework/workflows/active
```

### Verificar artefatos gerados

```bash
# Listar artefatos
ls -R artifacts/FEAT-2025-XXXXXX/

# Ver análise da feature
cat artifacts/FEAT-2025-XXXXXX/01-analysis/feature-analysis.json

# Ver plano de execução
cat artifacts/FEAT-2025-XXXXXX/02-planning/execution-plan.json

# Ver tarefas criadas
cat artifacts/FEAT-2025-XXXXXX/03-tasks/tasks.json
```

## 📊 Entendendo os Status

| Status | Descrição |
|--------|-----------|
| `running` | Workflow em execução |
| `completed` | Workflow completou com sucesso |
| `failed` | Workflow falhou (verificar logs) |

## 🎯 Agentes e Seus Artefatos

| Agente | Input | Output | Próximo |
|--------|-------|--------|---------|
| **Analyzer** | FeatureRequest | feature-analysis.json | Planner |
| **Planner** | FeatureAnalysis | execution-plan.json | TaskCreator |
| **TaskCreator** | ExecutionPlan | tasks.json | Executor |
| **Executor** | TaskSet | execution-report.json | E2ETester |
| **E2ETester** | ExecutionReport | test-results.json | Reviewer ou Refiner |
| **Reviewer** | TestResults | review-report.json | Deliverer ou Refiner |
| **Refiner** | TestResults/ReviewReport | refinement-plan.json | Executor |
| **Deliverer** | ReviewReport | delivery-package.json | FIM |

## 🛠️ Testando Localmente

### Script de teste completo

Crie um arquivo `test-framework.sh`:

```bash
#!/bin/bash

echo "🚀 Testando Framework de Entrega Automatizada"
echo ""

# 1. Health check
echo "1. Health Check..."
curl -s http://localhost:3000/framework/health | jq
echo ""

# 2. Iniciar workflow
echo "2. Iniciando workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3000/framework/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sistema de cache distribuído",
    "description": "Implementar cache distribuído usando Redis com suporte a invalidação automática, TTL configurável e fallback para memória local",
    "priority": "high",
    "requestedBy": "test-script"
  }')

echo $RESPONSE | jq
FEATURE_ID=$(echo $RESPONSE | jq -r '.featureId')
echo ""
echo "Feature ID: $FEATURE_ID"
echo ""

# 3. Aguardar um pouco
echo "3. Aguardando 5 segundos..."
sleep 5
echo ""

# 4. Verificar status
echo "4. Verificando status..."
curl -s "http://localhost:3000/framework/workflow/$FEATURE_ID/status" | jq
echo ""

# 5. Workflows ativos
echo "5. Workflows ativos:"
curl -s http://localhost:3000/framework/workflows/active | jq
echo ""

echo "✅ Teste completo!"
echo ""
echo "Para acompanhar em tempo real:"
echo "  watch -n 2 \"curl -s http://localhost:3000/framework/workflow/$FEATURE_ID/status | jq '.status, .currentAgent'\""
echo ""
echo "Para ver artefatos:"
echo "  ls -R artifacts/$FEATURE_ID/"
```

Torne executável e rode:

```bash
chmod +x test-framework.sh
./test-framework.sh
```

## 📝 Monitorando em Tempo Real

### Acompanhar status em tempo real

```bash
# Linux/Mac
watch -n 2 'curl -s http://localhost:3000/framework/workflow/FEAT-2025-XXXXXX/status | jq ".status, .currentAgent, .iteration"'

# Ou simplesmente
while true; do
  clear
  curl -s http://localhost:3000/framework/workflow/FEAT-2025-XXXXXX/status | jq
  sleep 3
done
```

### Ver logs em tempo real

```bash
# No terminal onde o NestJS está rodando
npm run start:dev

# Você verá logs como:
# [AnalyzerAgent] [FEAT-2025-123456] Iniciando execução...
# [AnalyzerAgent] Analisando feature: Sistema de cache
# [PlannerAgent] [FEAT-2025-123456] Iniciando execução...
```

## 🎓 Próximos Passos

Após testar o framework básico:

1. **Personalize os prompts** dos agentes em `src/framework/agents/`
2. **Adicione event listeners** para notificações customizadas
3. **Integre com CI/CD** para deploy automático
4. **Configure webhooks** para notificar equipe
5. **Adicione métricas** e dashboards de acompanhamento

## ❓ Problemas Comuns

### Erro: "ANTHROPIC_API_KEY not found"

```bash
# Verifique se o .env está configurado
cat .env | grep ANTHROPIC_API_KEY

# Se não estiver, adicione:
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key-here" >> .env
```

### Workflow não inicia

```bash
# Verifique se o módulo foi importado
grep -r "FrameworkModule" src/app.module.ts

# Verifique logs do servidor
npm run start:dev
```

### Testes falhando

- Normal! O RefinerAgent irá analisar e criar plano de correção
- Verifique `artifacts/FEAT-XXX/07-refinement/refinement-plan.json`
- O workflow automaticamente tentará novamente

### Timeout do Claude

- Aumente `CLAUDE_TIMEOUT` no `.env`
- Verifique conexão com internet
- Verifique limite de rate da API Anthropic

## 🎉 Sucesso!

Você está pronto para usar o framework!

**Dica**: Comece com features pequenas e simples para entender o fluxo, depois passe para features mais complexas.

---

**Precisa de ajuda?** Consulte o [README.md](./README.md) completo ou abra uma issue.
