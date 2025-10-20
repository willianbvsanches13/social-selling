# Migration from Old to New Nginx Configuration

## 📋 O que mudou?

### Estrutura Anterior
```
infrastructure/nginx/
├── nginx.conf              # Config única para todos ambientes
├── conf.d/
│   └── default.conf       # Mix de HTTP e HTTPS
└── *.conf.disabled        # Várias configs desabilitadas
```

**Problemas**:
- ❌ Configuração única para dev e prod
- ❌ SSL habilitado mesmo em desenvolvimento
- ❌ Muitos arquivos `.disabled` confusos
- ❌ Difícil manutenção
- ❌ Rate limiting inadequado para dev

### Estrutura Nova
```
infrastructure/nginx/
├── development/           # Configurações separadas para dev
│   ├── nginx.conf
│   └── conf.d/default.conf
├── production/           # Configurações separadas para prod
│   ├── nginx.conf
│   └── conf.d/default.conf
└── ssl-dummy/           # Para evitar erros em dev
```

**Benefícios**:
- ✅ Ambientes totalmente separados
- ✅ SSL apenas em produção
- ✅ Rate limiting apropriado para cada ambiente
- ✅ Fácil manutenção
- ✅ Sem arquivos `.disabled`

## 🔄 Como Migrar

### 1. Backup das Configurações Antigas

```bash
# Criar backup
mkdir -p infrastructure/nginx/backup-$(date +%Y%m%d)
cp infrastructure/nginx/*.conf infrastructure/nginx/backup-$(date +%Y%m%d)/
cp -r infrastructure/nginx/conf.d infrastructure/nginx/backup-$(date +%Y%m%d)/
```

### 2. Remover Arquivos Antigos (Opcional)

```bash
# Mover arquivos .disabled para backup
mv infrastructure/nginx/conf.d/*.disabled infrastructure/nginx/backup-*/

# OU deletar se não precisar
rm infrastructure/nginx/conf.d/*.disabled*
```

### 3. Atualizar .env

#### Para Desenvolvimento Local

```bash
# Usar template de desenvolvimento
cp .env.development.example .env

# OU adicionar manualmente
echo "NODE_ENV=development" >> .env
echo "SSL_CERT_PATH=./infrastructure/nginx/ssl-dummy" >> .env
echo "SSL_WEBROOT_PATH=./infrastructure/nginx/ssl-dummy" >> .env
```

#### Para Produção

```bash
# Usar template de produção
cp .env.production.example .env

# OU adicionar manualmente
echo "NODE_ENV=production" >> .env
echo "SSL_CERT_PATH=/etc/letsencrypt" >> .env
echo "SSL_WEBROOT_PATH=/var/www/certbot" >> .env
```

### 4. Testar a Nova Configuração

#### Em Desenvolvimento

```bash
# Parar containers antigos
docker compose down

# Iniciar com nova config
./scripts/deploy-development.sh

# Verificar
curl http://localhost/health
```

#### Em Produção

```bash
# Conectar ao servidor
ssh user@server

# Parar containers
docker compose down

# Atualizar código
git pull origin main

# Verificar configuração do Nginx
docker compose config

# Deploy
./scripts/deploy-production.sh

# Verificar
curl https://app-socialselling.willianbvsanches.com/health
```

## 📝 Mudanças no docker-compose.yml

### Antes
```yaml
nginx:
  volumes:
    - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
    - /var/www/certbot:/var/www/certbot:ro
```

### Depois
```yaml
nginx:
  volumes:
    # Usa NODE_ENV para selecionar configuração
    - ./infrastructure/nginx/${NODE_ENV:-development}/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infrastructure/nginx/${NODE_ENV:-development}/conf.d:/etc/nginx/conf.d:ro
    # SSL apenas em produção (via variáveis de ambiente)
    - ${SSL_CERT_PATH:-./infrastructure/nginx/ssl-dummy}:/etc/letsencrypt:ro
    - ${SSL_WEBROOT_PATH:-./infrastructure/nginx/ssl-dummy}:/var/www/certbot:ro
```

