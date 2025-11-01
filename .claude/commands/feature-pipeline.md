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
- Salve `_index.json` e arquivos `TASK-XXX.json` individuais
- **NÃO pergunte nada, prossiga automaticamente**

#### 4️⃣ Loop Por Task (PARALELIZAÇÃO)

**IMPORTANTE**: A partir daqui, execute o fluxo PARA CADA TASK individualmente, seguindo a ordem do `executionOrder` em `_index.json`.

**Para cada TASK-XXX.json:**

##### 4.1️⃣ Agent 4: Executor (INÍCIO DO LOOP DA TASK)
- Leia `.claude/agents/04-executor.md`
- Use `TASK-XXX.json` (primeira vez) OU `refinement-actions.json` (iterações)
- Execute APENAS essa task específica
- Salve `execution-report.json` em `04-execution/TASK-XXX/iteration-N/`
- **NÃO pergunte nada, prossiga automaticamente**

##### 4.2️⃣ Agent 5: E2E Tester
- Leia `.claude/agents/05-e2e-tester.md`
- Use `execution-report.json` da task atual
- Execute testes E2E específicos da task
- Salve `test-results.json` em `05-testing/TASK-XXX/iteration-N/`
- **Verifique o status dos testes**:
  - ✅ **Se PASSOU**: prossiga para Agent 6 (Reviewer)
  - ❌ **Se FALHOU**: prossiga para Agent 7 (Refiner)

##### 4.3️⃣ Agent 6: Reviewer (SE TESTES PASSARAM)
- Leia `.claude/agents/06-reviewer.md`
- Use `test-results.json` e `execution-report.json` da task atual
- Revise código, arquitetura, segurança DESSA TASK
- Salve `review-report.json` em `06-review/TASK-XXX/iteration-N/`
- **Verifique a decisão do review**:
  - ✅ **Se APROVADO**: marque task como COMPLETA e prossiga para próxima task
  - ❌ **Se REJEITADO**: prossiga para Agent 7 (Refiner)

##### 4.4️⃣ Agent 7: Refiner (SE TESTES FALHARAM OU REVIEW REJEITADO)
- Leia `.claude/agents/07-refiner.md`
- Use `test-results.json` (se veio dos testes) OU `review-report.json` (se veio do review)
- Analise falhas e defina ações de refinamento PARA ESSA TASK
- Salve `refinement-actions.json` em `07-refinement/TASK-XXX/refinement-N.json`
- **VOLTE para Agent 4 (Executor)** com as ações de refinamento DESSA TASK
- **Incremente o número da iteração**
- **LIMITE: máximo 3 iterações de refinamento POR TASK. Após 3 iterações sem sucesso, MARQUE A TASK COMO FALHADA e prossiga para próxima task**

**Repita o loop 4.1 → 4.2 → 4.3 → (4.4 se necessário) para TODAS as tasks até que todas estejam COMPLETAS ou FALHADAS.**

#### 5️⃣ Agent 8: Deliverer (QUANDO TODAS AS TASKS ESTIVEREM PROCESSADAS)
- Leia `.claude/agents/08-deliverer.md`
- Use todos os `review-report.json` aprovados de todas as tasks
- Consolide resultados de todas as tasks
- Prepare entrega (release notes, PR, checklist)
- Salve `delivery-report.json`
- **Mostre relatório final ao usuário**
- ✅ **FEATURE ENTREGUE COM SUCESSO!**

### Regras de Execução

1. **Automação Total**: Execute cada agente sem parar para confirmação
2. **Processamento Por Task**: Processe cada task individualmente seguindo a ordem do `executionOrder` em `_index.json`
3. **Loops de Iteração Por Task**: Cada task tem seu próprio loop: Executor → Tester → Reviewer → (Refiner se necessário)
4. **Verificação de Status**: Sempre verifique os JSONs gerados para decidir próximo passo
5. **Limite de Iterações**: Máximo 3 refinamentos POR TASK. Se exceder, marque task como FALHADA e prossiga
6. **Rastreabilidade**: Salve todos os artefatos na estrutura correta:
   ```
   .claude/artifacts/FEAT-ID/
   ├── 01-analysis/
   │   └── feature-analysis.json
   ├── 02-planning/
   │   └── execution-plan.json
   ├── 03-tasks/
   │   ├── _index.json
   │   ├── TASK-001.json
   │   ├── TASK-002.json
   │   └── TASK-XXX.json
   ├── 04-execution/
   │   ├── TASK-001/
   │   │   ├── iteration-1/execution-report.json
   │   │   └── iteration-2/execution-report.json
   │   ├── TASK-002/
   │   │   └── iteration-1/execution-report.json
   │   └── TASK-XXX/
   ├── 05-testing/
   │   ├── TASK-001/
   │   │   ├── iteration-1/test-results.json
   │   │   └── iteration-2/test-results.json
   │   ├── TASK-002/
   │   │   └── iteration-1/test-results.json
   │   └── TASK-XXX/
   ├── 06-review/
   │   ├── TASK-001/
   │   │   ├── iteration-1/review-report.json
   │   │   └── iteration-2/review-report.json
   │   ├── TASK-002/
   │   │   └── iteration-1/review-report.json
   │   └── TASK-XXX/
   ├── 07-refinement/
   │   ├── TASK-001/
   │   │   ├── refinement-1.json
   │   │   └── refinement-2.json
   │   ├── TASK-002/
   │   └── TASK-XXX/
   └── 08-delivery/
       └── delivery-report.json
   ```
