# 🚀 Checklist Pré-Deploy - Social Selling

## ⚠️ IMPORTANTE: Execute ANTES de fazer push para produção!

---

## ✅ Validações Automáticas Concluídas

- [x] ✅ Pastas `infrastructure/nginx/development/` e `production/` criadas
- [x] ✅ Arquivos `nginx.conf` em ambos ambientes validados
- [x] ✅ Arquivos `conf.d/default.conf` em ambos ambientes criados
- [x] ✅ Sintaxe do Nginx validada (sem erros)
- [x] ✅ `docker-compose.yml` validado
- [x] ✅ Scripts de deploy criados e com permissão de execução

---

## 📋 Checklist Manual - FAÇA AGORA

### 1. Variáveis de Ambiente (CRÍTICO!)

```bash
# No servidor de produção, você DEVE:
cd /caminho/do/projeto
cp .env.production.example .env
nano .env
```

**Altere TODOS os valores abaixo:**
- [ ] `POSTGRES_PASSWORD` - Senha forte e única
- [ ] `REDIS_PASSWORD` - Senha forte e única
- [ ] `JWT_SECRET` - Mínimo 32 caracteres aleatórios
- [ ] `JWT_REFRESH_SECRET` - Mínimo 32 caracteres aleatórios
- [ ] `OAUTH_ENCRYPTION_KEY` - Exatamente 32 caracteres
- [ ] `MINIO_ROOT_PASSWORD` - Senha forte
- [ ] `GRAFANA_ADMIN_PASSWORD` - Senha forte
- [ ] `INSTAGRAM_APP_ID` - Seu App ID real
- [ ] `INSTAGRAM_APP_SECRET` - Seu App Secret real
- [ ] `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` - Token único

**Comando para gerar secrets:**
```bash
# Gerar 5 secrets aleatórios
for i in {1..5}; do openssl rand -base64 32; done
```

### 2. SSL/Certificados (PRIMEIRA VEZ EM PRODUÇÃO)

- [ ] DNS configurado apontando para o servidor
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Certificados Let's Encrypt ainda não configurados

**Se é a primeira vez:**
```bash
# No servidor
./infrastructure/scripts/setup-ssl.sh
```

**Se já tem certificados:**
- [ ] Certificados em `/etc/letsencrypt/live/app-socialselling.willianbvsanches.com/`
- [ ] Certificados em `/etc/letsencrypt/live/api.app-socialselling.willianbvsanches.com/`
- [ ] Renovação automática configurada (cron)

### 3. Configuração do Servidor

- [ ] Docker instalado
- [ ] Docker Compose instalado
- [ ] Git instalado
- [ ] Usuário não-root criado
- [ ] SSH com chave (não senha)
- [ ] Firewall configurado (apenas portas 22, 80, 443)

### 4. Backup (Se já existe uma instalação)

```bash
# Backup do banco de dados
docker compose exec postgres pg_dump -U postgres social_selling > backup_$(date +%Y%m%d).sql

# Backup dos volumes
docker compose down
sudo tar -czf volumes_backup_$(date +%Y%m%d).tar.gz postgres-data/ redis-data/ minio-data/
```

- [ ] Backup do banco de dados criado
- [ ] Backup dos volumes criado
- [ ] Backups copiados para local seguro

---

## 🧪 Teste Local (OPCIONAL mas Recomendado)

### Teste em Desenvolvimento Local

```bash
# 1. Criar .env de desenvolvimento
cp .env.development.example .env

# 2. Verificar NODE_ENV
grep NODE_ENV .env
# Deve mostrar: NODE_ENV=development

# 3. Testar deploy
./scripts/deploy-development.sh

# 4. Verificar serviços
docker compose ps

# 5. Testar endpoints
curl http://localhost/health

# 6. Parar após teste
docker compose down
```

- [ ] Teste local executado
- [ ] Todos os serviços iniciaram com sucesso
- [ ] Endpoints respondendo corretamente

---

## 🔍 Verificações Pré-Deploy

### Arquivos Essenciais Criados

```bash
# Verificar se existem
ls -la infrastructure/nginx/development/nginx.conf
ls -la infrastructure/nginx/development/conf.d/default.conf
ls -la infrastructure/nginx/production/nginx.conf
ls -la infrastructure/nginx/production/conf.d/default.conf
ls -la scripts/deploy-production.sh
ls -la scripts/deploy-development.sh
ls -la .env.production.example
```

