# Setup do n8n - Automação de Workflows

Este documento descreve como configurar e usar o n8n (ferramenta de automação de workflows) integrado ao projeto Social Selling.

## 📋 Pré-requisitos

1. **DNS configurado**: Adicione o registro A para `n8n.willianbvsanches.com` apontando para o IP do servidor
2. **Docker e Docker Compose** instalados no servidor
3. **Portas abertas**: 80 (HTTP) e 443 (HTTPS)

## 🚀 Deployment em Produção

### 1. Configurar DNS

Adicione o seguinte registro no seu provedor de DNS (Hostinger):

```
Tipo: A
Nome: n8n
Valor: [IP_DO_SERVIDOR]
TTL: 3600
```

Aguarde a propagação do DNS (pode levar até 48h, geralmente alguns minutos):

```bash
# Verificar DNS
nslookup n8n.willianbvsanches.com
```

### 2. Deploy dos Serviços

No servidor, execute:

```bash
# Fazer pull das últimas alterações
git pull origin main

# Parar serviços existentes (se necessário)
docker-compose down

# Rebuildar e iniciar todos os serviços
docker-compose up -d --build

# Verificar se n8n está rodando
docker-compose ps n8n
docker-compose logs -f n8n
```

### 3. Gerar Certificado SSL

Execute o script para gerar o certificado SSL:

```bash
./scripts/generate-n8n-certificate.sh
```

Ou manualmente:

```bash
docker run -it --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email willianbvsanches@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d n8n.willianbvsanches.com

# Reload nginx para aplicar o certificado
docker exec social-selling-nginx nginx -s reload
```

### 4. Configuração Inicial do n8n

1. Acesse https://n8n.willianbvsanches.com
2. Na primeira execução, você será solicitado a criar uma conta de administrador
3. Crie suas credenciais (guarde em lugar seguro!)

## 🔧 Configuração

### Variáveis de Ambiente

As seguintes variáveis estão configuradas no `.env`:

```bash
# n8n Host e URLs
N8N_HOST=n8n.willianbvsanches.com
N8N_WEBHOOK_URL=https://n8n.willianbvsanches.com/
N8N_EDITOR_BASE_URL=https://n8n.willianbvsanches.com

# Banco de Dados (PostgreSQL compartilhado)
N8N_DB_NAME=n8n
N8N_DB_USER=n8n_user
N8N_DB_PASSWORD=[gerado automaticamente]

# Chave de Criptografia (NUNCA PERCA ESTA CHAVE!)
N8N_ENCRYPTION_KEY=[gerado automaticamente]

# Configurações Opcionais
TIMEZONE=America/Sao_Paulo
N8N_LOG_LEVEL=info
N8N_EXECUTIONS_TIMEOUT=3600
```

⚠️ **IMPORTANTE**: A `N8N_ENCRYPTION_KEY` é usada para criptografar credenciais armazenadas. Se você perder esta chave, não poderá recuperar suas credenciais salvas!

### Banco de Dados

O n8n usa o mesmo container PostgreSQL do projeto:
- Database: `n8n`
- User: `n8n_user`
- Schema: `public`

O banco é inicializado automaticamente no primeiro start através do script `database/init/03-create-n8n-database.sql`.

## 📚 Uso Básico

### Webhooks

Seus workflows podem receber webhooks em:

```
https://n8n.willianbvsanches.com/webhook/[seu-webhook-id]
```

Exemplo no Instagram:
```bash
# Configurar webhook do Instagram para notificar o n8n
WEBHOOK_URL=https://n8n.willianbvsanches.com/webhook/instagram-messages
```

### Integrações Disponíveis

O n8n pode se conectar com:
- ✅ Instagram API (já configurado no projeto)
- ✅ PostgreSQL (banco de dados do projeto)
- ✅ Redis (cache do projeto)
- ✅ MinIO/S3 (storage do projeto)
- 📧 Email (SendGrid, SMTP, etc.)
- 🔔 Notificações (Slack, Discord, Telegram, etc.)
- 📊 Analytics
- E centenas de outras integrações...

