# 📘 Exemplo Completo de Uso do Framework

Este documento mostra um exemplo real e completo de como usar o framework de agentes para criar uma feature do início ao fim.

## 🎯 Feature Example: Sistema de Comentários

Vamos implementar um sistema completo de comentários em posts, com todas as etapas automatizadas.

---

## Passo 1: Usuário Descreve a Feature

**Você (usuário) fala para o Claude Code:**

```
Quero criar um sistema de comentários para posts com as seguintes funcionalidades:

1. Usuários autenticados podem comentar em posts
2. Comentários podem ter respostas (nested comments)
3. Usuário pode editar e deletar apenas seus próprios comentários
4. Listagem de comentários paginada
5. Contador de comentários por post
6. Notificação quando alguém responde seu comentário

Tecnologias:
- Backend: NestJS + TypeORM
- Database: PostgreSQL
- Testes: Jest + Supertest

Requisitos de segurança:
- Autenticação JWT obrigatória
- Validação de ownership
- Rate limiting em criação de comentários
```

---

## Passo 2: Analyzer Agent Inicia Automaticamente

O Analyzer Agent detecta a descrição e começa o processo:

```
✅ Análise Completa!

📋 Feature: Sistema de Comentários em Posts
🎯 Categoria: new-feature
⚠️ Complexidade: medium

📦 Requisitos Funcionais: 6 identificados
  RF-001: Usuário autenticado pode comentar em posts
  RF-002: Comentários podem ter respostas (nested)
  RF-003: CRUD de comentários com ownership
  RF-004: Listagem paginada de comentários
  RF-005: Contador de comentários por post
  RF-006: Notificações de respostas

🔒 Requisitos Não-Funcionais: 3 identificados
  NFR-001: Performance - Listagem < 200ms
  NFR-002: Security - JWT + ownership validation
  NFR-003: Scalability - Paginação obrigatória

📂 Módulos Afetados:
  - comments (novo)
  - posts (modificar para contador)
  - notifications (integrar)
  - users (relacionamento)

⚡ Riscos:
  [MEDIUM] Nested comments podem impactar performance
  [LOW] Notificações podem gerar carga adicional

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/01-analysis/feature-analysis.json

➡️ Próximo: Chamar Planner Agent para criar plano de execução...
```

**O Analyzer automaticamente chama:** `@02-planner.md`

---

## Passo 3: Planner Agent Cria o Plano

```
✅ Plano de Execução Criado!

🏗️ Arquitetura: Modular Monolith
📐 Padrões: Repository, Service, DTO, Nested Relations
📦 Componentes: 12 identificados

  Database:
    - Comment entity com self-reference (parentId)
    - Migration para tabela comments
    - Índices em postId, userId, parentId

  Backend:
    - CommentService (CRUD + nested logic)
    - CommentRepository (TypeORM)
    - CommentController (REST API)
    - CreateCommentDto, UpdateCommentDto

  Integration:
    - PostService (adicionar contador)
    - NotificationService (notificar respostas)

  Security:
    - JwtAuthGuard (todas as rotas)
    - OwnershipGuard (edit/delete)
    - Throttle (rate limiting)

📅 Fases: 5 planejadas
  P1: Database & Entities (2h)
  P2: Backend Services (4h)
  P3: Backend Controllers (2h)
  P4: Integration & Notifications (2h)
  P5: Tests & Documentation (3h)

⏱️ Estimativa Total: 13 horas

✅ Critérios de Aceitação: 6 definidos

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/02-planning/execution-plan.json

➡️ Próximo: Chamar Task Creator Agent...
```

**O Planner automaticamente chama:** `@03-task-creator.md`

---

## Passo 4: Task Creator Decompõe em Tarefas

```
✅ Tarefas Criadas!

📋 Total de Tarefas: 18
📊 Por Categoria:
  - Database: 2 tarefas
  - Backend: 8 tarefas
  - Integration: 3 tarefas
  - Testing: 4 tarefas
  - Documentation: 1 tarefa

⚡ Por Prioridade:
  - Critical: 3 tarefas
  - High: 8 tarefas
  - Medium: 5 tarefas
  - Low: 2 tarefas

⏱️ Estimativa Total: 13.5 horas

📝 Primeiras 5 Tarefas:
  1. TASK-001 [CRITICAL]: Criar migration para tabela comments (30min)
  2. TASK-002 [CRITICAL]: Criar entity Comment com self-reference (45min)
  3. TASK-003 [HIGH]: Criar CreateCommentDto com validações (30min)
  4. TASK-004 [HIGH]: Criar CommentRepository (30min)
  5. TASK-005 [HIGH]: Implementar CommentService - método create (60min)

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/03-tasks/tasks.json

➡️ Próximo: Chamar Executor Agent para implementar...
```

