#!/bin/bash

# Script para gerar certificado SSL para n8n.willianbvsanches.com
# Execute este script no servidor de produção após fazer o deploy

set -e

echo "🔐 Gerando certificado SSL para n8n.willianbvsanches.com"
echo ""

# Verificar se o domínio está configurado no DNS
echo "📡 Verificando DNS..."
if ! nslookup n8n.willianbvsanches.com > /dev/null 2>&1; then
    echo "❌ Erro: Domínio n8n.willianbvsanches.com não está configurado no DNS!"
    echo ""
    echo "Por favor, adicione o seguinte registro DNS:"
    echo "  Tipo: A"
    echo "  Nome: n8n"
    echo "  Valor: [IP do seu servidor]"
    echo ""
    exit 1
fi

echo "✅ DNS configurado corretamente"
echo ""

# Verificar se o nginx está rodando
if ! docker ps | grep -q "social-selling-nginx"; then
    echo "❌ Erro: Nginx não está rodando!"
    echo "Execute 'docker-compose up -d nginx' primeiro"
    exit 1
fi

echo "✅ Nginx está rodando"
echo ""

# Gerar certificado com certbot
echo "📜 Solicitando certificado SSL..."
echo ""

docker run -it --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email willianbvsanches@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d n8n.willianbvsanches.com

# Verificar se o certificado foi criado
if [ -f "/etc/letsencrypt/live/n8n.willianbvsanches.com/fullchain.pem" ]; then
    echo ""
    echo "✅ Certificado SSL gerado com sucesso!"
    echo ""
    echo "🔄 Recarregando configuração do Nginx..."
    docker exec social-selling-nginx nginx -s reload
    echo ""
    echo "🎉 Configuração completa!"
    echo ""
    echo "Você pode acessar o n8n em: https://n8n.willianbvsanches.com"
else
    echo ""
    echo "❌ Erro ao gerar certificado!"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi
