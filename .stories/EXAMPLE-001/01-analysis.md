# Análise da Story: EXAMPLE-001

**Data**: 2024-01-15 10:30:00
**Story**: Adicionar sistema de comentários em posts

---

## 1. Requisitos Funcionais

### FR-001: Criar Comentário
**Prioridade**: Must-have
**Descrição**: Usuário autenticado pode criar comentário em um post
- Input: postId, texto do comentário
- Output: Comentário criado com ID, timestamp, autor
- Validações:
  - Texto entre 1-500 caracteres
  - Post deve existir
  - Usuário deve estar autenticado

### FR-002: Replies (Respostas)
**Prioridade**: Must-have
**Descrição**: Usuário pode responder a um comentário existente
- Input: commentId, texto da resposta
- Output: Comentário filho criado
- Hierarquia: Apenas 1 nível de profundidade (não permitir reply de reply)

### FR-003: Likes em Comentários
**Prioridade**: Should-have
**Descrição**: Usuário pode dar like/unlike em comentários
- Input: commentId
- Output: Contador de likes atualizado
- Regra: 1 like por usuário por comentário

### FR-004: Listar Comentários
**Prioridade**: Must-have
**Descrição**: Listar comentários de um post com paginação
- Input: postId, page, limit
- Output: Lista de comentários ordenados por data (mais recente primeiro)
- Incluir: replies agrupadas por comentário pai

### FR-005: Deletar Comentário
**Prioridade**: Must-have
**Descrição**: Autor pode deletar seu próprio comentário
- Soft delete (manter registro)
- Se comentário tem replies, marcar como [deletado]

## 2. Requisitos Não-Funcionais

### NFR-001: Performance
**Tipo**: Performance
**Descrição**:
- Listagem de comentários deve retornar em < 200ms (p95)
- Criar comentário deve processar em < 100ms
- Usar cache para contadores de likes

### NFR-002: Segurança
**Tipo**: Security
**Descrição**:
- Validação de XSS em texto de comentários
- Rate limiting: max 10 comentários por minuto por usuário
- Apenas autor pode deletar próprio comentário

### NFR-003: Escalabilidade
**Tipo**: Scalability
**Descrição**:
- Suportar posts com até 10.000 comentários
- Paginação obrigatória (max 50 comentários por página)

## 3. Impacto no Sistema

### Módulos Afetados
- `posts` (módulo existente) - adicionar relação com comments
- `notifications` (módulo existente) - notificar autor do post sobre novos comentários
- `users` (módulo existente) - relação com comentários

### Arquivos a Criar

**Backend**:
```
src/comments/
├── entities/
│   ├── comment.entity.ts
│   └── comment-like.entity.ts
├── dto/
│   ├── create-comment.dto.ts
│   ├── update-comment.dto.ts
│   └── list-comments.dto.ts
├── services/
│   ├── comment.service.ts
│   └── comment-like.service.ts
├── controllers/
│   └── comment.controller.ts
├── guards/
│   └── comment-author.guard.ts
└── comments.module.ts
```

**Frontend** (se aplicável):
```
src/features/comments/
├── components/
│   ├── CommentList.tsx
│   ├── CommentItem.tsx
│   ├── CommentForm.tsx
│   └── ReplyForm.tsx
├── hooks/
│   ├── useComments.ts
│   └── useCommentLike.ts
└── types/
    └── comment.types.ts
```

### Database

**Nova tabela**: `comments`
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Nova tabela**: `comment_likes`
```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
```

**Índices**:
- `idx_comments_post_id` em `comments(post_id)`
- `idx_comments_parent` em `comments(parent_comment_id)`
- `idx_comment_likes_comment` em `comment_likes(comment_id)`

## 4. Dependências

### Dependências de Features
- ✅ Sistema de Posts (já existe)
- ✅ Sistema de Autenticação (já existe)
- ⚠️ Sistema de Notificações (existe, precisa estender)

### Dependências Técnicas
- ✅ TypeORM (já instalado)
- ✅ class-validator (já instalado)
- ⚠️ Redis para cache de likes (verificar se está disponível)

## 5. Riscos

| Risco | Severidade | Probabilidade | Mitigação |
|-------|------------|---------------|-----------|
| N+1 queries ao listar comentários com replies | High | Alta | Usar eager loading e query builder otimizado |
| Spam de comentários | Medium | Média | Implementar rate limiting rigoroso |
| Performance com muitos comentários | Medium | Baixa | Paginação obrigatória + índices |
| XSS através de comentários | High | Baixa | Sanitização estrita + validação |

## 6. Complexidade

**Estimativa**: **Medium**

**Justificativa**:
- Database: 2 tabelas novas (simples)
- Backend: 8-10 arquivos novos (padrão conhecido)
- Lógica: Hierarquia de replies adiciona complexidade moderada
- Testes: Requer testes de permissões e edge cases
- Integração: Precisa estender notificações

**Estimativa de Tempo**: 6-8 horas

**Breakdown**:
- Database & Migrations: 1h
- Backend (entities, services, controllers): 3h
- Testes: 1.5h
- Documentação: 0.5h
- Buffer: 1h

---

## Próximos Passos

✅ Análise concluída
⏭️ Próximo: Criar plano de execução

**Comando**: `./scripts/story-workflow.sh "EXAMPLE-001"` → Opção 6 (Gerar plano)
