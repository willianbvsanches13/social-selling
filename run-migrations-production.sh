#!/bin/bash

# Script para executar migrations no servidor de produção
# Execute este script NO SERVIDOR DE PRODUÇÃO

set -e

echo "========================================="
echo "Executando Migrations no Servidor de Produção"
echo "========================================="
echo ""

# Diretório das migrations
MIGRATIONS_DIR="backend/migrations"

# Verificar se o diretório existe
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Erro: Diretório de migrations não encontrado: $MIGRATIONS_DIR"
    exit 1
fi

# Contar migrations
TOTAL_MIGRATIONS=$(ls -1 $MIGRATIONS_DIR/0*.sql 2>/dev/null | wc -l)
echo "📊 Total de migrations encontradas: $TOTAL_MIGRATIONS"
echo ""

# Contador de sucesso/falha
SUCCESS_COUNT=0
FAILED_COUNT=0

# Executar cada migration em ordem
for file in $MIGRATIONS_DIR/0*.sql; do
    if [ -f "$file" ]; then
        echo "========================================="
        echo "📄 Executando: $(basename $file)"
        echo "========================================="

        # Executar migration no container do PostgreSQL
        if docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < "$file" 2>&1; then
            echo "✅ Migration executada: $(basename $file)"
            ((SUCCESS_COUNT++))
        else
            echo "❌ Erro ao executar: $(basename $file)"
            ((FAILED_COUNT++))
        fi

        echo ""
    fi
done

# Resumo final
echo "========================================="
echo "📊 RESUMO DA EXECUÇÃO"
echo "========================================="
echo "Total de migrations: $TOTAL_MIGRATIONS"
echo "✅ Executadas com sucesso: $SUCCESS_COUNT"
echo "❌ Com erros: $FAILED_COUNT"
echo ""

# Verificar tabelas criadas
echo "========================================="
echo "🔍 Verificando tabelas criadas..."
echo "========================================="
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "\dt" | grep -E "(users|refresh_tokens|client_accounts|products|conversations|messages)"

echo ""
echo "========================================="
echo "✅ Migrations concluídas!"
echo "========================================="