## 🔍 Comparação de Configurações

### Rate Limiting

**Antes** (único para todos):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
```

**Desenvolvimento** (permissivo):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=50r/m;
```

**Produção** (restritivo):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
```

### Domínios

**Desenvolvimento**:
```nginx
server_name localhost 127.0.0.1;
# HTTP apenas
listen 80;
```

**Produção**:
```nginx
server_name app-socialselling.willianbvsanches.com;
# HTTPS com redirect de HTTP
listen 443 ssl;
listen 80; # apenas para ACME challenge e redirect
```

### Headers de Segurança

**Desenvolvimento** (relaxado):
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

**Produção** (completo):
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## ⚠️ Problemas Comuns na Migração

### 1. Nginx não inicia após migração

**Erro**: `nginx: [emerg] cannot load certificate`

**Causa**: NODE_ENV não está definido ou SSL_CERT_PATH incorreto.

**Solução**:
```bash
# Verificar variáveis
grep NODE_ENV .env
grep SSL_CERT_PATH .env

# Para desenvolvimento
echo "NODE_ENV=development" >> .env
echo "SSL_CERT_PATH=./infrastructure/nginx/ssl-dummy" >> .env

# Reiniciar
docker compose restart nginx
```

### 2. Erro 502 Bad Gateway

**Causa**: Backend/Frontend não iniciaram ou configuração de upstream incorreta.

**Solução**:
```bash
# Verificar serviços
docker compose ps

# Ver logs
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Reiniciar serviços
docker compose restart backend frontend nginx
```

### 3. Rate limit muito restritivo em dev

**Causa**: Usando configuração de produção em desenvolvimento.

**Solução**:
```bash
# Verificar NODE_ENV
cat .env | grep NODE_ENV

# Deve ser 'development'
./scripts/switch-environment.sh development
docker compose restart nginx
```

## 🧪 Testes Pós-Migração

### Desenvolvimento

```bash
# Health check
curl http://localhost/health

# API
curl http://localhost/api/health

# Frontend
curl http://localhost/

# Rate limiting (deve permitir 100 req/s)
for i in {1..100}; do curl -s http://localhost/api/health > /dev/null; done
```

### Produção

```bash
# Health check
curl https://app-socialselling.willianbvsanches.com/health

# SSL
curl -I https://app-socialselling.willianbvsanches.com

# Redirect HTTP -> HTTPS
curl -I http://app-socialselling.willianbvsanches.com

# Headers de segurança
curl -I https://app-socialselling.willianbvsanches.com | grep -i "strict-transport"
```

## 📊 Rollback (Se Necessário)

Se algo der errado, você pode voltar para a configuração antiga:

```bash
# 1. Parar containers
docker compose down

# 2. Restaurar backup
cp infrastructure/nginx/backup-YYYYMMDD/* infrastructure/nginx/
cp -r infrastructure/nginx/backup-YYYYMMDD/conf.d/* infrastructure/nginx/conf.d/

# 3. Restaurar docker-compose.yml
git checkout docker-compose.yml

# 4. Reiniciar
docker compose up -d
```

## ✅ Checklist de Migração

- [ ] Backup das configurações antigas criado
- [ ] .env configurado com NODE_ENV correto
- [ ] SSL_CERT_PATH e SSL_WEBROOT_PATH definidos
- [ ] Containers parados (`docker compose down`)
- [ ] Nova configuração testada (`docker compose config`)
- [ ] Containers iniciados com sucesso
- [ ] Health checks passando
- [ ] Logs sem erros críticos
- [ ] URLs acessíveis
- [ ] (Produção) SSL funcionando
- [ ] (Produção) Redirect HTTP->HTTPS funcionando
- [ ] Rate limiting funcionando conforme esperado

## 📞 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs: `docker compose logs -f nginx`
2. Valide a configuração: `docker compose exec nginx nginx -t`
3. Consulte o [DEPLOYMENT.md](/DEPLOYMENT.md)
4. Consulte o [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md)
5. Abra uma issue no repositório