7. **Erros Críticos**: Apenas pare se houver erro irrecuperável (ex: falha de compilação que impede progresso)
8. **Isolamento de Tasks**: Cada task é processada de forma isolada com seu próprio ciclo de vida completo

### Diagrama de Fluxo Implementado

```
Feature Request
    ↓
Agent 1: Analyzer
    ↓
Agent 2: Planner
    ↓
Agent 3: Task Creator → Gera TASK-001, TASK-002, TASK-XXX...
    ↓
┌─────────────── PARA CADA TASK ───────────────┐
│                                               │
│  ┌───Agent 4: Executor ←──────────────┐      │
│  │   (executa TASK-XXX)                │      │
│  │   ↓                                 │      │
│  │ Agent 5: E2E Tester                │      │
│  │   (testa TASK-XXX)                  │      │
│  │   ↓                                 │      │
│  │   ├─→ OK? ─→ Agent 6: Reviewer     │      │
│  │   │          (revisa TASK-XXX)      │      │
│  │   │          ↓                      │      │
│  │   │          ├─→ Aprovado? ─────────┼──┐   │
│  │   │          │   Task COMPLETA      │  │   │
│  │   │          │                      │  │   │
│  │   │          └─→ Rejeitado ─────────┘  │   │
│  │   │                                    │   │
│  │   └─→ FALHOU ──────────────────────────┘   │
│  │                                            │
│  └────── Agent 7: Refiner ───────────────────┘
│          (max 3 iterações POR TASK)           │
│                                               │
└──────────────────────────────────────────────┘
              Próxima Task
                  ↓
          Todas Tasks Completas?
                  ↓
        Agent 8: Deliverer ✅
```

### Output Final

Ao finalizar, mostre ao usuário:

```
🎉 FEATURE DELIVERY COMPLETA!

📋 Feature: [título]
🆔 Feature ID: [FEAT-ID]
📝 Total Tasks: [número]
⏱️ Tempo Total: [tempo]

📊 Resultados Por Task:
┌─────────────┬──────────┬───────────┬──────────┐
│ Task ID     │ Status   │ Iterações │ Review   │
├─────────────┼──────────┼───────────┼──────────┤
│ TASK-001    │ ✅ PASS  │ 1         │ Aprovado │
│ TASK-002    │ ✅ PASS  │ 2         │ Aprovado │
│ TASK-003    │ ⚠️ FAIL │ 3         │ Rejeitado│
│ TASK-XXX    │ ✅ PASS  │ 1         │ Aprovado │
└─────────────┴──────────┴───────────┴──────────┘

📈 Resumo Geral:
✅ Tasks Completas: [N] / [Total]
⚠️ Tasks Falhadas: [N] / [Total]
🔄 Total Iterações: [soma de todas]
✅ Taxa de Sucesso: [%]

📦 Artefatos Gerados:
- feature-analysis.json
- execution-plan.json
- _index.json + [N] TASK-XXX.json
- execution-report.json (por task/iteração)
- test-results.json (por task/iteração)
- review-report.json (por task/iteração)
- refinement-N.json (quando aplicável)
- delivery-report.json

📂 Localização: .claude/artifacts/[FEAT-ID]/

🚀 Próximos Passos:
[lista de ações do delivery-report.json]

⚠️ Tasks Falhadas (se houver):
[lista de tasks que falharam após 3 tentativas com motivos]
```

---

**LEMBRE-SE**:
- Execute TUDO automaticamente. Não pare para perguntas.
- Processe cada task individualmente com seu próprio ciclo de vida
- Implemente os loops corretamente POR TASK
- Se uma task falhar após 3 tentativas, marque como FALHADA e prossiga
- Só reporte ao usuário quando TODAS as tasks forem processadas ou houver erro crítico irrecuperável
