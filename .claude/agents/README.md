# 🤖 Framework de Agentes para Entrega Automatizada

Sistema completo de 8 agentes especializados que **automaticamente** analisam, planejam, implementam, testam, revisam e entregam features usando Claude Code.

## 🎯 Visão Geral

Este framework implementa um **workflow completamente automatizado** onde cada agente:
- ✅ Executa sua tarefa especializada
- ✅ Salva artefatos estruturados em `.claude/artifacts/`
- ✅ **Chama automaticamente o próximo agente** no fluxo
- ✅ Tem acesso nativo ao código do projeto
- ✅ Pode executar comandos (npm, git, testes)
- ✅ Funciona em **qualquer projeto** (só copiar os .md)

## 🔄 Fluxo Automatizado

```
┌─────────────────────────────────────────────────────────────┐
│                     USER DESCRIBES FEATURE                   │
│                  "Quero criar sistema de X"                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  01-analyzer.md      │ ─┐
            │  Analisa requisitos  │  │
            └──────────────────────┘  │ Chama automaticamente
                       │              │
                       ▼              │
            ┌──────────────────────┐  │
            │  02-planner.md       │ ─┤
            │  Cria plano técnico  │  │
            └──────────────────────┘  │
                       │              │
                       ▼              │
            ┌──────────────────────┐  │
            │  03-task-creator.md  │ ─┤
            │  Decompõe em tarefas │  │
            └──────────────────────┘  │
                       │              │
                       ▼              │
            ┌──────────────────────┐  │
            │  04-executor.md      │ ─┤  ◄─┐ Loop de
            │  Implementa código   │  │    │ refinamento
            └──────────────────────┘  │    │
                       │              │    │
                       ▼              │    │
            ┌──────────────────────┐  │    │
            │  05-e2e-tester.md    │ ─┤    │
            │  Testa E2E           │  │    │
            └──────────────────────┘  │    │
                       │              │    │
              ┌────────┴────────┐    │    │
              │                 │    │    │
         PASS │                 │ FAIL    │
              │                 │    │    │
              ▼                 ▼    │    │
   ┌──────────────────┐  ┌──────────────────┐
   │ 06-reviewer.md   │  │ 07-refiner.md    │
   │ Code review      │  │ Analisa falhas   │ ─┘
   └──────────────────┘  └──────────────────┘
              │
     ┌────────┴─────────┐
     │                  │
APPROVE               REJECT
     │                  │
     ▼                  │
┌──────────────────┐    │
│ 08-deliverer.md  │    │
│ Prepara PR       │    │
└──────────────────┘    │
     │                  │
     ▼                  ▼
   ✅ FIM           ↺ Refiner → Executor
```

## 🚀 Como Usar

### 1. Copiar Agentes para Qualquer Projeto

```bash
# Copiar todos os agentes
cp -r .claude/agents/* /caminho/para/outro/projeto/.claude/agents/

# Ou criar a estrutura
mkdir -p /caminho/para/outro/projeto/.claude/agents
cp .claude/agents/*.md /caminho/para/outro/projeto/.claude/agents/
```

### 2. Iniciar Workflow

Simplesmente descreva a feature para o Claude Code:

```
Quero criar um sistema de autenticação JWT com refresh tokens,
incluindo endpoints de login, logout, registro e refresh.
Precisa ter:
- Autenticação com JWT
- Refresh tokens armazenados em Redis
- Rate limiting em login
- Testes E2E completos
```

O Analyzer Agent será automaticamente ativado e iniciará o fluxo!

### 3. Acompanhar Progresso

Os artefatos são salvos em:
```
.claude/artifacts/
└── FEAT-2025-XXXXXX/
    ├── 01-analysis/feature-analysis.json
    ├── 02-planning/execution-plan.json
    ├── 03-tasks/tasks.json
    ├── 04-execution/execution-report.json
    ├── 05-testing/test-results.json
    ├── 06-review/review-report.json
    ├── 07-refinement/refinement-plan.json (se necessário)
    └── 08-delivery/delivery-package.json
```

## 📋 Os 8 Agentes

### 1️⃣ Analyzer Agent (`01-analyzer.md`)
**Função**: Analisa feature requests e extrai requisitos estruturados

**Input**: Descrição da feature do usuário
**Output**: `feature-analysis.json` com requisitos funcionais/não-funcionais, impacto, riscos
**Próximo**: Chama automaticamente `@02-planner.md`

**Exemplo de uso**:
```
Quero criar API de upload de arquivos com validação e S3
```

### 2️⃣ Planner Agent (`02-planner.md`)
**Função**: Cria plano de execução técnico detalhado

**Input**: `feature-analysis.json`
**Output**: `execution-plan.json` com arquitetura, componentes, fases
**Próximo**: Chama automaticamente `@03-task-creator.md`

