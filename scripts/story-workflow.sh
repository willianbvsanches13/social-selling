#!/bin/bash

# Story Workflow - Gerenciador completo do fluxo de uma story
# Uso: ./story-workflow.sh STORY-ID

set -e

STORY_ID=$1

if [ -z "$STORY_ID" ]; then
    echo "Uso: ./story-workflow.sh STORY-ID"
    exit 1
fi

STORY_DIR=".stories/$STORY_ID"

# Verificar se story existe
if [ ! -d "$STORY_DIR" ]; then
    echo "❌ Story $STORY_ID não encontrada!"
    echo "Execute primeiro: ./story-analyzer.sh \"$STORY_ID\" \"Descrição\""
    exit 1
fi

# Função para mostrar status
show_status() {
    echo ""
    echo "📊 Status da Story: $STORY_ID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Verificar arquivos existentes
    [ -f "$STORY_DIR/01-analysis.md" ] && echo "✅ 1. Análise" || echo "⬜ 1. Análise"
    [ -f "$STORY_DIR/02-plan.md" ] && echo "✅ 2. Plano de Execução" || echo "⬜ 2. Plano de Execução"
    [ -f "$STORY_DIR/03-tasks.md" ] && echo "✅ 3. Tarefas" || echo "⬜ 3. Tarefas"
    [ -f "$STORY_DIR/04-execution.md" ] && echo "✅ 4. Execução" || echo "⬜ 4. Execução"
    [ -f "$STORY_DIR/05-tests.md" ] && echo "✅ 5. Testes" || echo "⬜ 5. Testes"
    [ -f "$STORY_DIR/06-review.md" ] && echo "✅ 6. Code Review" || echo "⬜ 6. Code Review"
    [ -f "$STORY_DIR/07-delivery.md" ] && echo "✅ 7. Entrega" || echo "⬜ 7. Entrega"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Próximo passo
    if [ ! -f "$STORY_DIR/01-analysis.md" ]; then
        echo "👉 Próximo: Análise - ./story-analyzer.sh \"$STORY_ID\" \"descrição\""
    elif [ ! -f "$STORY_DIR/02-plan.md" ]; then
        echo "👉 Próximo: Planejamento - Criar 02-plan.md"
    elif [ ! -f "$STORY_DIR/03-tasks.md" ]; then
        echo "👉 Próximo: Tarefas - Criar 03-tasks.md"
    elif [ ! -f "$STORY_DIR/04-execution.md" ]; then
        echo "👉 Próximo: Executar as tarefas"
    elif [ ! -f "$STORY_DIR/05-tests.md" ]; then
        echo "👉 Próximo: Criar/executar testes"
    elif [ ! -f "$STORY_DIR/06-review.md" ]; then
        echo "👉 Próximo: Code review"
    elif [ ! -f "$STORY_DIR/07-delivery.md" ]; then
        echo "👉 Próximo: Preparar entrega"
    else
        echo "🎉 Story completa! Pronta para merge."
    fi
    echo ""
}

# Menu interativo
show_menu() {
    echo "╔════════════════════════════════════════╗"
    echo "║     Story Workflow - $STORY_ID        "
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "Escolha uma ação:"
    echo ""
    echo "  1) 📊 Ver status"
    echo "  2) 📝 Ver análise"
    echo "  3) 📋 Ver plano"
    echo "  4) ✅ Ver tarefas"
    echo "  5) 📂 Abrir diretório"
    echo "  6) 🔄 Gerar plano (com Claude)"
    echo "  7) 🔄 Gerar tarefas (com Claude)"
    echo "  8) 📊 Gerar relatório completo"
    echo "  0) ❌ Sair"
    echo ""
    read -p "Opção: " choice

    case $choice in
        1) show_status ;;
        2) [ -f "$STORY_DIR/01-analysis.md" ] && cat "$STORY_DIR/01-analysis.md" || echo "Análise não encontrada" ;;
        3) [ -f "$STORY_DIR/02-plan.md" ] && cat "$STORY_DIR/02-plan.md" || echo "Plano não encontrado" ;;
        4) [ -f "$STORY_DIR/03-tasks.md" ] && cat "$STORY_DIR/03-tasks.md" || echo "Tarefas não encontradas" ;;
        5) open "$STORY_DIR" 2>/dev/null || xdg-open "$STORY_DIR" 2>/dev/null || echo "Abra: $STORY_DIR" ;;
        6) generate_plan ;;
        7) generate_tasks ;;
        8) generate_report ;;
        0) echo "👋 Até logo!"; exit 0 ;;
        *) echo "❌ Opção inválida" ;;
    esac

    echo ""
    read -p "Pressione ENTER para continuar..."
    show_menu
}