- [ ] Todos os arquivos acima existem
- [ ] Scripts têm permissão de execução (`chmod +x`)

### Git Status

```bash
git status
```

- [ ] Todas as mudanças commitadas
- [ ] Nenhum arquivo `.env` com secrets será commitado
- [ ] `.env` está no `.gitignore`

---

## 🚀 Deploy em Produção

### No Servidor (SSH)

```bash
# 1. Conectar ao servidor
ssh user@seu-servidor-ip

# 2. Navegar para o projeto (ou clonar se primeira vez)
cd /opt/social-selling-2  # ou onde você mantém o projeto
# OU
git clone <repo-url> /opt/social-selling-2
cd /opt/social-selling-2

# 3. Pull das últimas mudanças
git pull origin main

# 4. Configurar .env (SE NÃO FEZ AINDA)
cp .env.production.example .env
nano .env  # ALTERE TODOS OS SECRETS!

# 5. Configurar SSL (SE É A PRIMEIRA VEZ)
./infrastructure/scripts/setup-ssl.sh

# 6. Deploy
./scripts/deploy-production.sh

# 7. Verificar logs
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend
```

---

## ✅ Verificação Pós-Deploy

### URLs Funcionando

- [ ] https://app-socialselling.willianbvsanches.com (HTTPS)
- [ ] https://api.app-socialselling.willianbvsanches.com (HTTPS)
- [ ] http://app-socialselling.willianbvsanches.com → redirect para HTTPS
- [ ] https://app-socialselling.willianbvsanches.com/health retorna "healthy"

### SSL Funcionando

```bash
# Verificar certificado
curl -I https://app-socialselling.willianbvsanches.com

# Deve mostrar:
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
```

- [ ] SSL funcionando
- [ ] HSTS header presente
- [ ] Redirect HTTP → HTTPS funcionando

### Serviços Rodando

```bash
docker compose ps
```

- [ ] Todos os serviços com status "Up"
- [ ] Nenhum serviço em restart loop
- [ ] Health checks passando

### Logs Sem Erros

```bash
docker compose logs --tail=100
```

- [ ] Sem erros críticos nos logs
- [ ] Nginx sem erros de SSL
- [ ] Backend conectado ao banco
- [ ] Frontend compilado com sucesso

---

## 🔒 Segurança Pós-Deploy

- [ ] Secrets alterados (não usar valores de exemplo)
- [ ] Firewall configurado
- [ ] SSH apenas com chave
- [ ] Usuário não-root
- [ ] Fail2ban instalado (opcional)
- [ ] Renovação SSL automática configurada
- [ ] Backups automáticos configurados

---

## ⚠️ Problemas Comuns e Soluções

### Nginx não inicia - "certificate not found"

**Causa**: Certificados SSL não existem

**Solução**:
```bash
./infrastructure/scripts/setup-ssl.sh
```

### Erro 502 Bad Gateway

**Causa**: Backend/Frontend não iniciaram

**Solução**:
```bash
docker compose logs backend frontend
docker compose restart backend frontend
```

### NODE_ENV não definido

**Causa**: .env não configurado corretamente

**Solução**:
```bash
echo "NODE_ENV=production" >> .env
docker compose restart nginx
```

---

## 📞 Em Caso de Problemas

1. **Verificar logs**: `docker compose logs -f [service]`
2. **Verificar .env**: `cat .env | grep NODE_ENV`
3. **Validar nginx**: `docker compose exec nginx nginx -t`
4. **Restart**: `docker compose restart [service]`
5. **Rollback**: `git checkout HEAD~1 && docker compose up -d`

---

## ✅ TUDO PRONTO?

**Antes de fazer push:**

- [ ] Todas as validações automáticas OK
- [ ] Checklist manual completo
- [ ] Teste local executado (opcional)
- [ ] .env.production.example revisado
- [ ] Documentação revisada
- [ ] Git status limpo (sem secrets)

**Comando para commit e push:**

```bash
git add .
git commit -m "feat: optimize nginx with separate dev/prod configurations"
git push origin main
```

**Depois do push, no servidor:**

```bash
ssh user@servidor
cd /opt/social-selling-2
git pull origin main
./scripts/deploy-production.sh
```

---

## 🎉 Sucesso!

Se tudo acima está ✅, você está pronto para fazer push e deploy em produção!

**Boa sorte! 🚀**
