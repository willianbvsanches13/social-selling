# SSL/HTTPS Setup Guide

## Configuração SSL para Produção

Este guia explica como ativar HTTPS na aplicação Social Selling usando Let's Encrypt.

## Status Atual

✅ Configuração SSL pronta e validada
❌ Certificados SSL ainda não gerados
📁 Arquivo: `conf.d/ssl.conf.disabled` (será renomeado após obter certificados)

## Pré-requisitos

1. **Domínio configurado**: `app-socialselling.willianbvsanches.com` deve apontar para o IP do servidor
2. **Portas abertas**: 80 (HTTP) e 443 (HTTPS)
3. **Docker e Docker Compose** instalados no servidor de produção
4. **Aplicação rodando** com nginx funcionando

## Passos para Ativar SSL

### 1. No Servidor de Produção

Faça SSH no servidor:
```bash
ssh user@your-server-ip
```

### 2. Verificar DNS

Confirme que o domínio aponta para o servidor:
```bash
dig app-socialselling.willianbvsanches.com
# ou
nslookup app-socialselling.willianbvsanches.com
```

### 3. Instalar Certbot

Se ainda não tiver certbot instalado:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# ou use o container certbot (recomendado)
docker pull certbot/certbot
```

### 4. Obter Certificados SSL

**Opção A: Usando Docker (Recomendado)**
```bash
# Parar nginx temporariamente
docker compose stop nginx

# Obter certificado
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d app-socialselling.willianbvsanches.com \
  --email seu-email@example.com \
  --agree-tos \
  --no-eff-email

# Reiniciar nginx
docker compose start nginx
```

**Opção B: Usando Certbot Standalone**
```bash
# Parar nginx temporariamente
docker compose stop nginx

# Obter certificado
sudo certbot certonly --standalone \
  -d app-socialselling.willianbvsanches.com \
  --email seu-email@example.com \
  --agree-tos \
  --no-eff-email

# Reiniciar nginx
docker compose start nginx
```

### 5. Verificar Certificados Gerados

```bash
sudo ls -la /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/
```

Você deve ver:
- `fullchain.pem` (certificado completo)
- `privkey.pem` (chave privada)
- `chain.pem` (cadeia de certificados)

### 6. Ativar Configuração SSL

```bash
# Renomear o arquivo de configuração SSL para ativá-lo
cd infrastructure/nginx/conf.d
mv ssl.conf.disabled ssl.conf
```

### 7. Testar Configuração Nginx

```bash
docker exec social-selling-nginx nginx -t
```

Se houver erros, verifique:
- Certificados foram gerados corretamente
- Permissões dos arquivos de certificado
- Sintaxe do arquivo ssl.conf

### 8. Recarregar Nginx

```bash
docker compose restart nginx
```

### 9. Verificar HTTPS

Teste no navegador:
```
https://app-socialselling.willianbvsanches.com
```

Ou use curl:
```bash
curl -I https://app-socialselling.willianbvsanches.com
```

## Renovação Automática de Certificados

Os certificados Let's Encrypt expiram a cada 90 dias. Configure renovação automática:

### Criar Script de Renovação

Crie `/opt/renew-ssl.sh`:
```bash
#!/bin/bash
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot renew --webroot -w /var/www/certbot

docker compose -f /path/to/docker-compose.yml restart nginx
```

Tornar executável:
```bash
chmod +x /opt/renew-ssl.sh
```

### Configurar Cron

```bash
# Editar crontab
sudo crontab -e

# Adicionar linha para renovar a cada 12 horas
0 */12 * * * /opt/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

## Configurações de Segurança Incluídas

O arquivo `ssl.conf` já inclui:

✅ **TLS 1.2 e 1.3** - Protocolos modernos e seguros
✅ **HSTS** - HTTP Strict Transport Security (1 ano)
✅ **OCSP Stapling** - Verificação de certificado otimizada
✅ **Security Headers** - X-Frame-Options, CSP, etc.
✅ **HTTP/2** - Protocolo otimizado (note: sintaxe atualizada necessária)
✅ **Rate Limiting** - Proteção contra abuso
✅ **Ciphers Modernos** - Suítes de criptografia seguras

## Avisos e Notas

⚠️ **HTTP/2 Deprecation Warning**: O nginx mostra warning sobre `listen ... http2`. Isso é apenas um aviso - a configuração funciona. Para silenciar, atualize para:
```nginx
listen 443 ssl;
http2 on;
```

⚠️ **Primeiro Deploy**: Mantenha `ssl.conf.disabled` até obter os certificados. O nginx não iniciará se tentar carregar configuração SSL sem os arquivos de certificado.

⚠️ **Backup de Certificados**: Os certificados estão em `/etc/letsencrypt/`. Faça backup regularmente.

## Teste de Segurança SSL

Após ativar SSL, teste a configuração:

**SSL Labs Test**:
```
https://www.ssllabs.com/ssltest/analyze.html?d=app-socialselling.willianbvsanches.com
```

Você deve obter nota **A** ou **A+**.

## Troubleshooting

### Problema: Nginx não inicia após ativar SSL
**Solução**: Verifique se os certificados existem:
```bash
ls -la /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/
```

### Problema: "Certificate not found" error
**Solução**: Os certificados podem não ter sido gerados. Repita o passo 4.

### Problema: DNS não resolve
**Solução**: Aguarde propagação DNS (pode levar até 48h) ou verifique configuração no registrador de domínio.

### Problema: Porta 80/443 bloqueada
**Solução**: Configure firewall:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Checklist Final

Antes de ir para produção, verifique:

- [ ] DNS configurado e propagado
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Certificados SSL obtidos com sucesso
- [ ] `ssl.conf.disabled` renomeado para `ssl.conf`
- [ ] Nginx configurado e testado (`nginx -t`)
- [ ] HTTPS funcionando no navegador
- [ ] HTTP redireciona para HTTPS
- [ ] Renovação automática configurada
- [ ] Teste SSL Labs realizado (nota A/A+)

## Arquivo de Configuração

O arquivo de configuração SSL está em:
```
infrastructure/nginx/conf.d/ssl.conf.disabled
```

Após obter certificados, renomeie para:
```
infrastructure/nginx/conf.d/ssl.conf
```

## Suporte

Para questões ou problemas, verifique:
- Logs do nginx: `docker logs social-selling-nginx`
- Logs do certbot: `/var/log/letsencrypt/`
- Documentação Let's Encrypt: https://letsencrypt.org/docs/
