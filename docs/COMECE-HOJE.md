# 🚀 Comece HOJE a Usar o Framework nas Suas Stories

## ⚡ Setup de 2 Minutos

```bash
# 1. Criar pasta para suas stories
mkdir -p .stories

# 2. Dar permissão aos scripts
chmod +x scripts/*.sh

# 3. Pronto! ✅
```

---

## 📝 Sua Primeira Story em 30 Minutos

### Passo 1: Pegar uma Story (2 min)

Pegue a story que você vai fazer hoje. Exemplo:
- **STORY-456**: "Adicionar filtro por data nos posts"

### Passo 2: Análise com Claude (5 min)

Abra o [Claude](https://claude.ai) e cole:

```
Sou desenvolvedor e vou implementar esta story:

Story: STORY-456 - Adicionar filtro por data nos posts
Descrição:
- Usuário pode filtrar posts por período (hoje, esta semana, este mês, personalizado)
- UI com dropdown de períodos + date picker para personalizado
- Backend precisa filtrar eficientemente

Stack do projeto:
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: React + TypeScript

Preciso de uma análise estruturada com:

1. **Requisitos Funcionais** (numerados FR-001, FR-002...)
2. **Requisitos Não-Funcionais** (performance, segurança)
3. **Arquivos que vou criar/modificar**
4. **Riscos** e como mitigar
5. **Estimativa** de tempo (low/medium/high)

Me dê em formato markdown para salvar.
```

**Salve a resposta em**: `.stories/STORY-456/01-analysis.md`

### Passo 3: Tarefas com Claude (5 min)

Cole no Claude:

```
Com base nesta análise, decomponha em tarefas executáveis:

[COLE A ANÁLISE AQUI]

Para cada tarefa:
- [ ] **TASK-XXX**: Título claro
  - O que fazer
  - Arquivos envolvidos
  - Quanto tempo (~Xmin)
  - Como sei que está pronto (DoD)

Me dê de 5-10 tarefas em ordem de execução.
```

**Salve em**: `.stories/STORY-456/03-tasks.md`

### Passo 4: Implementar (Seu tempo normal)

Agora você tem um guia claro! Execute tarefa por tarefa:

```markdown
- [ ] TASK-001: Adicionar filtro DTO no backend (30min)
- [ ] TASK-002: Implementar lógica de filtro no service (45min)
- [ ] TASK-003: Criar endpoint GET /posts?period=... (30min)
...
```

**À medida que completa, vá marcando**:
```markdown
- [x] TASK-001: ✅ Concluído
- [x] TASK-002: ✅ Concluído
- [ ] TASK-003: 🔄 Em progresso
```

### Passo 5: Review com Claude (5 min)

Antes de abrir o PR, peça review:

```
Faça um code review desta implementação:

Mudanças:
- src/posts/dto/filter-posts.dto.ts (novo)
- src/posts/services/post.service.ts (modificado - adicionei filtro)
- src/posts/controllers/post.controller.ts (modificado - novo query param)

Analise:
1. Qualidade do código
2. Segurança (SQL injection?)
3. Performance
4. Testes necessários

Seja crítico mas construtivo.
```

**Aplique as sugestões importantes**.

### Passo 6: Abrir PR (5 min)

Gere descrição do PR com Claude:

```
Gere descrição de PR profissional para:

Story: STORY-456 - Filtro por data
Arquivos modificados: [liste]
Testes: [quantos fez]

Formato:
## Descrição
## Mudanças
## Testes
## Screenshots (se tiver)
```

**Cole no PR e pronto!** 🎉

---

## 💡 Modo Ainda Mais Rápido

Se não quiser criar arquivos, use Claude **como seu checklist mental**:

1. **Cole a story** → Peça análise
2. **Peça tarefas** → Use como guia
3. **Implemente**
4. **Peça review** → Ajuste
5. **Peça descrição de PR**

**Tempo extra**: 0 minutos (só mudou seu workflow)
**Benefício**: Organização mental + qualidade

---

## 🎯 Exemplo Real Simplificado

### Você tem: "Adicionar botão de compartilhar posts"

#### 1. Abrir Claude:
```
Story: Adicionar botão de compartilhar posts no Twitter/LinkedIn
Stack: React + NestJS

Me dê:
1. Tarefas (5-8 tarefas)
2. Em ordem de execução
3. Com tempo estimado
```

#### 2. Claude responde:
```markdown
- [ ] TASK-001: Criar componente ShareButton.tsx (20min)
- [ ] TASK-002: Adicionar ícones de redes sociais (10min)
- [ ] TASK-003: Implementar lógica de share para Twitter (15min)
- [ ] TASK-004: Implementar lógica de share para LinkedIn (15min)
- [ ] TASK-005: Adicionar ShareButton no PostCard (10min)
- [ ] TASK-006: Escrever testes do componente (30min)
```

#### 3. Você implementa seguindo a lista!

#### 4. Antes do PR, peça review:
```
Review:
- src/components/ShareButton.tsx (novo - 80 linhas)
- src/components/PostCard.tsx (modificado - adicionei ShareButton)
```

#### 5. PR pronto em ~2h ao invés de 3-4h! ⚡

---

## 📊 Comparação

### ❌ Sem Framework
```
1. Ler story → começar a codar
2. Descobrir problemas no meio
3. Esquecer de testar algo
4. Review aponta coisas óbvias
5. Retrabalho
```
**Tempo**: 4-6h | **Stress**: Alto 😰

### ✅ Com Framework (Modo Simples)
```
1. Analisar com Claude (5min)
2. Ter lista clara de tarefas
3. Executar passo a passo
4. Review preventivo (5min)
5. PR limpo na primeira vez
```
**Tempo**: 2-4h | **Stress**: Baixo 😌

---

## 🎓 Evoluir Gradualmente

### Semana 1: Modo Mental
- Só usar Claude para análise e tarefas
- Não salvar arquivos ainda
- **Objetivo**: Acostumar com o processo

### Semana 2: Salvar Análises
- Começar a salvar em `.stories/STORY-XXX/`
- Ter histórico das suas decisions
- **Objetivo**: Criar documentação passiva

### Semana 3: Scripts
- Usar `./scripts/story-analyzer.sh`
- Workflow mais automatizado
- **Objetivo**: Aumentar velocidade

### Mês 2: Full Framework
- Todas as fases documentadas
- Relatórios consolidados
- Métricas de tempo
- **Objetivo**: Dados para melhorar

---

## 💬 Prompts Prontos (Copie e Cole!)

Salve estes prompts em algum lugar:

### 📋 Para Análise
```
Story: [TÍTULO]
Descrição: [DESCRIÇÃO]
Stack: [SEU STACK]

Análise estruturada:
1. Requisitos funcionais
2. Requisitos não-funcionais
3. Arquivos a modificar/criar
4. Riscos
5. Estimativa
```

### ✅ Para Tarefas
```
Decomponha em tarefas executáveis de 15-45min cada:
[COLE ANÁLISE]

Formato:
- [ ] TASK-XXX: Título
  - O que fazer
  - Arquivos
  - Tempo
  - DoD
```

### 👀 Para Review
```
Code review:
Arquivos: [LISTE]
Foco em: qualidade, segurança, performance

Aponte:
- Problemas críticos
- Sugestões de melhoria
- Elogios (se houver)
```

### 📝 Para PR
```
Gere descrição de PR:
Story: [ID] - [TÍTULO]
Mudanças: [RESUMO]
Testes: [QUANTIDADE]
```

---

## 🎯 Checklist Mínimo para Cada Story

```
[ ] 1. Peguei story do backlog
[ ] 2. Pedi análise ao Claude (5min)
[ ] 3. Pedi lista de tarefas (5min)
[ ] 4. Implementei seguindo tarefas (Xh)
[ ] 5. Pedi code review ao Claude (5min)
[ ] 6. Gerei descrição de PR (2min)
[ ] 7. PR aberto! 🎉
```

**Total de overhead**: ~17 minutos
**Benefício**: Organização, qualidade, velocidade

---

## 🚀 Comece Literalmente AGORA

1. Abra [Claude.ai](https://claude.ai)
2. Pegue a story que você vai fazer hoje
3. Cole o prompt de análise
4. Use a resposta como guia
5. **Comece a implementar!**

**Não precisa instalar nada. Não precisa configurar nada. Só usar!**

---

## 📞 Tem Dúvida?

- **Guia Completo**: [GUIA-PRATICO-STORIES.md](./GUIA-PRATICO-STORIES.md)
- **Exemplo Real**: [.stories/EXAMPLE-001/](./.stories/EXAMPLE-001/)
- **Scripts**: [scripts/README.md](../scripts/README.md)

---

**A melhor hora para começar foi ontem. A segunda melhor hora é AGORA! 🚀**

<div align="center">

**[Ver Exemplo Real →](./.stories/EXAMPLE-001/)** |
**[Guia Completo →](./GUIA-PRATICO-STORIES.md)** |
**[Scripts →](../scripts/README.md)**

</div>
