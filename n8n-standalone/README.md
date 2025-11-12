# n8n Standalone Setup

Setup independente do n8n com Nginx e PostgreSQL, separado do projeto social-selling.

## Estrutura

```
n8n-standalone/
├── docker-compose.yml          # Configuração dos serviços
├── nginx/
│   ├── nginx.conf             # Configuração principal do Nginx
│   └── conf.d/
│       └── n8n.conf           # Configuração do proxy reverso para n8n
├── data/                      # Dados persistentes (criado automaticamente)
├── .env                       # Variáveis de ambiente (criar a partir do .env.example)
└── README.md                  # Este arquivo
```

## Serviços Incluídos

1. **n8n** - Plataforma de automação de workflows
2. **PostgreSQL** - Banco de dados para persistência do n8n
3. **Nginx** - Proxy reverso com SSL/TLS
4. **Certbot** - Gerenciamento automático de certificados SSL

## Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cd n8n-standalone
cp .env.example .env
```

Edite o arquivo `.env` e configure as seguintes variáveis **OBRIGATÓRIAS**:

```bash
# Gerar uma chave de criptografia segura (MUITO IMPORTANTE!)
openssl rand -hex 32

# Cole o resultado no .env como N8N_ENCRYPTION_KEY
```

**Importante**:
- A `N8N_ENCRYPTION_KEY` deve ser configurada **ANTES** da primeira execução
- Nunca altere essa chave depois que o n8n estiver em uso
- Guarde essa chave em local seguro (backup)

### 2. Configurar DNS

Aponte o domínio `n8n.willianbvsanches.com` para o IP do seu servidor.

### 3. Obter Certificado SSL

**Primeira vez** (antes de ter o certificado):

```bash
# Temporariamente, comente as linhas SSL no nginx/conf.d/n8n.conf
# ou use certbot em modo standalone

# Parar nginx se estiver rodando
docker compose down nginx

# Obter certificado
docker run -it --rm \
  -v $(pwd)/data/letsencrypt:/etc/letsencrypt \
  -v $(pwd)/data/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email seu-email@example.com \
  --agree-tos \
  -d n8n.willianbvsanches.com

# Após obter o certificado, descomente as linhas SSL e inicie os serviços
```

### 4. Iniciar os Serviços

```bash
# Iniciar todos os serviços
docker compose up -d

# Verificar logs
docker compose logs -f

# Verificar status
docker compose ps
```

## Acesso

- **n8n**: https://n8n.willianbvsanches.com
- **Porta HTTP**: 80 (redireciona para HTTPS)
- **Porta HTTPS**: 443

## Comandos Úteis

```bash
# Iniciar serviços
docker compose up -d

# Parar serviços
docker compose down

# Ver logs
docker compose logs -f n8n
docker compose logs -f nginx
docker compose logs -f postgres

# Reiniciar serviço específico
docker compose restart n8n

# Ver status dos serviços
docker compose ps

# Backup do banco de dados
docker compose exec postgres pg_dump -U n8n_user n8n > backup-n8n-$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T postgres psql -U n8n_user n8n < backup-n8n-YYYYMMDD.sql
```

## Gerenciamento de SSL

Os certificados SSL são renovados automaticamente pelo Certbot a cada 12 horas.

### Renovação Manual

```bash
docker compose exec certbot certbot renew
docker compose restart nginx
```

## Volumes de Dados

Os dados são persistidos nos seguintes volumes Docker:

- `n8n-data`: Workflows, credenciais e configurações do n8n
- `postgres-data`: Banco de dados PostgreSQL
- `ssl-certs`: Certificados SSL
- `ssl-webroot`: Webroot do Certbot para validação

### Backup dos Dados

```bash
# Backup dos workflows e configurações
docker run --rm \
  -v n8n-standalone_n8n-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/n8n-data-backup-$(date +%Y%m%d).tar.gz -C /data .

# Backup do banco de dados
docker compose exec postgres pg_dump -U n8n_user n8n | gzip > n8n-db-backup-$(date +%Y%m%d).sql.gz
```

### Restaurar Backup

```bash
# Restaurar workflows e configurações
docker run --rm \
  -v n8n-standalone_n8n-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/n8n-data-backup-YYYYMMDD.tar.gz"

# Restaurar banco de dados
gunzip < n8n-db-backup-YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U n8n_user n8n
```

## Segurança

### Autenticação Básica (Opcional)

Para adicionar uma camada extra de autenticação, configure no `.env`:

```bash
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=senha_segura_aqui
```

### Firewall

Certifique-se de que apenas as portas 80 e 443 estejam acessíveis externamente:

```bash
# Exemplo usando ufw
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Monitoramento

### Verificar Saúde dos Serviços

```bash
# Status do n8n
curl -I https://n8n.willianbvsanches.com/healthz

# Status do PostgreSQL
docker compose exec postgres pg_isready -U n8n_user

# Logs de erro do Nginx
docker compose logs nginx | grep error
```

## Troubleshooting

### n8n não inicia

```bash
# Verificar logs
docker compose logs n8n

# Verificar se o banco está pronto
docker compose exec postgres pg_isready

# Reiniciar serviços
docker compose restart postgres n8n
```

### Erro de SSL

```bash
# Verificar certificados
docker compose exec nginx ls -la /etc/letsencrypt/live/n8n.willianbvsanches.com/

# Testar configuração do Nginx
docker compose exec nginx nginx -t

# Ver logs do Nginx
docker compose logs nginx
```

### Problema de Conexão com o Banco

```bash
# Verificar variáveis de ambiente
docker compose exec n8n env | grep DB_

# Testar conexão com o banco
docker compose exec postgres psql -U n8n_user -d n8n -c "SELECT 1;"
```

## Atualização

```bash
# Fazer backup antes de atualizar
./backup.sh  # (criar script de backup)

# Atualizar imagens
docker compose pull

# Reiniciar com novas imagens
docker compose up -d

# Verificar logs
docker compose logs -f
```

## Desinstalação

```bash
# CUIDADO: Isso apagará todos os dados!

# Parar e remover containers
docker compose down

# Remover volumes (dados)
docker volume rm n8n-standalone_n8n-data
docker volume rm n8n-standalone_postgres-data
docker volume rm n8n-standalone_ssl-certs
docker volume rm n8n-standalone_ssl-webroot
```

## Recursos

- [Documentação oficial do n8n](https://docs.n8n.io/)
- [n8n Community](https://community.n8n.io/)
- [Nginx SSL Configuration Generator](https://ssl-config.mozilla.org/)

## Suporte

Para questões relacionadas ao setup:
1. Verificar logs: `docker compose logs`
2. Consultar documentação do n8n
3. Verificar issues no GitHub do n8n