### 3️⃣ Task Creator Agent (`03-task-creator.md`)
**Função**: Decompõe plano em tarefas atômicas (15min-2h cada)

**Input**: `execution-plan.json`
**Output**: `tasks.json` com lista de tarefas, dependências, DoD
**Próximo**: Chama automaticamente `@04-executor.md`

### 4️⃣ Executor Agent (`04-executor.md`)
**Função**: **Implementa o código** baseado nas tarefas

**Input**: `tasks.json` (ou `refinement-plan.json`)
**Output**: `execution-report.json` + código implementado
**Próximo**: Chama automaticamente `@05-e2e-tester.md`

**Este agente literalmente escreve o código!**

### 5️⃣ E2E Tester Agent (`05-e2e-tester.md`)
**Função**: Executa testes E2E e valida implementação

**Input**: `execution-report.json`
**Output**: `test-results.json` com resultados e falhas
**Próximo**:
- Se testes PASSAM → `@06-reviewer.md`
- Se testes FALHAM → `@07-refiner.md`

### 6️⃣ Reviewer Agent (`06-reviewer.md`)
**Função**: Code review automatizado (qualidade, segurança, padrões)

**Input**: `test-results.json`
**Output**: `review-report.json` com score e veredito
**Próximo**:
- Se APPROVED → `@08-deliverer.md`
- Se REJECTED/NEEDS-CHANGES → `@07-refiner.md`

### 7️⃣ Refiner Agent (`07-refiner.md`)
**Função**: Analisa falhas e cria plano de correção

**Input**: `test-results.json` ou `review-report.json`
**Output**: `refinement-plan.json` com ações de correção
**Próximo**: **SEMPRE** volta para `@04-executor.md`

**Este agente cria o loop de refinamento iterativo!**

### 8️⃣ Deliverer Agent (`08-deliverer.md`)
**Função**: Prepara PR e documentação final

**Input**: `review-report.json` (com approved)
**Output**: `delivery-package.json` + PR preparado + documentação
**Próximo**: **FIM DO WORKFLOW** ✅

## 💡 Exemplos de Features

### Exemplo 1: Backend API Simples
```
Quero criar endpoint REST para gerenciar produtos:
- CRUD completo (Create, Read, Update, Delete)
- Validação de dados com DTOs
- Paginação nas listagens
- Testes unitários e E2E
```

### Exemplo 2: Feature Complexa com Integração
```
Implementar integração com Stripe para pagamentos:
- Processar pagamentos via cartão
- Webhooks para status de pagamento
- Gestão de assinaturas recorrentes
- Relatórios de transações
- Testes mockados do Stripe
```

### Exemplo 3: Feature de Segurança
```
Adicionar autenticação de 2 fatores (2FA):
- Gerar QR code com TOTP
- Validar código de 6 dígitos
- Backup codes para recuperação
- Forçar 2FA para usuários admin
- Logs de tentativas de login
```

### Exemplo 4: WebSockets em Tempo Real
```
Sistema de chat em tempo real:
- WebSocket para mensagens instantâneas
- Rooms privadas e grupos
- Indicador "digitando..."
- Histórico de mensagens paginado
- Notificações de mensagens não lidas
```

## 🎨 Customização

### Adaptar para Seu Projeto

Cada agente verifica automaticamente:
- ✅ Estrutura de pastas do projeto
- ✅ Padrões de código existentes
- ✅ Configurações (package.json, tsconfig.json)
- ✅ Arquivos de exemplo (para seguir o mesmo estilo)

### Modificar Comportamento

Você pode editar os `.md` para:
- Ajustar prompts e instruções
- Mudar critérios de aceitação
- Adicionar verificações específicas
- Customizar outputs

### Adicionar Novos Agentes

Basta criar um novo `.md` seguindo o padrão:
```markdown
# Novo Agent

## Quando Executar
...

## Seu Papel
...

## Processo de Execução
...

## Chamar Próximo Agente
@outro-agent.md ...
```

## 📊 Métricas e Rastreabilidade

Cada agente salva métricas:
- ⏱️ Duração de execução
- 📄 Arquivos criados/modificados
- ➕ Linhas adicionadas/removidas
- 🧪 Testes executados
- 🎯 Score de qualidade

## 🔧 Troubleshooting

### Agente não é chamado automaticamente

Verifique se o agente anterior terminou com:
```
@02-planner.md Crie um plano...
```

### Artefatos não são criados

Verifique se a pasta existe:
```bash
mkdir -p .claude/artifacts/FEAT-XXXXXX/
```

### Código não compila

O Executor Agent sempre tenta compilar:
```bash
npm run build
```

Se falhar, o erro será reportado e o Refiner será chamado.

