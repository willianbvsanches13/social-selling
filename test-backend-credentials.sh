#!/bin/bash

echo "======================================================================"
echo "VERIFICANDO CREDENCIAIS DO BACKEND"
echo "======================================================================"

# Executar comando dentro do container para verificar as variáveis de ambiente
echo ""
echo "App ID no container:"
docker exec social-selling-backend printenv INSTAGRAM_APP_ID

echo ""
echo "App Secret no container (primeiros 8 chars):"
docker exec social-selling-backend sh -c 'echo $INSTAGRAM_APP_SECRET | cut -c1-8'

echo ""
echo "App Secret completo no container:"
docker exec social-selling-backend printenv INSTAGRAM_APP_SECRET

echo ""
echo "======================================================================"
echo "ESPERADO:"
echo "  INSTAGRAM_APP_ID=1524822958652015"
echo "  INSTAGRAM_APP_SECRET=dc074b4cd5c4679002750832c2065bc8"
echo "======================================================================"
