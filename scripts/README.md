# 🛠️ Scripts de Deployment e Utilitários

Este diretório contém scripts para facilitar o deployment e manutenção da aplicação.

## 📋 Scripts Disponíveis

### ➕ add-env-var.sh

Assistente interativo para adicionar novas variáveis de ambiente seguindo as melhores práticas.

```bash
./scripts/add-env-var.sh
```

**O que faz:**
1. ✅ Coleta informações sobre a variável
2. ✅ Adiciona automaticamente em `.env.example`
3. ✅ Adiciona automaticamente em `scripts/check-env.sh`
4. ⚠️  Orienta onde adicionar manualmente em outros arquivos
5. 📝 Fornece comandos de teste

**Quando usar:**
- Sempre que adicionar uma nova variável de ambiente
- Garante consistência em todos os arquivos
- Segue as regras do `ENV_VARIABLES_RULES.md`

**Exemplo de uso:**
```bash
$ ./scripts/add-env-var.sh

🔐 Environment Variable Addition Wizard
========================================

📝 Step 1: Variable Information
--------------------------------
Variable name: TWILIO_AUTH_TOKEN
Description: Twilio authentication token
Default/Example value: YOUR_TWILIO_AUTH_TOKEN

Variable type:
1) Secret/Password (will be auto-generated)
2) API Key (requires manual setup)
Type (1-2): 2

Which services need this variable?
1) Backend only
2) Worker only
3) Backend + Worker
Choice (1-3): 3

✅ Added to .env.example
✅ Added to check-env.sh
⚠️  Manual updates needed in:
   - docker-compose.yml
   - backend/src/config/configuration.ts
```

---

### 🔐 generate-keys.sh

Gera chaves seguras aleatórias para variáveis de ambiente.

```bash
./scripts/generate-keys.sh
```

**Uso:**
1. Execute o script
2. Copie as chaves geradas
3. Cole no arquivo `.env`

**Gera:**
- `JWT_SECRET` (64 bytes)
- `JWT_REFRESH_SECRET` (64 bytes)
- `SESSION_SECRET` (32 bytes)
- `OAUTH_ENCRYPTION_KEY` (32 bytes) **← OBRIGATÓRIO**
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` (hex)
- `MINIO_ROOT_PASSWORD` + `MINIO_SECRET_KEY`
- `GRAFANA_ADMIN_PASSWORD`

---

### 🔍 check-env.sh

Verifica se todas as variáveis obrigatórias estão configuradas no `.env`.

```bash
./scripts/check-env.sh
```

**Verifica:**
- ✅ Variáveis obrigatórias presentes
- ⚠️  Variáveis com valores padrão (CHANGE_ME)
- ❌ Variáveis faltando

**Saída:**
- Exit code 0: Tudo OK
- Exit code 1: Problemas encontrados

---

### 🚀 deploy-production.sh

Script completo de deployment para produção.

```bash
./scripts/deploy-production.sh
```

**O que faz:**
1. ✅ Verifica se `.env` existe
2. ✅ Confirma se `NODE_ENV=production`
3. ✅ Executa `check-env.sh`
4. 🛑 Para containers existentes
5. 🗑️  Remove `docker-compose.override.yml` (dev only)
6. 📦 Pull de imagens (se existirem)
7. 🏗️  Build e start dos services
8. ⏳ Aguarda services ficarem healthy
9. 📊 Mostra status e logs
10. ✅ Exibe URLs da aplicação

**Uso típico em produção:**
```bash
git pull origin main
./scripts/deploy-production.sh
```

---

### 🧪 deploy-development.sh

Script para ambiente de desenvolvimento local.

```bash
./scripts/deploy-development.sh
```

**O que faz:**
1. ✅ Verifica se `.env` existe
2. ✅ Confirma se `NODE_ENV=development`
3. 🏗️  Build e start com hot reload
4. 📊 Mostra status

**Diferenças vs produção:**
- Usa `docker-compose.override.yml` (hot reload)
- Sem SSL
- Sem otimizações de build

---

### 🔄 switch-environment.sh

Alterna entre ambientes development e production localmente.

```bash
./scripts/switch-environment.sh development
./scripts/switch-environment.sh production
```

**O que faz:**
1. Atualiza `NODE_ENV` no `.env`
2. Para containers
3. Rebuild com novo target
4. Mostra status

---

### 🏗️ build-production.sh

Build manual da aplicação (normalmente não é necessário).

```bash
./scripts/build-production.sh
```

**Quando usar:**
- Testar build localmente
- Debug de problemas de build
- CI/CD pipelines

**Nota:** Com a configuração atual, o build acontece automaticamente no Dockerfile em produção.

---

## 🔥 Workflow Recomendado

### Primeira Vez (Setup Inicial)

```bash
# 1. Criar arquivo .env
cp .env.example .env