**O Task Creator automaticamente chama:** `@04-executor.md`

---

## Passo 5: Executor Implementa o Código

**O Executor começa a implementar automaticamente:**

```
🚀 Iniciando Implementação...

TASK-001: Criar migration para tabela comments
✅ Arquivo criado: src/database/migrations/1705334567890-CreateCommentsTable.ts
✅ Migration com campos: id, postId, userId, parentId, content, createdAt, updatedAt
✅ Índices criados em: postId, userId, parentId
✅ Foreign keys configuradas

TASK-002: Criar entity Comment
✅ Arquivo criado: src/comments/entities/comment.entity.ts
✅ Self-reference configurada (parent/children)
✅ Relacionamentos com Post e User

TASK-003: Criar CreateCommentDto
✅ Arquivo criado: src/comments/dto/create-comment.dto.ts
✅ Validações: @IsNotEmpty(), @MaxLength(1000)
✅ Swagger decorators adicionados

... (continua implementando as 18 tarefas)

TASK-018: Atualizar README com API de comentários
✅ README.md atualizado com exemplos

📊 Estatísticas de Implementação:
  - Tarefas completadas: 18/18
  - Arquivos criados: 15
  - Arquivos modificados: 3
  - Linhas adicionadas: 1,245
  - Linhas removidas: 8

🧪 Executando Testes Unitários...
npm run test

  CommentService
    ✓ should create a comment
    ✓ should find all comments by post
    ✓ should find nested comments
    ✓ should update own comment
    ✓ should not update other user comment
    ✓ should delete own comment
    ✓ should not delete other user comment

  CommentController
    ✓ should handle create request
    ✓ should handle list request
    ✓ should handle update request
    ✓ should handle delete request

Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total

✅ Testes Unitários: PASSED

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/04-execution/execution-report.json

➡️ Próximo: Chamar E2E Tester Agent...
```

**O Executor automaticamente chama:** `@05-e2e-tester.md`

---

## Passo 6: E2E Tester Valida a Implementação

```
🧪 Executando Testes E2E...

npm run test:e2e

  CommentsController (e2e)
    POST /posts/:postId/comments
      ✓ should create a comment (145ms)
      ✓ should return 401 without auth token (52ms)
      ✓ should validate content length (89ms)

    GET /posts/:postId/comments
      ✓ should list comments paginated (123ms)
      ✓ should return nested comments (156ms)
      ✓ should return empty array for post without comments (67ms)

    PUT /comments/:id
      ✓ should update own comment (98ms)
      ✓ should return 403 for other user comment (71ms)

    DELETE /comments/:id
      ✓ should delete own comment (87ms)
      ✓ should return 403 for other user comment (69ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total

✅ Todos os Testes E2E Passaram!

📈 Cobertura de Código:
  - Statements: 91.2%
  - Branches: 87.5%
  - Functions: 93.0%
  - Lines: 91.2%

✅ Recomendação: APPROVE

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/05-testing/test-results.json

➡️ Próximo: Chamar Reviewer Agent para code review...
```

**O Tester automaticamente chama:** `@06-reviewer.md`

---

## Passo 7: Reviewer Faz Code Review