### Exemplos de Automações

1. **Processar mensagens do Instagram**
   - Trigger: Webhook do Instagram
   - Ação: Salvar no PostgreSQL, notificar equipe

2. **Backup automático**
   - Trigger: Schedule (diário às 3h)
   - Ação: Backup do banco, enviar para S3

3. **Relatórios automáticos**
   - Trigger: Schedule (semanal)
   - Ação: Gerar relatório, enviar por email

## 🔒 Segurança

### Certificados SSL

- Certificados gerenciados por Let's Encrypt
- Renovação automática via Certbot (container `certbot`)
- TLS 1.2 e 1.3 habilitados
- HSTS habilitado (Strict-Transport-Security)

### Headers de Segurança

```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### Autenticação

- O n8n possui sistema de autenticação próprio
- Primeira conta criada é administrador
- Senhas são criptografadas no banco
- Credenciais de integrações são criptografadas com N8N_ENCRYPTION_KEY

## 🛠️ Manutenção

### Logs

```bash
# Ver logs do n8n
docker-compose logs -f n8n

# Ver logs do Nginx (proxy)
docker-compose logs -f nginx

# Ver últimas 100 linhas
docker-compose logs --tail=100 n8n
```

### Backup

O n8n armazena dados em dois lugares:

1. **Banco de dados PostgreSQL** (`n8n` database)
   ```bash
   # Backup do banco
   docker exec social-selling-postgres pg_dump -U n8n_user n8n > n8n-backup-$(date +%Y%m%d).sql
   ```

2. **Volume Docker** (`n8n-data`)
   ```bash
   # Backup do volume
   docker run --rm -v social-selling-2_n8n-data:/data -v $(pwd):/backup \
     alpine tar czf /backup/n8n-data-$(date +%Y%m%d).tar.gz /data
   ```

⚠️ **CRÍTICO**: Faça backup da `N8N_ENCRYPTION_KEY` do arquivo `.env`!

### Restauração

```bash
# Restaurar banco
docker exec -i social-selling-postgres psql -U n8n_user n8n < n8n-backup-20250101.sql

# Restaurar volume
docker run --rm -v social-selling-2_n8n-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/n8n-data-20250101.tar.gz -C /
```

### Atualização

```bash
# Pull da nova imagem
docker-compose pull n8n

# Restart com nova imagem
docker-compose up -d n8n
```

## 🐛 Troubleshooting

### n8n não inicia

```bash
# Verificar logs
docker-compose logs n8n

# Verificar se o banco está acessível
docker exec social-selling-n8n nc -zv postgres 5432

# Verificar variáveis de ambiente
docker exec social-selling-n8n env | grep N8N
```

### Erro de conexão com banco

```bash
# Verificar se o banco n8n existe
docker exec social-selling-postgres psql -U postgres -c "\l" | grep n8n

# Recriar banco se necessário
docker exec -i social-selling-postgres psql -U postgres < database/init/03-create-n8n-database.sql
```

### Certificado SSL não funciona

```bash
# Verificar se o certificado existe
ls -la /etc/letsencrypt/live/n8n.willianbvsanches.com/

# Testar configuração do nginx
docker exec social-selling-nginx nginx -t

# Regenerar certificado
./scripts/generate-n8n-certificate.sh
```

### Webhooks não funcionam

1. Verifique se a URL está correta no workflow
2. Teste com curl:
   ```bash
   curl -X POST https://n8n.willianbvsanches.com/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
3. Verifique os logs do n8n

## 📞 Suporte

- Documentação oficial: https://docs.n8n.io
- Forum: https://community.n8n.io
- Issues do projeto: https://github.com/willianbvsanches13/social-selling/issues

## 🎯 Próximos Passos

Após o setup, você pode:

1. ✅ Criar seu primeiro workflow
2. ✅ Integrar com Instagram API
3. ✅ Configurar notificações
4. ✅ Criar automações de backup
5. ✅ Integrar com outros serviços

Acesse: https://n8n.willianbvsanches.com e comece a automatizar! 🚀