# 2. Gerar chaves seguras
./scripts/generate-keys.sh

# 3. Copiar as chaves geradas para o .env
nano .env

# 4. Verificar se está tudo OK
./scripts/check-env.sh

# 5. Deploy
./scripts/deploy-development.sh  # ou deploy-production.sh
```

### Desenvolvimento Diário

```bash
# Apenas iniciar
docker compose up -d

# Hot reload está ativo, código é montado via volumes
# Edite os arquivos e veja as mudanças instantaneamente
```

### Deploy em Produção

```bash
# No servidor
ssh user@server

# Atualizar código
git pull origin main

# Deploy automático
./scripts/deploy-production.sh

# Monitorar
docker compose logs -f backend frontend
```

### Troubleshooting

```bash
# Verificar configuração
./scripts/check-env.sh

# Ver status dos containers
docker compose ps

# Ver logs
docker compose logs backend
docker compose logs frontend

# Reiniciar um serviço específico
docker compose restart backend

# Rebuild completo
docker compose down
docker compose up -d --build
```

---

## ⚠️ Importantes

### Variáveis Obrigatórias

**Nunca deixe valores padrão em produção!**

```bash
# ❌ ERRADO (valores padrão)
JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_64

# ✅ CORRETO (valor gerado)
JWT_SECRET=xK7mP9vQ2wR5tY8uI1oP4sD6fG9hJ3kL5nM8qW0eR2tY5uI8oP1a==
```

### Segurança

- 🔒 Nunca commite `.env` no git
- 🔑 Use chaves diferentes para dev e prod
- 🔐 Gere novas chaves com `./scripts/generate-keys.sh`
- 🚫 Não compartilhe chaves em mensagens/email

### docker-compose.override.yml

- ✅ **Local**: Mantém o arquivo (hot reload)
- ❌ **Produção**: Remove o arquivo (usa código do Docker image)
- 📦 Já configurado no `.gitignore`

---

## 🆘 Problemas Comuns

### "OAUTH_ENCRYPTION_KEY is required"

```bash
# Gerar chave
openssl rand -base64 32

# Adicionar ao .env
echo "OAUTH_ENCRYPTION_KEY=<chave-gerada>" >> .env

# Reiniciar
docker compose restart backend worker
```

### "Backend is unhealthy"

```bash
# Ver logs
docker logs social-selling-backend --tail 100

# Verificar variáveis
./scripts/check-env.sh

# Reiniciar
docker compose restart backend
```

### "Build manual é necessário"

Se você precisa rodar `npm run build` manualmente, algo está errado:

```bash
# Verificar se docker-compose.override.yml existe em produção
ls -la docker-compose.override.yml

# Se existir, remover
rm docker-compose.override.yml

# Rebuild
docker compose down
docker compose up -d --build
```

---

## 📚 Documentação Adicional

- [FIX_PRODUCTION.md](../FIX_PRODUCTION.md) - Correção rápida de problemas em produção
- [DOCKER_VOLUMES_FIX.md](../DOCKER_VOLUMES_FIX.md) - Explicação detalhada do sistema de volumes
- [.env.example](../.env.example) - Template de configuração

---

## 🤝 Contribuindo

Ao adicionar novos scripts:

1. Torne executável: `chmod +x scripts/new-script.sh`
2. Adicione documentação aqui
3. Use `set -e` para falhar em erros
4. Adicione mensagens descritivas com emojis
5. Teste em dev antes de produção