### Testes sempre falham

Verifique:
- Database está rodando? (`docker-compose up`)
- .env está configurado?
- Dependências instaladas? (`npm install`)

### Loop infinito de refinamento

O framework tem limite de iterações (geralmente 3-5).
Se atingir o limite, o workflow para e reporta erro.

## 🎯 Casos de Uso

### ✅ Ideal Para:
- Novas features de backend (APIs REST)
- CRUD completo de entidades
- Integrações com serviços externos
- Implementação de padrões conhecidos
- Features com requisitos bem definidos

### ⚠️ Requer Ajuste Manual Para:
- Features muito complexas (quebrar em partes)
- Mudanças em UI/UX (requer design)
- Refatorações grandes (melhor fazer incremental)
- Código legado sem testes

### ❌ Não Recomendado Para:
- Correções emergenciais (hotfixes)
- Experimentos/POCs rápidos
- Código descartável

## 📚 Estrutura de Artefatos

```json
// feature-analysis.json
{
  "featureId": "FEAT-2025-123456",
  "requirements": {
    "functional": [...],
    "nonFunctional": [...]
  },
  "impact": {...},
  "risks": [...]
}

// execution-plan.json
{
  "planId": "PLAN-2025-123456",
  "architecture": {...},
  "phases": [...],
  "acceptanceCriteria": [...]
}

// tasks.json
{
  "taskSetId": "TASKS-2025-123456",
  "tasks": [...],
  "executionOrder": [...]
}

// execution-report.json
{
  "executionId": "EXEC-2025-123456",
  "results": [...],
  "testResults": {...}
}

// test-results.json
{
  "testResultsId": "TEST-2025-123456",
  "summary": {...},
  "failures": [...],
  "recommendation": "approve | refine"
}

// review-report.json
{
  "reviewId": "REV-2025-123456",
  "summary": {
    "overallScore": 85,
    "verdict": "approved | rejected | needs-changes"
  },
  "codeQuality": {...},
  "security": {...}
}

// refinement-plan.json
{
  "refinementId": "REF-2025-123456",
  "actions": [...],
  "analysis": {...}
}

// delivery-package.json
{
  "deliveryId": "DEL-2025-123456",
  "pullRequest": {...},
  "deploymentNotes": [...]
}
```

## 🎉 Benefícios

### Automação Completa
- 🤖 **Zero intervenção manual** entre agentes
- 🔄 **Loop automático** de refinamento
- 📋 **Rastreabilidade total** de decisões

### Qualidade Consistente
- ✅ **Code review automatizado** sempre executado
- 🧪 **Testes obrigatórios** antes de entregar
- 🔒 **Verificação de segurança** em cada feature

### Produtividade
- ⚡ **Implementação rápida** de features padrão
- 📝 **Documentação automática** gerada
- 🎯 **Foco em requisitos**, não em boilerplate

### Aprendizado
- 📚 Cada artefato documenta decisões técnicas
- 🎓 Padrões consistentes em todo o código
- 🔍 Análise detalhada de cada etapa

## 🚦 Status do Workflow

Monitore através dos artefatos:

```bash
# Ver último artefato criado
ls -lt .claude/artifacts/FEAT-*/*/ | head -1

# Ver status atual
cat .claude/artifacts/FEAT-*/[último-número]-*/[arquivo].json | jq '.recommendation // .verdict // .status'
```

## 🔐 Segurança

Os agentes verificam automaticamente:
- ✅ Vulnerabilidades OWASP Top 10
- ✅ Secrets hardcoded
- ✅ SQL Injection
- ✅ XSS
- ✅ Autenticação/Autorização
- ✅ Rate limiting

## 📈 Próximos Passos

Depois de dominar o framework básico:

1. **Customize os agentes** para seu domínio
2. **Adicione agents específicos** (ex: SecurityAgent, PerformanceAgent)
3. **Integre com CI/CD** para deploy automático
4. **Crie templates** de features comuns
5. **Adicione métricas** e dashboards

## 🆘 Suporte

Para dúvidas ou problemas:
1. Leia os comentários nos arquivos `.md` dos agentes
2. Verifique os artefatos gerados em `.claude/artifacts/`
3. Consulte os logs do Claude Code
4. Crie uma issue no repositório

## 🎊 Parabéns!

Você tem agora um **framework completo de entrega automatizada** que:
- ✅ Analisa requisitos
- ✅ Planeja arquitetura
- ✅ Implementa código
- ✅ Testa automaticamente
- ✅ Revisa qualidade
- ✅ Corrige problemas
- ✅ Entrega PR pronto

**Tudo isso de forma totalmente automatizada!** 🚀

---

**Desenvolvido para Claude Code**
*Framework de Entrega Automatizada v1.0*
