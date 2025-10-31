#!/bin/bash

# Story Analyzer - Simula Agent 1 usando Claude API
# Uso: ./story-analyzer.sh "STORY-123" "Descrição da story"

set -e

STORY_ID=$1
STORY_DESC=$2

if [ -z "$STORY_ID" ] || [ -z "$STORY_DESC" ]; then
    echo "Uso: ./story-analyzer.sh STORY-ID \"Descrição da story\""
    exit 1
fi

# Criar estrutura de diretórios
STORY_DIR=".stories/$STORY_ID"
mkdir -p "$STORY_DIR"

echo "🔍 Analisando story $STORY_ID..."

# Prompt para análise
PROMPT="Analise esta story e extraia:

## 1. Requisitos Funcionais
Liste os requisitos funcionais principais (FR-001, FR-002, etc)

## 2. Requisitos Não-Funcionais
Performance, segurança, escalabilidade, etc (NFR-001, NFR-002, etc)

## 3. Impacto no Sistema
- Módulos afetados
- Arquivos que precisarão ser criados/modificados
- Databases/schemas afetados
- Integrações externas

## 4. Dependências
- Outras stories/features
- Bibliotecas/serviços externos
- Configurações necessárias

## 5. Riscos
Identifique riscos potenciais e sugestões de mitigação

## 6. Complexidade
Estime: low, medium, high, ou critical

Story:
$STORY_DESC"

# Usar Claude via API (se tiver chave configurada)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Usando Claude API..."

    RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d "{
            \"model\": \"claude-3-5-sonnet-20241022\",
            \"max_tokens\": 4096,
            \"messages\": [{
                \"role\": \"user\",
                \"content\": $(echo "$PROMPT" | jq -Rs .)
            }]
        }")

    # Extrair resposta
    ANALYSIS=$(echo "$RESPONSE" | jq -r '.content[0].text')

    # Salvar análise
    cat > "$STORY_DIR/01-analysis.md" <<EOF
# Análise da Story: $STORY_ID

**Data**: $(date +"%Y-%m-%d %H:%M:%S")
**Story**: $STORY_DESC

---

$ANALYSIS

---

**Próximo passo**: Execute \`./story-planner.sh "$STORY_ID"\`
EOF

    echo "✅ Análise salva em: $STORY_DIR/01-analysis.md"
    echo ""
    echo "📋 Resumo:"
    echo "$ANALYSIS" | head -20
    echo ""
    echo "👉 Próximo: ./story-planner.sh \"$STORY_ID\""

else
    # Modo manual - criar template
    cat > "$STORY_DIR/01-analysis.md" <<EOF
# Análise da Story: $STORY_ID

**Data**: $(date +"%Y-%m-%d %H:%M:%S")
**Story**: $STORY_DESC

---

## 1. Requisitos Funcionais

- [ ] FR-001:
- [ ] FR-002:

## 2. Requisitos Não-Funcionais

- [ ] NFR-001: Performance -
- [ ] NFR-002: Segurança -

## 3. Impacto no Sistema

### Módulos Afetados
-

### Arquivos a Criar/Modificar
-
-

### Databases
-

### Integrações
-

## 4. Dependências

-

## 5. Riscos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
|       |            |           |

## 6. Complexidade

**Estimativa**: [ ] Low [ ] Medium [ ] High [ ] Critical

---

**Ação**: Preencha esta análise manualmente e então execute:
\`./story-planner.sh "$STORY_ID"\`

**Dica**: Use Claude/ChatGPT para preencher colando o prompt acima!
EOF

    echo "📝 Template criado em: $STORY_DIR/01-analysis.md"
    echo ""
    echo "⚠️  ANTHROPIC_API_KEY não configurada"
    echo "Opções:"
    echo "  1. Configure: export ANTHROPIC_API_KEY='sk-ant-...'"
    echo "  2. Preencha manualmente o template"
    echo "  3. Cole o prompt no Claude Web e copie resultado"
fi

# Criar metadata
cat > "$STORY_DIR/metadata.json" <<EOF
{
  "storyId": "$STORY_ID",
  "description": "$STORY_DESC",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "analyzing",
  "phase": "01-analysis"
}
EOF

echo ""
echo "📊 Metadata: $STORY_DIR/metadata.json"