```
🔍 Executando Code Review...

npm run lint
✅ Nenhum erro de lint encontrado

📊 Análise de Código:

🔍 Qualidade de Código: 88/100
  ✅ Tipagem TypeScript explícita em todos os arquivos
  ✅ Funções com média de 15 linhas (ótimo)
  ✅ Nomenclatura clara e consistente
  ⚠️ 1 warning: CommentService.findNested() poderia ser otimizado

🔒 Segurança: 95/100
  ✅ JWT Auth Guard aplicado em todas as rotas
  ✅ Ownership validation implementada
  ✅ Input validation com DTOs
  ✅ Rate limiting configurado
  ✅ Nenhuma vulnerabilidade encontrada

📐 Padrões: 90/100
  ✅ Estrutura de arquivos correta
  ✅ Dependency Injection usado corretamente
  ✅ DTOs para input/output
  ✅ Repository Pattern seguido

📝 Documentação: 85/100
  ✅ JSDoc em métodos públicos
  ✅ Swagger decorators em endpoints
  ✅ README atualizado
  ⚠️ Poderia ter mais exemplos de uso

📊 Score Geral: 89/100

💡 Recomendações:
  1. Otimizar query recursiva em findNested()
  2. Adicionar mais exemplos no README
  3. Considerar cache para listagem de comentários

✅ Veredito: APPROVED

Motivo: Score acima de 80, nenhum problema crítico, testes passando.

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/06-review/review-report.json

➡️ Próximo: Chamar Deliverer Agent para preparar entrega...
```

**O Reviewer automaticamente chama:** `@08-deliverer.md`

---

## Passo 8: Deliverer Prepara a Entrega

```
📦 Preparando Entrega...

🌿 Criando branch feature/feat-2025-123456...
✅ Branch criada e checked out

📝 Organizando commits...
✅ Commit criado: "feat: implement comments system with nested replies"

   Files changed: 18
   Insertions: 1,245
   Deletions: 8

📚 Gerando documentação...
✅ docs/features/FEAT-2025-123456.md criado

📝 Preparando Pull Request...
✅ pr-description.md criado

🚀 Enviando para remote...
✅ git push -u origin feature/feat-2025-123456

🎉 Feature Entregue com Sucesso!

📦 Delivery Package: DEL-2025-123456

📊 Resumo da Entrega:
  - Arquivos criados/modificados: 18
  - Linhas adicionadas: 1,245
  - Linhas removidas: 8
  - Testes adicionados: 21 (100% passando)
  - Cobertura: 91.2%
  - Code Review Score: 89/100

✅ Deliverables:
  ✓ Código implementado e testado
  ✓ Migrations criadas
  ✓ Testes unitários e E2E passando
  ✓ Documentação completa
  ✓ PR preparado

🌿 Git:
  Branch: feature/feat-2025-123456
  Commits: 1
  Status: Pushed ✓

📝 Pull Request:
  Título: feat: Implement Comments System with Nested Replies
  Status: Ready for Review

  Para criar o PR, execute:
  gh pr create --title "feat: Implement Comments System" \
    --body-file pr-description.md

📚 Documentação:
  ✓ docs/features/FEAT-2025-123456.md
  ✓ pr-description.md
  ✓ JSDoc em código
  ✓ Swagger decorators

🚀 Deployment Notes:
  ⚠️ Executar: npm run migration:run
  ✅ Nenhuma env var nova necessária

📋 Próximos Passos Manuais:
  1. ✅ Revisar PR manualmente
  2. 🧪 Testar em staging
  3. ✓ Validar critérios de aceitação
  4. 🔀 Merge para main
  5. 🚀 Deploy para produção
  6. 📊 Monitorar métricas
  7. 📢 Comunicar time

📄 Artefato salvo em:
.claude/artifacts/FEAT-2025-123456/08-delivery/delivery-package.json

🎊 WORKFLOW COMPLETO! Feature pronta para merge! 🎊

═══════════════════════════════════════════════════
  FEATURE COMPLETA EM ~13 HORAS (ESTIMADO)
  IMPLEMENTADA AUTOMATICAMENTE PELO FRAMEWORK
═══════════════════════════════════════════════════
```

---

## 📊 Resumo do Workflow Completo

### Tempo Total
- **Estimado**: 13 horas
- **Execução do Framework**: ~5-10 minutos (análise + chamadas de agentes)
- **Implementação real**: Depende da complexidade, mas framework guia todo o processo

### Artefatos Gerados

```
.claude/artifacts/FEAT-2025-123456/
├── 01-analysis/
│   └── feature-analysis.json          (Requisitos e análise)
├── 02-planning/
│   └── execution-plan.json            (Plano técnico)
├── 03-tasks/
│   └── tasks.json                     (18 tarefas atômicas)
├── 04-execution/
│   └── execution-report.json          (Resultado da implementação)
├── 05-testing/
│   └── test-results.json              (Resultados dos testes)
├── 06-review/
│   └── review-report.json             (Code review)
└── 08-delivery/
    └── delivery-package.json          (Pacote de entrega)
```

