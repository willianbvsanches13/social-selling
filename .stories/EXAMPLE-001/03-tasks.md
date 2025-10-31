# Tarefas - EXAMPLE-001: Sistema de Comentários

**Story**: Adicionar sistema de comentários em posts
**Data**: 2024-01-15
**Estimativa Total**: 6-8 horas

---

## 📋 Lista de Tarefas

### ✅ Fase 1: Database & Migrations (1h)

- [ ] **TASK-001**: Criar migration para tabela comments
  - **Descrição**: Criar tabela comments com campos: id, post_id, user_id, parent_comment_id, content, is_deleted, timestamps
  - **Arquivos**:
    - `src/database/migrations/XXXXXX-create-comments-table.ts`
  - **Dependências**: Nenhuma
  - **Estimativa**: 30min
  - **DoD**:
    - Migration criada e executada com sucesso
    - Índices em post_id e parent_comment_id
    - Foreign keys configuradas corretamente

- [ ] **TASK-002**: Criar migration para tabela comment_likes
  - **Descrição**: Criar tabela comment_likes com unique constraint em (comment_id, user_id)
  - **Arquivos**:
    - `src/database/migrations/XXXXXX-create-comment-likes-table.ts`
  - **Dependências**: TASK-001
  - **Estimativa**: 30min
  - **DoD**:
    - Migration criada e executada
    - Unique constraint funcionando
    - Índice em comment_id

### ✅ Fase 2: Entities & DTOs (1h)

- [ ] **TASK-003**: Criar entidade Comment
  - **Descrição**: Implementar entity Comment com TypeORM, incluindo relações com Post, User e parent comment
  - **Arquivos**:
    - `src/comments/entities/comment.entity.ts`
  - **Dependências**: TASK-001
  - **Estimativa**: 30min
  - **DoD**:
    - Entidade criada com todas as colunas
    - Relações configuradas (ManyToOne com Post e User)
    - Self-referencing para parent/replies
    - Decorators de validação

- [ ] **TASK-004**: Criar DTOs de Comment
  - **Descrição**: Criar DTOs para create, update e list comments
  - **Arquivos**:
    - `src/comments/dto/create-comment.dto.ts`
    - `src/comments/dto/update-comment.dto.ts`
    - `src/comments/dto/list-comments.dto.ts`
  - **Dependências**: TASK-003
  - **Estimativa**: 30min
  - **DoD**:
    - CreateCommentDto com validações (content 1-500 chars)
    - ListCommentsDto com paginação
    - Validações com class-validator

### ✅ Fase 3: Services & Business Logic (2h)

- [ ] **TASK-005**: Implementar CommentService básico
  - **Descrição**: CRUD básico de comentários (create, findAll, findOne, delete)
  - **Arquivos**:
    - `src/comments/services/comment.service.ts`
    - `src/comments/services/comment.service.spec.ts`
  - **Dependências**: TASK-003, TASK-004
  - **Estimativa**: 1h
  - **DoD**:
    - Método create() validando post_id e user_id
    - Método findAll() com paginação e eager loading de replies
    - Método delete() com soft delete
    - Tratamento de erros (post não existe, etc)
    - Testes unitários cobrindo >80%

- [ ] **TASK-006**: Implementar lógica de Replies
  - **Descrição**: Adicionar método createReply() no CommentService com validação de profundidade
  - **Arquivos**:
    - `src/comments/services/comment.service.ts`
  - **Dependências**: TASK-005
  - **Estimativa**: 30min
  - **DoD**:
    - Método createReply() validando parent_comment_id
    - Validação: não permitir reply de reply (max 1 nível)
    - Testes cobrindo caso de reply de reply (deve falhar)

- [ ] **TASK-007**: Implementar CommentLikeService
  - **Descrição**: Service para gerenciar likes (toggle like/unlike)
  - **Arquivos**:
    - `src/comments/services/comment-like.service.ts`
    - `src/comments/services/comment-like.service.spec.ts`
  - **Dependências**: TASK-003
  - **Estimativa**: 30min
  - **DoD**:
    - Método toggleLike() que adiciona ou remove like
    - Retorna contador atualizado
    - Testes unitários

### ✅ Fase 4: Controllers & API (1h)

- [ ] **TASK-008**: Criar CommentController
  - **Descrição**: Implementar endpoints REST para comentários
  - **Arquivos**:
    - `src/comments/controllers/comment.controller.ts`
    - `src/comments/controllers/comment.controller.spec.ts`
  - **Dependências**: TASK-005, TASK-006, TASK-007
  - **Estimativa**: 1h
  - **DoD**:
    - POST /posts/:postId/comments - criar comentário
    - GET /posts/:postId/comments - listar com paginação
    - POST /comments/:commentId/replies - criar reply
    - DELETE /comments/:commentId - deletar (apenas autor)
    - POST /comments/:commentId/like - toggle like
    - Swagger documentation completa
    - Guards de autenticação aplicados
    - Testes de integração

### ✅ Fase 5: Guards & Segurança (30min)

