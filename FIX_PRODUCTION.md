# 🚨 Correção Urgente - Produção

## Problema

Backend falhando com erro: **`OAUTH_ENCRYPTION_KEY is required for OAuth token encryption`**

## Solução Rápida (5 minutos)

### 1. Gerar a chave necessária

No servidor, execute:

```bash
# Gerar OAUTH_ENCRYPTION_KEY
openssl rand -base64 32
```

Isso vai gerar algo como: `xK7mP9vQ2wR5tY8uI1oP4sD6fG9hJ3kL5nM8qW0eR2tY5uI8oP1a==`

### 2. Adicionar ao arquivo .env

```bash
# Editar o .env
nano .env

# Adicionar esta linha (substituir pela chave gerada acima):
OAUTH_ENCRYPTION_KEY=xK7mP9vQ2wR5tY8uI1oP4sD6fG9hJ3kL5nM8qW0eR2tY5uI8oP1a==
```

### 3. Reiniciar os containers

```bash
docker compose restart backend worker
```

### 4. Verificar se funcionou

```bash
# Ver logs do backend
docker logs social-selling-backend --tail 50

# Deve mostrar: "Nest application successfully started"
```

## Verificação Completa de Variáveis

Para garantir que nenhuma variável está faltando:

```bash
# Gerar todas as chaves necessárias
./scripts/generate-keys.sh

# Verificar configuração
./scripts/check-env.sh
```

## Variáveis Obrigatórias

Certifique-se de que estas variáveis estão no `.env`:

```bash
# Segurança (OBRIGATÓRIO)
OAUTH_ENCRYPTION_KEY=         # ← ADICIONAR ESTA!
JWT_SECRET=
JWT_REFRESH_SECRET=
SESSION_SECRET=

# Senhas
POSTGRES_PASSWORD=
REDIS_PASSWORD=
MINIO_ROOT_PASSWORD=
GRAFANA_ADMIN_PASSWORD=

# Instagram (se estiver usando)
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
```

## Comandos Úteis

```bash
# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f backend

# Reiniciar tudo
docker compose restart

# Rebuild completo (se necessário)
docker compose down
docker compose up -d --build
```

## Outros Problemas Encontrados

### MinIO Signature Error

Se aparecer: `"The request signature we calculated does not match..."`

**Causa**: Credenciais do MinIO incorretas ou não configuradas.

**Solução**:

```bash
# Editar o .env
nano .env

# Verificar se estas variáveis estão definidas:
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=sua_senha_forte_aqui

# IMPORTANTE: Adicionar estas linhas também:
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=sua_senha_forte_aqui

# Ou usar substituição de variáveis:
MINIO_ACCESS_KEY=${MINIO_ROOT_USER}
MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}
```

**Reiniciar os serviços:**

```bash
docker compose restart backend worker minio
```

**Verificar se MinIO está funcionando:**

```bash
# Ver logs do MinIO
docker logs social-selling-minio --tail 50

# Testar conexão
curl http://localhost:9000/minio/health/live
```

### Endpoint /metrics não encontrado

Esse é um aviso, não é crítico. O Prometheus está tentando coletar métricas mas o endpoint não está implementado ainda.

## Checklist Pós-Deploy

- [ ] Backend iniciou sem erros
- [ ] Frontend acessível
- [ ] Nginx respondendo em HTTPS
- [ ] Grafana acessível
- [ ] Prometheus coletando métricas
- [ ] Sem erros nos logs do backend
- [ ] Healthcheck passando: `curl http://localhost:4000/health`

## Se Nada Funcionar

Rollback rápido:

```bash
# Voltar para a versão anterior
git checkout HEAD~1
docker compose down
docker compose up -d --build
```

Depois reporte o problema com os logs:

```bash
docker compose logs > error-logs.txt
```
