# 🎯 Guia Prático - Usando o Framework para Stories do Dia a Dia

## 📖 Para Desenvolvedores

Este guia mostra **como usar o framework** no seu trabalho diário, mesmo sem implementar tudo.

---

## 🚀 3 Formas de Usar

### 1️⃣ **Modo Manual** (Hoje mesmo, 0 setup)
Usar Claude/ChatGPT manualmente para cada fase

### 2️⃣ **Modo Script** (30 min de setup)
Usar scripts auxiliares que organizam o processo

### 3️⃣ **Modo Completo** (Implementação futura)
Framework totalmente automatizado

---

## 🎯 Modo 1: Manual com Claude/ChatGPT (RECOMENDADO PARA COMEÇAR)

### Workflow Completo de uma Story

#### **Story Exemplo**: "Adicionar sistema de comentários em posts"

---

### ✅ Fase 1: Análise (5 min)

**Abra Claude/ChatGPT e cole:**

```
Sou desenvolvedor e recebi esta story para implementar:

Story: Adicionar sistema de comentários em posts
Descrição:
- Usuários podem comentar em posts
- Suporte a replies (respostas a comentários)
- Likes em comentários
- Notificações de novos comentários

Projeto: NestJS + TypeORM + PostgreSQL + React

Faça uma análise detalhada:

1. **Requisitos Funcionais** (FR-001, FR-002, etc)
2. **Requisitos Não-Funcionais** (performance, segurança, etc)
3. **Impacto no Sistema** (módulos, arquivos, databases)
4. **Dependências** (outras features, libs externas)
5. **Riscos** e mitigações
6. **Complexidade** (low/medium/high)

Formato a resposta como markdown para eu salvar.
```

**Salve a resposta em**: `.stories/STORY-123/01-analysis.md`

---

### ✅ Fase 2: Planejamento (5 min)

**Cole no Claude:**

```
Com base nesta análise, crie um plano de execução:

[COLE A ANÁLISE AQUI]

Gere:

1. **Arquitetura da Solução**
   - Padrões a usar (Repository, Service, etc)
   - Tecnologias/libs necessárias

2. **Componentes**
   - Backend: controllers, services, entities, DTOs
   - Frontend: components, hooks, contexts
   - Database: tabelas, relações

3. **Fases de Implementação**
   - Fase 1: Database & Entities
   - Fase 2: Backend API
   - Fase 3: Frontend UI
   - Fase 4: Testes & Docs

4. **Critérios de Aceitação** (testáveis)

5. **Estimativa** (horas por fase)
```

**Salve em**: `.stories/STORY-123/02-plan.md`

---

### ✅ Fase 3: Tarefas (5 min)

**Cole no Claude:**

```
Decomponha este plano em tarefas executáveis:

[COLE O PLANO AQUI]

Para cada tarefa, forneça:

- [ ] **TASK-001**: Título descritivo
  - **Descrição**: O que fazer
  - **Arquivos**: Lista de arquivos a criar/modificar
  - **Dependências**: Outras tarefas (se houver)
  - **Estimativa**: Xh
  - **DoD**: Como sei que está pronto

Organize em ordem de execução.
```

**Salve em**: `.stories/STORY-123/03-tasks.md`

---

### ✅ Fase 4: Execução (2-6h)

Agora você tem um guia claro! Execute tarefa por tarefa.

**Dica**: Use **Claude Code** ou **Cursor** para implementar cada tarefa.

**Exemplo**:
```bash
# Tarefa atual: TASK-001 - Criar entidade Comment
# Abra Claude Code e peça:

"Com base nesta tarefa, implemente a entidade Comment:

[COLE A DESCRIÇÃO DA TASK-001]

Arquivos do projeto relevantes:
- src/posts/entities/post.entity.ts (para referência)
- src/users/entities/user.entity.ts (para referência)

Implemente seguindo os padrões do projeto."
```

**À medida que completa, marque no arquivo**:
```markdown
- [x] **TASK-001**: Criar entidade Comment ✅
- [ ] **TASK-002**: Criar CommentService
```

---

### ✅ Fase 5: Testes (30 min)

**Após implementar, cole no Claude:**

```
Criei esta feature de comentários. Preciso de testes E2E:

Feature implementada:
[DESCREVA O QUE FEZ - endpoints, fluxos, etc]

Arquivos principais:
- src/comments/controllers/comment.controller.ts
- src/comments/services/comment.service.ts
- src/comments/entities/comment.entity.ts

Gere:
1. **Testes E2E** completos
2. **Casos edge** a testar
3. **Setup necessário** (fixtures, mocks)

Formato: Jest + Supertest (padrão do projeto)
```

**Implemente os testes sugeridos**.

