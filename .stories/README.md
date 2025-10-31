# 📂 Stories - Framework de Entrega de Features

Este diretório contém a documentação estruturada de todas as stories/features em desenvolvimento.

---

## 📁 Estrutura

```
.stories/
├── EXAMPLE-001/              # Story de exemplo (referência)
│   ├── 01-analysis.md        # Análise completa
│   ├── 02-plan.md            # Plano de execução
│   ├── 03-tasks.md           # Lista de tarefas
│   ├── 04-execution.md       # Notas de execução
│   ├── 05-tests.md           # Testes e resultados
│   ├── 06-review.md          # Code review
│   ├── 07-delivery.md        # Entrega/PR
│   ├── REPORT.md             # Relatório consolidado
│   └── metadata.json         # Metadados da story
├── STORY-XXX/                # Sua story
└── README.md                 # Este arquivo
```

---

## 🎯 Como Usar

### 1. Criar Nova Story

**Opção A**: Usando scripts
```bash
./scripts/story-analyzer.sh "STORY-123" "Descrição da story"
```

**Opção B**: Manualmente
```bash
mkdir -p .stories/STORY-123
cd .stories/STORY-123

# Criar arquivos das fases conforme necessário
```

### 2. Seguir as Fases

```
01-analysis.md    → Análise de requisitos e impacto
02-plan.md        → Plano de execução
03-tasks.md       → Lista de tarefas executáveis
04-execution.md   → Notas durante implementação
05-tests.md       → Testes e resultados
06-review.md      → Code review
07-delivery.md    → Preparação para entrega
```

### 3. Gerar Relatório

```bash
./scripts/story-workflow.sh "STORY-123"
# Opção 8: Gerar relatório completo
```

---

## 📖 Exemplo Completo

Veja `EXAMPLE-001/` para um exemplo detalhado de:
- ✅ Análise estruturada (01-analysis.md)
- ✅ Lista de tarefas executáveis (03-tasks.md)
- ✅ Organização por fases
- ✅ DoD (Definition of Done) para cada tarefa

---

## 💡 Dicas

### Para cada story:

1. **Sempre comece pela análise** (01-analysis.md)
   - Requisitos funcionais e não-funcionais
   - Impacto no sistema
   - Riscos

2. **Crie plano antes de codificar** (02-plan.md)
   - Arquitetura da solução
   - Componentes necessários
   - Fases de implementação

3. **Decomponha em tarefas pequenas** (03-tasks.md)
   - Tarefas de 15min-1h cada
   - DoD claro para cada uma
   - Ordem de execução definida

4. **Documente à medida que implementa**
   - Marque tasks como concluídas
   - Anote decisões importantes
   - Registre problemas encontrados

5. **Sempre faça review antes de entregar** (06-review.md)
   - Use Claude/ChatGPT para review automatizado
   - Verifique segurança, performance, testes
   - Aplique sugestões relevantes

---

## 🔍 Buscar Stories

```bash
# Listar todas
ls -la .stories/

# Buscar por termo
grep -r "comentários" .stories/*/01-analysis.md

# Ver status de todas
./scripts/story-workflow.sh STORY-XXX
```

---

## 📊 Métricas

Mantenha rastreabilidade:

- **Tempo estimado** vs **tempo real**
- **Complexidade** estimada vs real
- **Retrabalho** necessário

Isso ajuda a melhorar estimativas futuras!

---

## 🗂️ Organização

### Por Status

Você pode organizar por status:

```
.stories/
├── 01-in-analysis/
├── 02-in-planning/
├── 03-in-progress/
├── 04-in-review/
├── 05-completed/
└── archived/
```

Ou manter tudo em `.stories/` e usar o `metadata.json` para status.

---

## 🧹 Limpeza

Após merge:

```bash
# Arquivar story completa
mv .stories/STORY-123 .stories/archived/

# Ou compactar
tar -czf .stories/archived/STORY-123.tar.gz .stories/STORY-123
rm -rf .stories/STORY-123
```

---

## 📚 Documentação

- **Guia Prático**: [docs/GUIA-PRATICO-STORIES.md](../docs/GUIA-PRATICO-STORIES.md)
- **Scripts**: [scripts/README.md](../scripts/README.md)
- **Framework Completo**: [docs/README-FRAMEWORK.md](../docs/README-FRAMEWORK.md)

---

**Comece com EXAMPLE-001 para ver um exemplo real!** 🚀
