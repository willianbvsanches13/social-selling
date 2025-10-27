# Guia de Configuração SSL com Certbot

Este guia explica como configurar e gerenciar certificados SSL Let's Encrypt para o Social Selling.

## Pré-requisitos

1. **DNS Configurado**: Todos os domínios devem apontar para o IP do servidor:
   - `app-socialselling.willianbvsanches.com`
   - `api.app-socialselling.willianbvsanches.com`
   - `storage.app-socialselling.willianbvsanches.com` (NOVO!)
   - `grafana.app-socialselling.willianbvsanches.com`
   - `prometheus.app-socialselling.willianbvsanches.com`

2. **Portas abertas**: Certifique-se de que as portas 80 e 443 estão abertas no firewall

3. **Docker Compose**: Todos os containers devem estar rodando

## Configuração Inicial

### 1. Subir o container Certbot

```bash
docker compose up -d certbot
```

### 2. Gerar certificados para todos os domínios

Use o script automatizado:

```bash
./scripts/setup-ssl.sh setup
```

Ou manualmente para cada domínio:

```bash
# App principal
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@willianbvsanches.com \
  --agree-tos \
  --no-eff-email \
  -d app-socialselling.willianbvsanches.com

# API
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@willianbvsanches.com \
  --agree-tos \
  --no-eff-email \
  -d api.app-socialselling.willianbvsanches.com

# Storage (NOVO!)
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@willianbvsanches.com \
  --agree-tos \
  --no-eff-email \
  -d storage.app-socialselling.willianbvsanches.com

# Grafana
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@willianbvsanches.com \
  --agree-tos \
  --no-eff-email \
  -d grafana.app-socialselling.willianbvsanches.com

# Prometheus
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@willianbvsanches.com \
  --agree-tos \
  --no-eff-email \
  -d prometheus.app-socialselling.willianbvsanches.com
```

### 3. Reiniciar o Nginx

Após obter todos os certificados:

```bash
docker compose restart nginx
```

## Gerenciamento de Certificados

### Listar certificados existentes

```bash
./scripts/setup-ssl.sh list
```

Ou manualmente:

```bash
docker compose run --rm certbot certificates
```

### Renovar certificados

Os certificados são renovados automaticamente a cada 12 horas pelo container certbot.

Para renovar manualmente:

```bash
./scripts/setup-ssl.sh renew
```

Ou:

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Adicionar um novo domínio

```bash
./scripts/setup-ssl.sh add novo-dominio.willianbvsanches.com
```

### Testar configuração do Nginx

```bash
./scripts/setup-ssl.sh test
```

Ou:

```bash
docker compose exec nginx nginx -t
```

## Estrutura de Diretórios

```
/etc/letsencrypt/
├── accounts/          # Conta Let's Encrypt
├── archive/          # Certificados originais
├── live/             # Links simbólicos para certificados atuais
│   ├── app-socialselling.willianbvsanches.com/
│   │   ├── fullchain.pem
│   │   ├── privkey.pem
│   │   └── ...
│   ├── api.app-socialselling.willianbvsanches.com/
│   ├── storage.app-socialselling.willianbvsanches.com/
│   ├── grafana.app-socialselling.willianbvsanches.com/
│   └── prometheus.app-socialselling.willianbvsanches.com/
└── renewal/          # Configuração de renovação

/var/www/certbot/     # Webroot para verificação ACME
```

## Troubleshooting

### Erro: "Port 80 already in use"

Certifique-se de que o nginx está rodando e configurado corretamente:

```bash
docker compose ps nginx
docker compose logs nginx
```

### Erro: "DNS problem: NXDOMAIN"

O domínio não está apontando para o servidor. Verifique a configuração DNS:

```bash
dig app-socialselling.willianbvsanches.com
nslookup app-socialselling.willianbvsanches.com
```

### Erro: "Connection refused"

Verifique se as portas 80 e 443 estão abertas:

```bash
# No servidor
sudo ufw status
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### Certificado expirado

Os certificados Let's Encrypt expiram a cada 90 dias. O container certbot renova automaticamente, mas você pode forçar a renovação:

```bash
docker compose run --rm certbot renew --force-renewal
docker compose exec nginx nginx -s reload
```

### Ver logs do Certbot

```bash
docker compose logs certbot
```

## Renovação Automática

O container certbot está configurado para:
- Verificar renovação a cada 12 horas
- Renovar certificados que expiram em menos de 30 dias
- Recarregar automaticamente o nginx após renovação

Para verificar se a renovação automática está funcionando:

```bash
docker compose logs -f certbot
```

## Comandos Úteis

```bash
# Ver status dos containers
docker compose ps

# Ver logs do certbot
docker compose logs certbot

# Ver logs do nginx
docker compose logs nginx

# Parar o certbot
docker compose stop certbot

# Reiniciar o certbot
docker compose restart certbot

# Remover certificados (CUIDADO!)
docker compose run --rm certbot delete --cert-name app-socialselling.willianbvsanches.com
```

## Segurança

1. **Backup dos certificados**: Faça backup regular de `/etc/letsencrypt/`
2. **Permissões**: Os certificados têm permissões restritas (600)
3. **Rate Limits**: Let's Encrypt tem limites de taxa (5 certificados por domínio por semana)
4. **Renovação**: Renove antes do vencimento (30 dias de antecedência)

## Referências

- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Rate Limits](https://letsencrypt.org/docs/rate-limits/)
