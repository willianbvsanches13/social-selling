# Framework de Entrega Automatizada de Features

Framework multi-agente automatizado para análise, planejamento, implementação, teste e entrega de features usando Claude AI.

## 🎯 Visão Geral

Este framework implementa um workflow completo de desenvolvimento de features através de 8 agentes especializados que trabalham automaticamente em sequência:

1. **AnalyzerAgent** - Analisa requisitos e extrai informações estruturadas
2. **PlannerAgent** - Cria plano de execução técnico detalhado
3. **TaskCreatorAgent** - Decompõe plano em tarefas atômicas
4. **ExecutorAgent** - Implementa código baseado nas tarefas
5. **E2ETesterAgent** - Executa testes E2E e valida implementação
6. **ReviewerAgent** - Revisa código, segurança e qualidade
7. **RefinerAgent** - Analisa falhas e cria ações de refinamento
8. **DelivererAgent** - Prepara PR e documentação de entrega

## 🏗️ Arquitetura

```
┌─────────────────┐
│ FeatureRequest  │
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │ WorkflowOrchestrator│
    └────┬────────────────┘
         │
         │  Event-Driven Architecture
         │  (agent.completed events)
         │
    ┌────▼──────────────────────────────┐
    │                                   │
    │  Agent Pipeline (automatic)       │
    │                                   │
    │  1. Analyzer  ──► Analysis        │
    │  2. Planner   ──► ExecutionPlan   │
    │  3. TaskCreator ─► TaskSet        │
    │  4. Executor  ──► ExecutionReport │
    │  5. E2ETester ──► TestResults     │
    │       │               │            │
    │       ├──(pass)───────┤            │
    │       │               │            │
    │  6. Reviewer ───► ReviewReport    │
    │       │               │            │
    │       ├──(approved)───┤            │
    │       │               │            │
    │  8. Deliverer ──► DeliveryPackage │
    │       │                            │
    │       └──(fail/reject)─┐           │
    │                        │           │
    │  7. Refiner ──► RefinementPlan    │
    │       │                            │
    │       └───► back to Executor      │
    │                                   │
    └───────────────────────────────────┘
```

## 🚀 Instalação

### 1. Adicionar o módulo ao seu projeto

No seu `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { FrameworkModule } from './framework/framework.module';

@Module({
  imports: [
    FrameworkModule,
    // ... outros módulos
  ],
})
export class AppModule {}
```

### 2. Configurar variáveis de ambiente

Crie ou atualize seu `.env`:

```bash
# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Framework Config
ARTIFACTS_DIR=./artifacts
MAX_ITERATIONS=5
```

### 3. Instalar dependências

```bash
npm install @anthropic-ai/sdk @nestjs/event-emitter
```

## 📡 API Endpoints

### Iniciar Workflow

```bash
POST /framework/workflow/start
Content-Type: application/json

{
  "title": "Sistema de notificações em tempo real",
  "description": "Implementar sistema de notificações push usando WebSockets para alertar usuários sobre eventos importantes como novos comentários, menções e atualizações.",
  "priority": "high",
  "requestedBy": "product-team"
}
```

Resposta:
```json
{
  "success": true,
  "featureId": "FEAT-2025-123456",
  "message": "Workflow iniciado com sucesso",
  "status": "running"
}
```

### Verificar Status

```bash
GET /framework/workflow/FEAT-2025-123456/status
```

Resposta:
```json
{
  "success": true,
  "featureId": "FEAT-2025-123456",
  "status": "running",
  "currentAgent": "ExecutorAgent",
  "iteration": 1,
  "maxIterations": 5,
  "startedAt": "2025-01-15T10:00:00Z",
  "duration": 1234,
  "history": [
    {
      "agentId": "AnalyzerAgent",
      "iteration": 1,
      "success": true,
      "duration": 2500,
      "timestamp": "2025-01-15T10:00:02Z"
    },
    {
      "agentId": "PlannerAgent",
      "iteration": 1,
      "success": true,
      "duration": 3200,
      "timestamp": "2025-01-15T10:00:05Z"
    }
  ],
  "artifacts": {
    "AnalyzerAgent": "FEAT-2025-123456/01-analysis/feature-analysis.json",
    "PlannerAgent": "FEAT-2025-123456/02-planning/execution-plan.json"
  }
}
```

### Listar Workflows Ativos

```bash
GET /framework/workflows/active
```

### Health Check

```bash
GET /framework/health
```

## 📁 Estrutura de Artefatos

Cada workflow gera artefatos em:

```
artifacts/
└── FEAT-2025-123456/
    ├── 01-analysis/
    │   └── feature-analysis.json
    ├── 02-planning/
    │   └── execution-plan.json
    ├── 03-tasks/
    │   └── tasks.json
    ├── 04-execution/
    │   └── execution-report.json
    ├── 05-testing/
    │   └── test-results.json
    ├── 06-review/
    │   └── review-report.json
    ├── 07-refinement/
    │   └── refinement-plan.json (se necessário)
    └── 08-delivery/
        └── delivery-package.json
```