**Salve resumo em**: `.stories/STORY-123/05-tests.md`

---

### ✅ Fase 6: Code Review (10 min)

**Antes de abrir PR, peça review ao Claude:**

```
Faça um code review desta implementação:

Arquivos principais:
[LISTE OS ARQUIVOS MODIFICADOS]

Analise:
1. **Qualidade do código** (padrões, nomenclatura, etc)
2. **Segurança** (validações, autenticação, etc)
3. **Performance** (queries, N+1, caching)
4. **Testes** (cobertura, casos importantes)
5. **Documentação** (comentários, README)

Aponte:
- ✅ Pontos positivos
- ⚠️ Sugestões de melhoria
- 🔴 Issues críticos (se houver)
```

**Faça ajustes necessários**.

**Salve em**: `.stories/STORY-123/06-review.md`

---

### ✅ Fase 7: Entrega (5 min)

**Gere descrição do PR com Claude:**

```
Gere descrição de Pull Request para:

Story: STORY-123 - Sistema de Comentários

Implementação:
[RESUMO DO QUE FOI FEITO]

Formato:
## 📝 Descrição
[resumo da feature]

## 🎯 Mudanças
- Backend: ...
- Frontend: ...
- Database: ...

## ✅ Testes
- E2E: X testes
- Unitários: Y testes
- Cobertura: Z%

## 📸 Screenshots
[se aplicável]

## 🔗 Links
- Story: [link do Jira/Linear]
- Docs: [se houver]
```

**Use no PR** e pronto! 🎉

---

## 🛠️ Modo 2: Com Scripts (Recomendado)

### Setup Inicial (30 min)

```bash
# 1. Criar diretório para stories
mkdir -p .stories

# 2. Adicionar ao .gitignore (opcional)
echo ".stories/" >> .gitignore

# 3. Configurar Claude API (opcional, mas recomendado)
export ANTHROPIC_API_KEY="sk-ant-seu-key-aqui"

# Adicione ao seu .zshrc ou .bashrc:
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
```

### Uso no Dia a Dia

```bash
# Iniciar nova story
./scripts/story-analyzer.sh "STORY-123" "Adicionar sistema de comentários em posts"

# Acompanhar progresso
./scripts/story-workflow.sh "STORY-123"
```

O script mostra menu interativo:
```
╔════════════════════════════════════════╗
║     Story Workflow - STORY-123
╚════════════════════════════════════════╝

  1) 📊 Ver status
  2) 📝 Ver análise
  3) 📋 Ver plano
  4) ✅ Ver tarefas
  5) 📂 Abrir diretório
  6) 🔄 Gerar plano (com Claude)
  7) 🔄 Gerar tarefas (com Claude)
  8) 📊 Gerar relatório completo
  0) ❌ Sair
```

---

## 💡 Dicas Práticas

### 📝 Templates Úteis

Salve estes prompts em `.prompts/`:

**`.prompts/analyze.txt`**:
```
Analise esta story e extraia requisitos, impacto, dependências e riscos:

Story: {STORY_TITLE}
Descrição: {STORY_DESC}
Projeto: {TECH_STACK}
```

**`.prompts/review.txt`**:
```
Code review focado em: qualidade, segurança, performance.
Arquivos: {FILES}
```

### 🔄 Workflow Simplificado

```bash
# 1. Nova story
mkdir -p .stories/STORY-123
cd .stories/STORY-123

# 2. Análise
claude "Analise story: [descrição]" > 01-analysis.md

# 3. Plano
claude "Com base em $(cat 01-analysis.md), crie plano" > 02-plan.md

# 4. Tarefas
claude "Decomponha $(cat 02-plan.md) em tarefas" > 03-tasks.md

# 5. Implementar (com Claude Code)
# ...

# 6. Review
claude "Review: [arquivos]" > 06-review.md

# 7. PR
claude "Gere descrição PR baseado em .stories/STORY-123/*" > pr-description.md
```

---

## 🎯 Exemplo Real Completo

### Story: "Adicionar filtro de busca por tags"

#### 1. Análise (5 min)
```bash
./scripts/story-analyzer.sh "STORY-456" "Adicionar filtro de busca por tags nos posts"

# Ou manualmente:
claude "Analise story: filtro de busca por tags" > .stories/STORY-456/01-analysis.md
```

**Resultado**: `.stories/STORY-456/01-analysis.md`
- 3 requisitos funcionais
- 2 requisitos não-funcionais
- Impacto: 5 arquivos backend, 3 frontend
- Complexidade: Medium
- Estimativa: 4-6h

#### 2. Plano (5 min)
```bash
./scripts/story-workflow.sh "STORY-456"
# Escolher opção 6 (Gerar plano)

# Ou:
claude "Baseado em $(cat .stories/STORY-456/01-analysis.md), crie plano" > .stories/STORY-456/02-plan.md
```

