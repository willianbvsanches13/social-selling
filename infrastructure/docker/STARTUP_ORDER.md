# 🚀 Ordem de Inicialização dos Serviços

## 📋 Problema Original

Quando rodávamos `docker compose up -d`, todos os serviços iniciavam **simultaneamente**, causando:

1. ❌ Nginx tentando se conectar ao backend antes dele estar pronto
2. ❌ Erro: `host not found in upstream "backend:4000"`
3. ❌ Nginx reiniciando múltiplas vezes até backend ficar disponível

## ✅ Solução Implementada

### Dupla Proteção

Implementamos **duas** soluções complementares:

#### 1. DNS Resolver Dinâmico

```nginx
# infrastructure/nginx/*/conf.d/default.conf
resolver 127.0.0.11 valid=30s;
```

**Benefício**: Nginx resolve hosts dinamicamente e não falha se um upstream está temporariamente indisponível.

#### 2. Health Check Dependencies (Solução Principal)

```yaml
# docker-compose.yml
nginx:
  depends_on:
    minio:
      condition: service_healthy
    backend:
      condition: service_healthy
    frontend:
      condition: service_healthy
```

**Benefício**: Docker Compose **aguarda** os serviços ficarem healthy antes de iniciar o Nginx.

## 🔄 Ordem de Inicialização

Com as mudanças, a ordem de startup é:

```
1. Redes e volumes são criados

2. Serviços base iniciam (em paralelo):
   ├─ postgres
   ├─ redis
   └─ minio

3. Aguarda health checks:
   ├─ postgres: healthy ✓
   ├─ redis: healthy ✓
   └─ minio: healthy ✓

4. Serviços dependentes iniciam:
   ├─ backend (depende de postgres + redis)
   ├─ frontend (depende de backend)
   ├─ worker (depende de postgres + redis)
   ├─ prometheus
   └─ grafana

5. Aguarda health checks:
   ├─ backend: healthy ✓
   └─ frontend: healthy ✓

6. Nginx inicia (último)
   └─ Todos os upstreams já estão disponíveis ✓
```

## 🏥 Health Checks Configurados

### Backend
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "${API_URL}/health/ready"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 30s
```

### Frontend
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "${APP_URL}"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 30s
```

### MinIO
```yaml
healthcheck:
  test: ["CMD", "mc", "ready", "local"]
  interval: 30s
  timeout: 20s
  retries: 3
```

### Postgres
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## 📊 Benefícios

### Antes
```
docker compose up -d
  ⏱️  ~5-10 segundos
  ❌ Nginx falhando e reiniciando
  ❌ Logs cheios de erros
  ⚠️  Serviço instável nos primeiros 30-60 segundos
```

### Agora
```
docker compose up -d
  ⏱️  ~30-45 segundos (aguarda health checks)
  ✅ Nginx inicia apenas quando tudo está pronto
  ✅ Logs limpos, sem erros
  ✅ Serviço estável desde o início
```

## 🔍 Verificando a Ordem

```bash
# Ver ordem de startup
docker compose up -d

# Acompanhar em tempo real
docker compose logs -f --timestamps

# Ver status de health
docker compose ps
```

Output esperado:
```
NAME                   STATUS
postgres               Up (healthy)
redis                  Up (healthy)
minio                  Up (healthy)
backend                Up (healthy)
frontend               Up (healthy)
nginx                  Up (healthy)
```

## ⚙️ Configuração do depends_on

### Sintaxe Básica (Antiga - NÃO USAR)
```yaml
depends_on:
  - backend
  - frontend
```
❌ **Problema**: Apenas garante ordem de START, não aguarda o serviço estar pronto.

### Sintaxe com Health Check (Correta)
```yaml
depends_on:
  backend:
    condition: service_healthy
  frontend:
    condition: service_healthy
```
✅ **Correto**: Aguarda os serviços ficarem healthy antes de iniciar.

## 🐛 Troubleshooting

### Serviço não inicia

```bash
# Ver qual serviço está travando
docker compose ps

# Ver logs do serviço com problema
docker compose logs [service]

# Verificar health check
docker inspect [container-name] | grep -A 10 Health
```

### Health check falhando

```bash
# Testar health check manualmente
docker compose exec [service] [health-check-command]

# Exemplo para backend:
docker compose exec backend wget --quiet --tries=1 --spider http://localhost:4000/health/ready
```

### Timeout na inicialização

Se os serviços estão demorando muito:

```yaml
# Ajustar start_period (tempo de aquecimento)
healthcheck:
  start_period: 60s  # Dá mais tempo para o serviço iniciar
```

## 📝 Notas Importantes

1. **start_period**: Período de aquecimento onde falhas são ignoradas
2. **interval**: Frequência de verificação do health check
3. **timeout**: Tempo máximo para o comando health check responder
4. **retries**: Quantas falhas consecutivas antes de marcar como unhealthy

## 🎯 Resultado Final

✅ Nginx SEMPRE inicia após backend/frontend estarem prontos
✅ Sem erros de "host not found"
✅ Startup limpo e confiável
✅ Logs sem ruído
✅ Serviços estáveis desde o início