- [ ] **TASK-009**: Criar CommentAuthorGuard
  - **Descrição**: Guard para validar que usuário é autor do comentário antes de deletar
  - **Arquivos**:
    - `src/comments/guards/comment-author.guard.ts`
    - `src/comments/guards/comment-author.guard.spec.ts`
  - **Dependências**: TASK-008
  - **Estimativa**: 30min
  - **DoD**:
    - Guard implementado usando CanActivate
    - Valida user_id do comentário vs. user autenticado
    - Retorna 403 se não for autor
    - Testes cobrindo casos de sucesso e falha

### ✅ Fase 6: Módulo & Integração (30min)

- [ ] **TASK-010**: Criar CommentsModule e integrar
  - **Descrição**: Criar módulo e registrar no AppModule
  - **Arquivos**:
    - `src/comments/comments.module.ts`
    - `src/app.module.ts`
  - **Dependências**: TASK-003, TASK-005, TASK-007, TASK-008
  - **Estimativa**: 15min
  - **DoD**:
    - Module criado com providers, controllers, imports
    - Registrado no AppModule
    - Aplicação inicia sem erros

- [ ] **TASK-011**: Atualizar Post entity com relação
  - **Descrição**: Adicionar relação OneToMany de Post para Comments
  - **Arquivos**:
    - `src/posts/entities/post.entity.ts`
  - **Dependências**: TASK-003
  - **Estimativa**: 15min
  - **DoD**:
    - Relação @OneToMany adicionada
    - Testes de Post não quebrados

### ✅ Fase 7: Testes E2E (1h)

- [ ] **TASK-012**: Criar suite de testes E2E
  - **Descrição**: Testes E2E cobrindo fluxo completo
  - **Arquivos**:
    - `test/e2e/comments.e2e-spec.ts`
  - **Dependências**: TASK-010
  - **Estimativa**: 1h
  - **DoD**:
    - Teste: criar comentário em post
    - Teste: listar comentários com paginação
    - Teste: criar reply
    - Teste: não permitir reply de reply (deve falhar)
    - Teste: deletar comentário (autor)
    - Teste: falhar ao deletar comentário (não-autor)
    - Teste: toggle like
    - Teste: listar inclui contadores de likes e replies
    - Todos os testes passando

### ✅ Fase 8: Documentação (30min)

- [ ] **TASK-013**: Atualizar README e documentação
  - **Descrição**: Documentar API de comentários
  - **Arquivos**:
    - `docs/api/comments.md`
    - `README.md`
  - **Dependências**: TASK-012
  - **Estimativa**: 30min
  - **DoD**:
    - Documentação dos endpoints com exemplos
    - Swagger atualizado e validado
    - README com seção de comentários

---

## 📊 Resumo

- **Total de Tarefas**: 13
- **Estimativa Total**: 6.5 horas
- **Tarefas Críticas**: TASK-001, TASK-003, TASK-005, TASK-008
- **Tarefas Bloqueantes**: TASK-001 (bloqueia várias), TASK-003 (bloqueia services)

---

## 🔄 Ordem de Execução Recomendada

```
TASK-001 (DB)
    ↓
TASK-002 (DB)
    ↓
TASK-003 (Entity) ──→ TASK-011 (Atualizar Post)
    ↓
TASK-004 (DTOs)
    ↓
TASK-005 (CommentService)
    ↓
TASK-006 (Replies)   TASK-007 (LikeService)
    ↓                      ↓
    └──→ TASK-008 (Controller) ←──┘
              ↓
         TASK-009 (Guard)
              ↓
         TASK-010 (Module)
              ↓
         TASK-012 (E2E)
              ↓
         TASK-013 (Docs)
```

---

## 💡 Dicas de Implementação

### TASK-005 (CommentService)
```typescript
// Exemplo de findAll com eager loading eficiente
async findAll(postId: string, page = 1, limit = 20) {
  return this.commentRepository.find({
    where: { postId, isDeleted: false, parentCommentId: IsNull() },
    relations: ['user', 'replies', 'replies.user'],
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

### TASK-008 (Controller)
```typescript
// Exemplo de endpoint com guard
@Delete(':id')
@UseGuards(JwtAuthGuard, CommentAuthorGuard)
async delete(@Param('id') id: string) {
  return this.commentService.softDelete(id);
}
```

### TASK-012 (E2E)
```typescript
// Exemplo de teste crítico
it('should not allow reply of reply', async () => {
  const comment = await createComment();
  const reply = await createReply(comment.id);

  await request(app.getHttpServer())
    .post(`/comments/${reply.id}/replies`)
    .send({ content: 'Reply of reply' })
    .expect(400);
});
```

---

## ✅ Checklist de Conclusão

Antes de marcar como "pronto":

- [ ] Todas as 13 tarefas concluídas
- [ ] Migrations rodadas em dev
- [ ] Testes unitários > 80% cobertura
- [ ] Testes E2E passando
- [ ] Swagger atualizado
- [ ] README atualizado
- [ ] Code review realizado
- [ ] PR criado e linkado

---

**Próximo Passo**: Começar TASK-001!

**Dica**: Use Claude Code ou Cursor para implementar cada tarefa, passando a descrição completa da task.
