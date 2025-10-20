# Development Nginx Configuration

Esta pasta contém as configurações do Nginx para o ambiente de **desenvolvimento local**.

## Características

### 🚀 Desenvolvimento
- HTTP apenas (sem SSL)
- Rate limiting mais permissivo para testes
- Sem caching para ver mudanças imediatamente
- Headers de segurança relaxados

### 🌐 Domínios Configurados
- `localhost` / `127.0.0.1` - Frontend e Backend
- `grafana.localhost` - Grafana Dashboard
- `prometheus.localhost` - Prometheus Metrics

### 📦 Serviços
- Frontend acessível em `http://localhost:3000`
- Backend API em `http://localhost:4000` ou `http://localhost/api`
- MinIO para armazenamento em `http://localhost/media`
- Grafana em `http://localhost:3001`
- Prometheus em `http://localhost:9090`

## Como Usar

```bash
# 1. Configure as variáveis de ambiente
cp .env.development.example .env
# Edite o arquivo .env se necessário

# 2. Inicie os serviços
./scripts/deploy-development.sh

# Ou manualmente
docker compose up -d
```

## URLs Disponíveis

### Aplicação
- Frontend: http://localhost ou http://localhost:3000
- Backend API: http://localhost:4000 ou http://localhost/api
- Health Check: http://localhost/health

### Monitoramento
- Grafana: http://localhost:3001 ou http://grafana.localhost
- Prometheus: http://localhost:9090 ou http://prometheus.localhost

### Storage
- MinIO Console: http://localhost:9001
- MinIO API: http://localhost:9000
- Media (via Nginx): http://localhost/media

### Databases
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Rate Limiting

Em desenvolvimento, os limites são mais permissivos:
- API: 100 requisições/segundo
- Auth: 50 requisições/minuto

## Hot Reload

Os serviços frontend e backend suportam hot reload:
- Mudanças no código são refletidas automaticamente
- Não é necessário rebuildar os containers

## Logs

Verificar logs em desenvolvimento:

```bash
# Ver logs de todos os serviços
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend
```

## Troubleshooting

### Porta já em uso
Se alguma porta já estiver em uso, você pode:
1. Parar o serviço que está usando a porta
2. Modificar as portas no `docker-compose.yml`

### Containers não iniciam
```bash
# Parar todos os containers
docker compose down

# Remover volumes (CUIDADO: apaga dados)
docker compose down -v

# Reconstruir e iniciar
docker compose up -d --build
```