# Gerar plano usando análise
generate_plan() {
    if [ ! -f "$STORY_DIR/01-analysis.md" ]; then
        echo "❌ Execute a análise primeiro!"
        return
    fi

    echo "🔄 Gerando plano de execução..."

    ANALYSIS=$(cat "$STORY_DIR/01-analysis.md")

    PROMPT="Com base nesta análise, crie um plano de execução detalhado:

## 1. Arquitetura da Solução
- Padrões a utilizar
- Componentes principais
- Tecnologias/bibliotecas

## 2. Componentes
Liste componentes a criar/modificar com ação (create/modify/delete)

## 3. Fases de Implementação
Divida em fases lógicas com dependências

## 4. Critérios de Aceitação
Liste critérios testáveis

## 5. Estimativa
Horas estimadas por fase

Análise:
$ANALYSIS"

    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo "$PROMPT" | pbcopy 2>/dev/null || echo "$PROMPT" | xclip -selection clipboard 2>/dev/null
        echo "📋 Prompt copiado! Cole no Claude e salve resultado em:"
        echo "   $STORY_DIR/02-plan.md"
    else
        echo "$PROMPT" > "$STORY_DIR/02-plan-prompt.txt"
        echo "📝 Prompt salvo em: $STORY_DIR/02-plan-prompt.txt"
        echo "   Cole no Claude e salve resultado em 02-plan.md"
    fi
}

# Gerar tarefas usando plano
generate_tasks() {
    if [ ! -f "$STORY_DIR/02-plan.md" ]; then
        echo "❌ Crie o plano primeiro!"
        return
    fi

    echo "🔄 Gerando lista de tarefas..."

    PLAN=$(cat "$STORY_DIR/02-plan.md")

    PROMPT="Com base neste plano, crie uma lista de tarefas executáveis:

## Formato para cada tarefa:

- [ ] **TASK-001**: Título da tarefa
  - **Descrição**: O que fazer
  - **Arquivos**: Lista de arquivos a criar/modificar
  - **Dependências**: TASK-XXX (se houver)
  - **Estimativa**: Xh
  - **DoD**: Critérios de conclusão

Organize em ordem de execução considerando dependências.

Plano:
$PLAN"

    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo "$PROMPT" | pbcopy 2>/dev/null || echo "$PROMPT" | xclip -selection clipboard 2>/dev/null
        echo "📋 Prompt copiado! Cole no Claude e salve resultado em:"
        echo "   $STORY_DIR/03-tasks.md"
    else
        echo "$PROMPT" > "$STORY_DIR/03-tasks-prompt.txt"
        echo "📝 Prompt salvo em: $STORY_DIR/03-tasks-prompt.txt"
        echo "   Cole no Claude e salve resultado em 03-tasks.md"
    fi
}

# Gerar relatório completo
generate_report() {
    echo "📊 Gerando relatório completo..."

    REPORT_FILE="$STORY_DIR/REPORT.md"

    cat > "$REPORT_FILE" <<EOF
# Relatório Completo - $STORY_ID

**Data**: $(date +"%Y-%m-%d %H:%M:%S")

---

EOF

    # Adicionar cada fase
    for file in "$STORY_DIR"/*.md; do
        if [ -f "$file" ] && [ "$(basename "$file")" != "REPORT.md" ]; then
            echo "## $(basename "$file" .md | tr '[:lower:]' '[:upper:]')" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            cat "$file" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            echo "---" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
        fi
    done

    echo "✅ Relatório gerado: $REPORT_FILE"

    # Abrir relatório
    if command -v code &> /dev/null; then
        code "$REPORT_FILE"
    else
        echo "📖 Abra: $REPORT_FILE"
    fi
}

# Executar
show_status
show_menu