**Resultado**: Plano com 3 fases, 8 componentes, critérios de aceitação

#### 3. Tarefas (5 min)
```bash
# No menu do story-workflow, opção 7

# Ou:
claude "Decomponha $(cat .stories/STORY-456/02-plan.md) em tarefas" > .stories/STORY-456/03-tasks.md
```

**Resultado**: 12 tarefas ordenadas com DoD

#### 4. Implementação (4h)
```bash
# Usar Claude Code/Cursor para cada tarefa

# Exemplo:
code .stories/STORY-456/03-tasks.md
# Implementar TASK-001, depois TASK-002, etc
```

#### 5. Testes (30 min)
```bash
# Gerar testes
claude "Crie testes E2E para filtro de tags implementado em [arquivos]" > .stories/STORY-456/05-tests.md

# Implementar testes sugeridos
npm run test:e2e
```

#### 6. Review (10 min)
```bash
claude "Review código de [arquivos]" > .stories/STORY-456/06-review.md

# Aplicar sugestões
```

#### 7. PR (5 min)
```bash
# Gerar descrição
./scripts/story-workflow.sh "STORY-456"
# Opção 8 (Relatório completo)

# Usar relatório no PR
```

**Tempo Total**: ~5h30 (vs. 8-10h sem framework) ⚡

---

## 📊 Estrutura Final

```
.stories/
├── STORY-123/
│   ├── 01-analysis.md          ✅
│   ├── 02-plan.md              ✅
│   ├── 03-tasks.md             ✅
│   ├── 04-execution.md         ✅
│   ├── 05-tests.md             ✅
│   ├── 06-review.md            ✅
│   ├── 07-delivery.md          ✅
│   ├── REPORT.md               📊
│   └── metadata.json
├── STORY-456/
│   └── ...
└── STORY-789/
    └── ...
```

---

## 🎓 Benefícios Imediatos

### ✅ Sem framework
- Análise ad-hoc
- Planejamento mental
- Tarefas não documentadas
- Testes incompletos
- Review superficial

**Tempo**: 8-10h | **Qualidade**: Variável

### ✅ Com framework (modo manual)
- ✅ Análise estruturada e salva
- ✅ Plano claro com fases
- ✅ Tarefas documentadas com DoD
- ✅ Testes planejados
- ✅ Review sistemático

**Tempo**: 5-7h | **Qualidade**: Consistente

### 🚀 Com framework completo (futuro)
**Tempo**: 3-5h | **Qualidade**: Excelente

---

## 💡 Próximos Passos

### Hoje
1. ✅ Teste o modo manual com 1 story
2. ✅ Use os scripts auxiliares
3. ✅ Adapte os prompts para seu contexto

### Esta Semana
1. 🔄 Use em 3-5 stories
2. 📝 Refine os prompts
3. 📊 Compare tempo gasto

### Este Mês
1. 🎯 Padronize no time
2. 🛠️ Customize scripts
3. 📈 Meça resultados

### Futuro
1. 🤖 Implemente agentes automáticos
2. 🔗 Integre com Jira/Linear
3. 📊 Dashboard de métricas

---

## 🔗 Integrações Úteis

### Jira/Linear
```bash
# Buscar detalhes da story
jira issue view STORY-123 --plain > .stories/STORY-123/jira.txt

# Atualizar status
jira issue move STORY-123 "In Review"
```

### Git
```bash
# Criar branch da story
git checkout -b feature/STORY-123-comentarios

# Commits organizados
git commit -m "feat(comments): TASK-001 - criar entidade Comment"
```

### Slack
```bash
# Notificar time
slack send "#dev" "🚀 STORY-123 pronta para review"
```

---

## 📞 Precisa de Ajuda?

- **Documentação Completa**: [README-FRAMEWORK.md](./README-FRAMEWORK.md)
- **Scripts**: `./scripts/`
- **Issues**: [GitHub Issues]

---

## 🎯 Checklist Rápido

Para cada story:

```
[ ] 1. Análise (5min) - Requisitos, impacto, riscos
[ ] 2. Plano (5min) - Arquitetura, componentes, fases
[ ] 3. Tarefas (5min) - Lista executável com DoD
[ ] 4. Execução (2-6h) - Implementar seguindo tarefas
[ ] 5. Testes (30min) - E2E, edge cases
[ ] 6. Review (10min) - Qualidade, segurança, performance
[ ] 7. Entrega (5min) - PR com docs completa

Total: 3-7h (vs. 8-12h manual)
```

---

**Comece hoje mesmo! Escolha uma story e siga este guia. 🚀**
