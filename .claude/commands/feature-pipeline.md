---
description: Executa pipeline completo de feature delivery (8 agentes com loops de iteração)
---

# Feature Delivery Pipeline - Execução Completa

Execute o framework completo de entrega de features conforme documentado em `docs/feature-delivery-framework.md`.

## Instruções de Execução

**IMPORTANTE**: Execute TUDO automaticamente sem parar para perguntas. Só interaja com o usuário em caso de erro crítico irrecuperável.

### Feature Request
{{args}}

### Fluxo de Execução

Execute os agentes na seguinte ordem, respeitando os loops de iteração:

#### 1️⃣ Agent 1: Analyzer
- Leia `.claude/agents/01-analyzer.md`
- Execute análise completa da feature fornecida
- Gere FEAT-ID único
- Salve `feature-analysis.json`
- **NÃO pergunte nada, prossiga automaticamente**

#### 2️⃣ Agent 2: Planner
- Leia `.claude/agents/02-planner.md`
- Use o FEAT-ID e `feature-analysis.json` do Agent 1
- Crie plano de execução detalhado
- Salve `execution-plan.json`
- **NÃO pergunte nada, prossiga automaticamente**

#### 3️⃣ Agent 3: Task Creator
- Leia `.claude/agents/03-task-creator.md`
- Use `execution-plan.json` do Agent 2
- Decomponha em tarefas atômicas
- Salve `tasks.json`
- **NÃO pergunte nada, prossiga automaticamente**

#### 4️⃣ Agent 4: Executor (INÍCIO DO LOOP)
- Leia `.claude/agents/04-executor.md`
- Use `tasks.json` do Agent 3 (primeira vez) OU `refinement-actions.json` do Agent 7 (iterações)
- Execute todas as tarefas
- Salve `execution-report.json` em `iteration-N/`
- **NÃO pergunte nada, prossiga automaticamente**

#### 5️⃣ Agent 5: E2E Tester
- Leia `.claude/agents/05-e2e-tester.md`
- Use `execution-report.json` do Agent 4
- Execute testes E2E completos
- Salve `test-results.json` em `iteration-N/`
- **Verifique o status dos testes**:
  - ✅ **Se PASSOU**: prossiga para Agent 6 (Reviewer)
  - ❌ **Se FALHOU**: prossiga para Agent 7 (Refiner)

#### 6️⃣ Agent 6: Reviewer (SE TESTES PASSARAM)
- Leia `.claude/agents/06-reviewer.md`
- Use `test-results.json` e `execution-report.json`
- Revise código, arquitetura, segurança
- Salve `review-report.json` em `iteration-N/`
- **Verifique a decisão do review**:
  - ✅ **Se APROVADO**: prossiga para Agent 8 (Deliverer)
  - ❌ **Se REJEITADO**: prossiga para Agent 7 (Refiner)

#### 7️⃣ Agent 7: Refiner (SE TESTES FALHARAM OU REVIEW REJEITADO)
- Leia `.claude/agents/07-refiner.md`
- Use `test-results.json` (se veio dos testes) OU `review-report.json` (se veio do review)
- Analise falhas e defina ações de refinamento
- Salve `refinement-actions.json` em `refinement-N/`
- **VOLTE para Agent 4 (Executor)** com as ações de refinamento
- **Incremente o número da iteração**
- **LIMITE: máximo 3 iterações de refinamento. Após 3 iterações sem sucesso, PARE e reporte ao usuário**

#### 8️⃣ Agent 8: Deliverer (SE REVIEW APROVADO)
- Leia `.claude/agents/08-deliverer.md`
- Use `review-report.json` aprovado
- Prepare entrega (release notes, PR, checklist)
- Salve `delivery-report.json`
- **Mostre relatório final ao usuário**
- ✅ **FEATURE ENTREGUE COM SUCESSO!**

### Regras de Execução

1. **Automação Total**: Execute cada agente sem parar para confirmação
2. **Loops de Iteração**: Implemente corretamente os loops Agent 7 → Agent 4 → Agent 5 → (Agent 6 ou Agent 7)
3. **Verificação de Status**: Sempre verifique os JSONs gerados para decidir próximo passo
4. **Limite de Iterações**: Máximo 3 refinamentos. Se exceder, reporte ao usuário
5. **Rastreabilidade**: Salve todos os artefatos na estrutura correta:
   ```
   .claude/artifacts/FEAT-ID/
   ├── 01-analysis/feature-analysis.json
   ├── 02-planning/execution-plan.json
   ├── 03-tasks/tasks.json
   ├── 04-execution/
   │   ├── iteration-1/execution-report.json
   │   └── iteration-2/execution-report.json
   ├── 05-testing/
   │   ├── iteration-1/test-results.json
   │   └── iteration-2/test-results.json
   ├── 06-review/
   │   ├── iteration-1/review-report.json
   │   └── iteration-2/review-report.json
   ├── 07-refinement/
   │   ├── refinement-1.json
   │   └── refinement-2.json
   └── 08-delivery/delivery-report.json
   ```
6. **Erros Críticos**: Apenas pare se houver erro irrecuperável (ex: falha de compilação que impede progresso)

### Diagrama de Fluxo Implementado

```
Feature Request
    ↓
Agent 1: Analyzer
    ↓
Agent 2: Planner
    ↓
Agent 3: Task Creator
    ↓
┌───Agent 4: Executor ←──────────────┐
│   ↓                                 │
│ Agent 5: E2E Tester                │
│   ↓                                 │
│   ├─→ Testes OK? ─→ Agent 6: Reviewer
│   │                   ↓             │
│   │                   ├─→ Aprovado? ─→ Agent 8: Deliverer ✅
│   │                   │              │
│   │                   └─→ Rejeitado ─┘
│   │                                 │
│   └─→ Testes FALHOU ────────────────┘
│                                     │
└────── Agent 7: Refiner ─────────────┘
        (max 3 iterações)
```

### Output Final

Ao finalizar, mostre ao usuário:

```
🎉 FEATURE DELIVERY COMPLETA!

📋 Feature: [título]
🆔 Feature ID: [FEAT-ID]
🔄 Iterações: [número]
⏱️ Tempo Total: [tempo]

📊 Resultados:
✅ Testes E2E: [status]
✅ Code Review: [score]
✅ Qualidade: [métricas]

📦 Artefatos Gerados:
- feature-analysis.json
- execution-plan.json
- tasks.json
- execution-report.json (x[N] iterações)
- test-results.json (x[N] iterações)
- review-report.json
- delivery-report.json

📂 Localização: .claude/artifacts/[FEAT-ID]/

🚀 Próximos Passos:
[lista de ações do delivery-report.json]
```

---

**LEMBRE-SE**: Execute TUDO automaticamente. Não pare para perguntas. Implemente os loops corretamente. Só reporte ao usuário quando finalizar ou houver erro crítico irrecuperável após 3 tentativas.