## 🔄 Fluxo de Trabalho

### Fluxo Normal (Sucesso)

1. **FeatureRequest** → Analyzer
2. **FeatureAnalysis** → Planner
3. **ExecutionPlan** → TaskCreator
4. **TaskSet** → Executor
5. **ExecutionReport** → E2ETester
6. **TestResults (passed)** → Reviewer
7. **ReviewReport (approved)** → Deliverer
8. **DeliveryPackage** → FIM ✅

### Fluxo com Refinamento

Quando testes falham ou review rejeita:

1. **TestResults (failed)** → Refiner
   - Analisa falhas
   - Cria RefinementPlan
   - Volta para Executor

2. **ReviewReport (rejected)** → Refiner
   - Analisa problemas de qualidade/segurança
   - Cria RefinementPlan
   - Volta para Executor

O loop de refinamento continua até:
- Testes passarem E review aprovar
- OU atingir MAX_ITERATIONS

## 🎛️ Configuração Avançada

### Customizar Agentes

Você pode estender os agentes para adicionar comportamento customizado:

```typescript
import { Injectable } from '@nestjs/common';
import { ExecutorAgent } from './framework/agents/04-executor.agent';

@Injectable()
export class CustomExecutorAgent extends ExecutorAgent {
  protected async process(input: TaskSet, context: AgentContext): Promise<ExecutionReport> {
    // Sua lógica customizada aqui

    // Chamar implementação base
    return await super.process(input, context);
  }
}
```

### Event Listeners

Você pode escutar eventos do workflow:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class WorkflowListener {
  @OnEvent('agent.completed')
  handleAgentCompleted(payload: any) {
    console.log(`Agent ${payload.agentId} completou para ${payload.featureId}`);
  }

  @OnEvent('workflow.completed')
  handleWorkflowCompleted(payload: any) {
    console.log(`Workflow ${payload.featureId} completou com sucesso!`);
    // Enviar notificação, atualizar dashboard, etc.
  }

  @OnEvent('workflow.failed')
  handleWorkflowFailed(payload: any) {
    console.error(`Workflow ${payload.featureId} falhou: ${payload.error}`);
    // Alertar equipe, criar ticket, etc.
  }
}
```

## 🧪 Exemplo de Uso

### Via API

```bash
# Iniciar workflow
curl -X POST http://localhost:3000/framework/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API de notificações push",
    "description": "Criar endpoint REST para envio de notificações push via Firebase Cloud Messaging",
    "priority": "high",
    "requestedBy": "mobile-team"
  }'

# Verificar progresso
curl http://localhost:3000/framework/workflow/FEAT-2025-123456/status
```

### Via Código

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowOrchestrator } from './framework/orchestrator/workflow-orchestrator';
import { FeatureRequest } from './framework/types/agent-types';

@Injectable()
export class FeatureService {
  constructor(private readonly orchestrator: WorkflowOrchestrator) {}

  async createFeature(title: string, description: string) {
    const request: FeatureRequest = {
      title,
      description,
      priority: 'medium',
      requestedBy: 'api-user',
    };

    const featureId = await this.orchestrator.startWorkflow(request);

    return { featureId };
  }

  async getFeatureStatus(featureId: string) {
    return this.orchestrator.getWorkflowStatus(featureId);
  }
}
```

## 📊 Monitoramento

### Logs

Cada agente gera logs detalhados:

```
[AnalyzerAgent] [FEAT-2025-123456] Iniciando execução (iteração 1)...
[AnalyzerAgent] Analisando feature: API de notificações push
[AnalyzerAgent] [FEAT-2025-123456] Concluído em 2500ms. Próximo: PlannerAgent
[WorkflowOrchestrator] [FEAT-2025-123456] AnalyzerAgent completou. Próximo: PlannerAgent
```

### Métricas

- Duração total do workflow
- Duração por agente
- Taxa de sucesso/falha
- Número de iterações de refinamento
- Cobertura de testes
- Score de code review

## 🛠️ Troubleshooting

### Workflow travado

```bash
# Verificar workflows ativos
curl http://localhost:3000/framework/workflows/active

# Verificar logs do agente atual
# Logs estarão em console.log ou seu sistema de logging
```

### Claude API Errors

- Verificar `ANTHROPIC_API_KEY` configurada
- Verificar limite de rate da API
- Verificar conectividade de rede

### Testes falhando repetidamente

- Verificar se `MAX_ITERATIONS` não foi atingido
- Analisar `refinement-plan.json` para ver ações sugeridas
- Verificar logs do RefinerAgent

## 🔐 Segurança

- **API Keys**: Nunca commitar `ANTHROPIC_API_KEY` no código
- **Input Validation**: Todos os DTOs são validados
- **Rate Limiting**: Considere adicionar rate limiting nos endpoints
- **Authentication**: Adicione autenticação nos endpoints de produção

## 📝 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ usando Claude AI e NestJS**
