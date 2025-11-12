#!/bin/bash

# Script para configurar SSL no n8n standalone
# Uso: ./setup-ssl.sh [email@example.com]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

EMAIL=${1:-""}

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Erro: Email é obrigatório${NC}"
    echo "Uso: ./setup-ssl.sh seu-email@example.com"
    exit 1
fi

DOMAIN="n8n.willianbvsanches.com"

echo -e "${YELLOW}=== Setup SSL para n8n standalone ===${NC}"
echo ""
echo "Domínio: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Verificar se já existe certificado
if [ -d "data/letsencrypt/live/$DOMAIN" ]; then
    echo -e "${GREEN}✓ Certificado SSL já existe!${NC}"
    echo "Iniciando serviços com HTTPS..."
    docker compose up -d
    exit 0
fi

echo -e "${YELLOW}1. Preparando configuração HTTP (sem SSL)...${NC}"
if [ -f "nginx/conf.d/n8n.conf" ]; then
    mv nginx/conf.d/n8n.conf nginx/conf.d/n8n.conf.disabled
fi
if [ -f "nginx/conf.d/n8n-http-only.conf.disabled" ]; then
    mv nginx/conf.d/n8n-http-only.conf.disabled nginx/conf.d/n8n-http-only.conf
fi

echo -e "${GREEN}✓ Configuração HTTP ativada${NC}"

echo ""
echo -e "${YELLOW}2. Iniciando serviços (HTTP apenas)...${NC}"
docker compose up -d

echo ""
echo -e "${YELLOW}3. Aguardando serviços iniciarem...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}4. Verificando acesso ao n8n...${NC}"
if curl -sf http://localhost/health > /dev/null; then
    echo -e "${GREEN}✓ n8n está acessível${NC}"
else
    echo -e "${RED}✗ Erro: n8n não está acessível${NC}"
    echo "Verifique os logs: docker compose logs nginx"
    exit 1
fi

echo ""
echo -e "${YELLOW}5. Obtendo certificado SSL...${NC}"
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

if [ ! -d "data/letsencrypt/live/$DOMAIN" ]; then
    echo -e "${RED}✗ Erro: Falha ao obter certificado SSL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Certificado SSL obtido com sucesso!${NC}"

echo ""
echo -e "${YELLOW}6. Reconfigurando para HTTPS...${NC}"
docker compose down

mv nginx/conf.d/n8n-http-only.conf nginx/conf.d/n8n-http-only.conf.disabled
mv nginx/conf.d/n8n.conf.disabled nginx/conf.d/n8n.conf

echo -e "${GREEN}✓ Configuração HTTPS ativada${NC}"

echo ""
echo -e "${YELLOW}7. Iniciando serviços com HTTPS...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup concluído com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Acesse: https://$DOMAIN"
echo ""
echo "Comandos úteis:"
echo "  docker compose logs -f nginx  # Ver logs do nginx"
echo "  docker compose logs -f n8n    # Ver logs do n8n"
echo "  docker compose ps             # Ver status dos serviços"