### Código Gerado

```
src/comments/
├── entities/
│   └── comment.entity.ts
├── dto/
│   ├── create-comment.dto.ts
│   ├── update-comment.dto.ts
│   └── comment-response.dto.ts
├── services/
│   └── comment.service.ts
├── controllers/
│   └── comment.controller.ts
├── guards/
│   └── comment-ownership.guard.ts
├── comment.module.ts
└── __tests__/
    ├── comment.service.spec.ts
    └── comment.controller.spec.ts

test/
└── comments.e2e-spec.ts

src/database/migrations/
└── 1705334567890-CreateCommentsTable.ts

docs/features/
└── FEAT-2025-123456.md
```

### Git

```bash
# Branch criada
feature/feat-2025-123456

# Commit
feat: implement comments system with nested replies

- Add Comment entity with self-reference for nested comments
- Implement CommentService with CRUD operations
- Add REST API endpoints with authentication
- Add ownership validation guards
- Implement notification integration
- Add comprehensive tests (unit + E2E)
- Update documentation

Tests: 21 tests, 100% passing
Coverage: 91.2%
Code Review: 89/100

Refs: FEAT-2025-123456
```

---

## 🎯 Exemplo de Cenário com Refinamento

E se os testes falhassem? Veja como o framework lida:

### Cenário: Teste Falha

```
❌ Teste E2E Falhou!

  CommentsController (e2e)
    PUT /comments/:id
      ✗ should update own comment (98ms)
        Expected: 200
        Received: 403

⚠️ Recomendação: REFINE

➡️ Próximo: Chamar Refiner Agent para analisar falha...
```

### Refiner Analisa

```
🔍 Analisando Falha...

🔴 Problema: Teste de update retorna 403 em vez de 200

🎯 Causa Raiz:
  OwnershipGuard verifica comment.userId, mas o request
  não inclui o userId do usuário autenticado

📝 Ação de Refinamento:
  ACT-001 [CRITICAL]: Adicionar @CurrentUser() decorator
    - Arquivo: comment.controller.ts
    - Mudança: Injetar userId do token JWT no método
    - Tempo: 15min

➡️ Próximo: Chamar Executor Agent para corrigir...
```

### Executor Corrige

```
🔧 Executando Refinamento...

ACT-001: Adicionar @CurrentUser() decorator
✅ Importado CurrentUser decorator
✅ Adicionado @CurrentUser() no método update()
✅ Passando userId para service.update()

🧪 Re-executando testes...
✅ Todos os testes passando agora!

➡️ Próximo: Chamar E2E Tester novamente...
```

E o ciclo continua até todos os testes passarem! ♻️

---

## 💡 Dicas de Uso

### 1. Seja Específico na Descrição

❌ **Ruim**: "Quero adicionar comentários"

✅ **Bom**: "Quero criar sistema de comentários com nested replies, autenticação JWT, paginação e notificações quando alguém responde"

### 2. Inclua Requisitos de Segurança

Sempre mencione:
- Autenticação necessária?
- Quem pode fazer o quê?
- Rate limiting necessário?

### 3. Especifique Tecnologias

Se seu projeto usa tecnologias específicas, mencione:
- "Usar Redis para cache"
- "Integrar com Stripe"
- "WebSocket com Socket.io"

### 4. Acompanhe os Artefatos

Os artefatos em `.claude/artifacts/` contêm todas as decisões técnicas. Leia-os para entender o raciocínio!

---

## 🎊 Conclusão

Este exemplo mostra como o framework:

1. ✅ **Analisa** requisitos automaticamente
2. ✅ **Planeja** arquitetura técnica
3. ✅ **Cria** tarefas atômicas
4. ✅ **Implementa** código funcional
5. ✅ **Testa** automaticamente (unit + E2E)
6. ✅ **Revisa** qualidade e segurança
7. ✅ **Corrige** problemas iterativamente
8. ✅ **Entrega** PR pronto

**Tudo de forma completamente automatizada!** 🚀

Você só precisa:
1. Descrever a feature
2. Deixar os agentes trabalharem
3. Revisar o PR final
4. Fazer merge!

---

**Framework de Entrega Automatizada para Claude Code**
