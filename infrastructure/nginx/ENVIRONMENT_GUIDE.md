# Nginx Environment Configuration Guide

## 📁 Estrutura de Pastas

```
infrastructure/nginx/
├── development/           # Configurações para ambiente local
│   ├── nginx.conf        # Config principal (rate limit permissivo)
│   ├── conf.d/
│   │   └── default.conf  # HTTP apenas, localhost
│   └── README.md
│
├── production/           # Configurações para produção
│   ├── nginx.conf       # Config principal (rate limit restritivo)
│   ├── conf.d/
│   │   └── default.conf # HTTPS, domínios reais, SSL
│   └── README.md
│
├── ssl-dummy/           # Diretório vazio para dev (evita erros de mount)
│   └── README.txt
│
└── ENVIRONMENT_GUIDE.md # Este arquivo
```

## 🔄 Como Funciona

O `docker-compose.yml` usa a variável `NODE_ENV` para determinar qual configuração carregar:

```yaml
volumes:
  - ./infrastructure/nginx/${NODE_ENV:-development}/nginx.conf:/etc/nginx/nginx.conf:ro
  - ./infrastructure/nginx/${NODE_ENV:-development}/conf.d:/etc/nginx/conf.d:ro
```

### Desenvolvimento (NODE_ENV=development)
```
infrastructure/nginx/development/nginx.conf → /etc/nginx/nginx.conf
infrastructure/nginx/development/conf.d/    → /etc/nginx/conf.d/
```

### Produção (NODE_ENV=production)
```
infrastructure/nginx/production/nginx.conf → /etc/nginx/nginx.conf
infrastructure/nginx/production/conf.d/    → /etc/nginx/conf.d/
```

## 🚀 Uso Rápido

### Desenvolvimento Local

```bash
# 1. Configurar ambiente
cp .env.development.example .env

# 2. Deploy
./scripts/deploy-development.sh

# Acesso: http://localhost
```

### Produção

```bash
# 1. Configurar ambiente
cp .env.production.example .env
nano .env  # Altere os secrets!

# 2. Setup SSL (primeira vez)
./infrastructure/scripts/setup-ssl.sh

# 3. Deploy
./scripts/deploy-production.sh

# Acesso: https://app-socialselling.willianbvsanches.com
```

## 📊 Diferenças entre Ambientes

| Característica | Development | Production |
|----------------|-------------|------------|
| **Protocolo** | HTTP | HTTPS |
| **SSL/TLS** | ❌ Não | ✅ Sim (Let's Encrypt) |
| **Domínios** | localhost, 127.0.0.1 | app-socialselling.willianbvsanches.com |
| **Rate Limit API** | 100 req/s | 10 req/s |
| **Rate Limit Auth** | 50 req/m | 5 req/m |
| **Cache** | Desabilitado | Habilitado (30d) |
| **HSTS** | ❌ Não | ✅ Sim (1 ano) |
| **Logs** | Verboso | Padrão |

## 🔐 Configuração SSL (Produção)

### Certificados Let's Encrypt

Os certificados são armazenados em:
```
/etc/letsencrypt/live/app-socialselling.willianbvsanches.com/
├── fullchain.pem
└── privkey.pem

/etc/letsencrypt/live/api.app-socialselling.willianbvsanches.com/
├── fullchain.pem
└── privkey.pem
```

### Renovação Automática

Configurar cron job no servidor:
```bash
# Editar crontab
sudo crontab -e

# Adicionar linha
0 0,12 * * * certbot renew --quiet --nginx
```

## 🔧 Trocar de Ambiente

```bash
# Trocar para desenvolvimento
./scripts/switch-environment.sh development

# Trocar para produção
./scripts/switch-environment.sh production

# Verificar ambiente atual
grep NODE_ENV .env
```

## 📝 Customização

### Adicionar Novo Domínio

1. **Em `production/conf.d/default.conf`**, adicione:
```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name novo-dominio.com;

    ssl_certificate /etc/letsencrypt/live/novo-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/novo-dominio.com/privkey.pem;

    # ... configurações
}
```

2. **Obtenha certificado SSL**:
```bash
sudo certbot --nginx -d novo-dominio.com
```

3. **Reload nginx**:
```bash
docker compose restart nginx
```

### Ajustar Rate Limiting

**Development**: `infrastructure/nginx/development/nginx.conf:29-30`
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=50r/m;
```

**Production**: `infrastructure/nginx/production/nginx.conf:35-36`
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
```

## 🐛 Troubleshooting

### Erro: "No such file or directory" ao iniciar nginx

**Causa**: NODE_ENV não está definido ou tem valor inválido.

**Solução**:
```bash
# Verificar .env
grep NODE_ENV .env

# Deve ser 'development' ou 'production'
echo "NODE_ENV=development" >> .env
```

### Erro: SSL certificate not found

**Causa**: Certificados SSL não foram gerados ou não estão montados.

**Solução**:
```bash
# Em produção
./infrastructure/scripts/setup-ssl.sh

# Em desenvolvimento (ignorar, SSL não é usado)
# Certificar que SSL_CERT_PATH aponta para ssl-dummy
```

### Erro: Port 80 or 443 already in use

**Causa**: Outro serviço está usando a porta.

**Solução**:
```bash
# Encontrar processo
sudo lsof -i :80
sudo lsof -i :443

# Parar serviço (exemplo: apache)
sudo systemctl stop apache2
```

## 📚 Referências

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Docker Compose](https://docs.docker.com/compose/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)

## ✅ Checklist de Deploy

### Desenvolvimento
- [ ] .env configurado com NODE_ENV=development
- [ ] Docker e Docker Compose instalados
- [ ] Portas 80, 3000, 4000 livres
- [ ] `./scripts/deploy-development.sh` executado
- [ ] http://localhost acessível

### Produção
- [ ] .env configurado com NODE_ENV=production
- [ ] Todos os secrets alterados
- [ ] DNS apontando para o servidor
- [ ] Firewall configurado (portas 80, 443)
- [ ] SSL configurado (`./infrastructure/scripts/setup-ssl.sh`)
- [ ] `./scripts/deploy-production.sh` executado
- [ ] https://app-socialselling.willianbvsanches.com acessível
- [ ] Renovação automática SSL configurada
