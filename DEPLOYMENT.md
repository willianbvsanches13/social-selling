# Deployment Guide

Guia completo para deploy da aplicação Social Selling em diferentes ambientes.

## 📋 Índice

- [Ambientes](#ambientes)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Produção](#produção)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Troubleshooting](#troubleshooting)

## 🌍 Ambientes

A aplicação suporta dois ambientes distintos:

### Development (Local)
- HTTP apenas (sem SSL)
- Rate limiting permissivo
- Hot reload ativado
- Logs detalhados
- URLs: `localhost`, `127.0.0.1`

### Production
- HTTPS obrigatório com Let's Encrypt
- Rate limiting restritivo
- Otimizado para performance
- URLs: `app-socialselling.willianbvsanches.com`

## 🚀 Desenvolvimento Local

### Pré-requisitos
- Docker e Docker Compose instalados
- Portas 80, 443, 3000, 4000, 5432, 6379, 9000, 9001, 9090, 3001 disponíveis

### Setup Inicial

1. **Clone o repositório**
```bash
git clone <repository-url>
cd social-selling-2
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.development.example .env
```

3. **Inicie os serviços**
```bash
./scripts/deploy-development.sh
```

### URLs de Desenvolvimento

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Nginx (Tudo) | http://localhost |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| MinIO Console | http://localhost:9001 |

### Comandos Úteis

```bash
# Ver logs
docker compose logs -f [service]

# Reiniciar um serviço
docker compose restart [service]

# Reconstruir serviços
docker compose up -d --build [service]

# Parar tudo
docker compose down

# Parar e remover volumes (CUIDADO!)
docker compose down -v
```

## 🏭 Produção

### Pré-requisitos
- Servidor VPS com Ubuntu/Debian
- Docker e Docker Compose instalados
- Domínio configurado apontando para o servidor
- Portas 80 e 443 abertas no firewall

### Setup Inicial em Produção

1. **Conecte ao servidor**
```bash
ssh user@your-server-ip
```

2. **Clone o repositório**
```bash
git clone <repository-url>
cd social-selling-2
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.production.example .env
nano .env  # Edite com suas configurações
```

**IMPORTANTE**: Altere todos os secrets e passwords!

4. **Configure SSL (primeira vez)**
```bash
./infrastructure/scripts/setup-ssl.sh
```

Este script irá:
- Obter certificados SSL do Let's Encrypt
- Configurar renovação automática
- Configurar o Nginx para HTTPS

5. **Deploy da aplicação**
```bash
./scripts/deploy-production.sh
```

### URLs de Produção

| Serviço | URL |
|---------|-----|
| Frontend | https://app-socialselling.willianbvsanches.com |
| Backend API | https://api.app-socialselling.willianbvsanches.com |
| Grafana | https://grafana.app-socialselling.willianbvsanches.com |
| Prometheus | https://prometheus.app-socialselling.willianbvsanches.com |

### Atualizações em Produção

```bash
# 1. Conecte ao servidor
ssh user@your-server-ip
cd social-selling-2

# 2. Atualize o código
git pull origin main

# 3. Reconstrua e reinicie
docker compose down
docker compose up -d --build

# 4. Verifique os logs
docker compose logs -f
```

### Backup e Restore

#### Backup do Banco de Dados
```bash
# Criar backup
docker compose exec postgres pg_dump -U postgres social_selling > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20250120.sql | docker compose exec -T postgres psql -U postgres social_selling
```

#### Backup de Arquivos (MinIO)
```bash
# Backup
docker compose exec minio mc mirror local/social-selling /backup/minio/

# Restore
docker compose exec minio mc mirror /backup/minio/ local/social-selling/
```

## 📝 Scripts Disponíveis

### deploy-development.sh
Deploy em ambiente de desenvolvimento local.

```bash
./scripts/deploy-development.sh
```

### deploy-production.sh
Deploy em ambiente de produção.

```bash
./scripts/deploy-production.sh
```

### switch-environment.sh
Troca entre ambientes alterando NODE_ENV.

```bash
./scripts/switch-environment.sh [development|production]
```

## 🔧 Variáveis de Ambiente

### Principais Variáveis

| Variável | Desenvolvimento | Produção |
|----------|-----------------|----------|
| `NODE_ENV` | development | production |
| `APP_URL` | http://localhost | https://app-socialselling.willianbvsanches.com |
| `API_URL` | http://localhost:4000 | https://api.app-socialselling.willianbvsanches.com |
| `SSL_CERT_PATH` | ./infrastructure/nginx/ssl-dummy | /etc/letsencrypt |

### Secrets que DEVEM ser alterados em produção

⚠️ **NUNCA use valores padrão em produção!**

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `OAUTH_ENCRYPTION_KEY`
- `MINIO_ROOT_PASSWORD`
- `GRAFANA_ADMIN_PASSWORD`
- `INSTAGRAM_APP_SECRET`

### Gerando Secrets Seguros

```bash
# Gerar um secret aleatório
openssl rand -base64 32

# Gerar múltiplos secrets
for i in {1..5}; do openssl rand -base64 32; done
```

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# Verificar status dos containers
docker compose ps

# Ver logs de erro
docker compose logs [service]

# Verificar uso de recursos
docker stats
```

### Problemas com SSL em Produção

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --nginx

# Verificar configuração do Nginx
docker compose exec nginx nginx -t
```

### Banco de Dados não conecta

```bash
# Verificar se o PostgreSQL está rodando
docker compose ps postgres

# Verificar logs
docker compose logs postgres

# Conectar diretamente
docker compose exec postgres psql -U postgres -d social_selling
```

### Reset Completo (CUIDADO!)

```bash
# Para desenvolvimento apenas!
docker compose down -v
rm -rf postgres-data redis-data minio-data
docker compose up -d --build
```

### Problemas de Porta em Uso

```bash
# Verificar portas em uso
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000
sudo lsof -i :4000

# Parar serviço ocupando a porta
sudo systemctl stop [service]
```

## 📊 Monitoramento

### Verificar Saúde dos Serviços

```bash
# Via API
curl http://localhost/health
curl http://localhost:4000/health/ready

# Via Docker
docker compose ps
docker compose logs -f
```

### Acessar Métricas

- **Grafana**: Dashboards visuais de métricas
- **Prometheus**: Métricas brutas e queries

## 🔐 Segurança

### Checklist de Segurança para Produção

- [ ] Todos os secrets foram alterados
- [ ] SSL/HTTPS está funcionando
- [ ] Firewall configurado (apenas portas 80, 443, 22)
- [ ] Backup automático configurado
- [ ] Logs sendo monitorados
- [ ] Rate limiting ativo
- [ ] Headers de segurança configurados
- [ ] Acesso SSH com chave (não senha)
- [ ] Usuário não-root configurado
- [ ] Fail2ban instalado e configurado

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `docker compose logs -f`
2. Verifique a documentação em `/infrastructure/nginx/`
3. Consulte este guia de troubleshooting
4. Abra uma issue no repositório
