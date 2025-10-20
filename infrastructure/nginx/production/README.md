# Production Nginx Configuration

Esta pasta contém as configurações do Nginx para o ambiente de **produção**.

## Características

### ✅ Segurança
- HTTPS obrigatório em todos os domínios
- Redirect automático de HTTP para HTTPS
- SSL/TLS configurado com certificados Let's Encrypt
- Headers de segurança (HSTS, X-Frame-Options, etc)
- Rate limiting mais restritivo

### 🌐 Domínios Configurados
- `app-socialselling.willianbvsanches.com` - Frontend (Next.js)
- `api.app-socialselling.willianbvsanches.com` - Backend API (NestJS)
- `grafana.app-socialselling.willianbvsanches.com` - Grafana Dashboard
- `prometheus.app-socialselling.willianbvsanches.com` - Prometheus Metrics

### 📦 Serviços
- Frontend servido na porta 443 (HTTPS)
- Backend API em `/api` no domínio principal e em subdomínio dedicado
- MinIO para armazenamento de mídia em `/media`
- Grafana e Prometheus em subdomínios dedicados

## Deployment

Para fazer deploy em produção:

```bash
# 1. Configure as variáveis de ambiente
cp .env.production.example .env
# Edite o arquivo .env com suas configurações

# 2. Configure SSL (primeira vez)
./infrastructure/scripts/setup-ssl.sh

# 3. Deploy
./scripts/deploy-production.sh
```

## Certificados SSL

Os certificados Let's Encrypt são montados de `/etc/letsencrypt` no host.

### Renovação Automática
Os certificados são renovados automaticamente via certbot. Certifique-se de que o cron job está configurado:

```bash
# Adicionar ao crontab
0 0,12 * * * certbot renew --quiet --nginx
```

## Rate Limiting

Em produção, os limites são mais restritivos:
- API: 10 requisições/segundo
- Auth: 5 requisições/minuto

## Monitoramento

- **Grafana**: https://grafana.app-socialselling.willianbvsanches.com
- **Prometheus**: https://prometheus.app-socialselling.willianbvsanches.com

## Logs

Verificar logs do Nginx:

```bash
# Ver logs do container
docker compose logs -f nginx

# Logs dentro do container
docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```
