# 🔧 Correção do Erro de Certificado SSL no Grafana

## ❌ Problema Atual

O subdomínio `grafana.app-socialselling.willianbvsanches.com` está apresentando erro de certificado SSL.

**Causa**: A configuração anterior estava tentando usar o certificado do domínio principal (`app-socialselling.willianbvsanches.com`) para o subdomínio Grafana, o que não funciona sem um certificado wildcard.

## ✅ Solução Implementada

As mudanças feitas vão **CORRIGIR completamente** o problema do SSL do Grafana (e Prometheus):

### O que foi alterado:

1. **Configuração do Nginx** (`infrastructure/nginx/production/conf.d/default.conf`):
   - ❌ **ANTES**: Usava certificado do domínio principal para Grafana
   - ✅ **AGORA**: Usa certificado específico para cada subdomínio

2. **Script de SSL** (`infrastructure/scripts/setup-ssl.sh`):
   - ✅ Já estava configurado para obter certificados para TODOS os domínios:
     - `app-socialselling.willianbvsanches.com`
     - `api.app-socialselling.willianbvsanches.com`
     - `grafana.app-socialselling.willianbvsanches.com` ← **Este resolve seu problema!**
     - `prometheus.app-socialselling.willianbvsanches.com`

## 🚀 Como Aplicar a Correção no Servidor

### Passo 1: Fazer Push do Código

```bash
# No seu computador local
git add .
git commit -m "fix: use dedicated SSL certificates for each subdomain"
git push origin main
```

### Passo 2: Atualizar o Servidor

```bash
# SSH no servidor
ssh user@seu-servidor-ip

# Navegar para o projeto
cd /opt/social-selling-2  # ou onde você mantém o projeto

# Pull das mudanças
git pull origin main
```

### Passo 3: Verificar Certificados Existentes

```bash
# Verificar quais certificados existem
sudo certbot certificates

# Verificar especificamente o Grafana
sudo ls -la /etc/letsencrypt/live/grafana.app-socialselling.willianbvsanches.com/
```

### Passo 4A: Se o Certificado do Grafana NÃO Existe

Se você ver que não existe certificado para `grafana.app-socialselling.willianbvsanches.com`:

```bash
# Obter certificado apenas para Grafana e Prometheus
sudo certbot certonly \
  --standalone \
  -d grafana.app-socialselling.willianbvsanches.com \
  -d prometheus.app-socialselling.willianbvsanches.com \
  --non-interactive \
  --agree-tos \
  --email seu-email@example.com \
  --pre-hook "docker stop social-selling-nginx" \
  --post-hook "docker start social-selling-nginx"
```

### Passo 4B: Se o Certificado do Grafana JÁ Existe

Se já existe mas está com problema:

```bash
# Renovar/reobter certificado
sudo certbot renew --force-renewal --cert-name grafana.app-socialselling.willianbvsanches.com
```

### Passo 5: Reiniciar Nginx

```bash
# Reiniciar nginx para aplicar a nova configuração
docker compose restart nginx

# Verificar logs
docker compose logs -f nginx
```

### Passo 6: Testar

```bash
# Testar HTTPS do Grafana
curl -I https://grafana.app-socialselling.willianbvsanches.com

# Deve retornar HTTP/2 200 sem erros de SSL

# Testar no navegador
# Abrir: https://grafana.app-socialselling.willianbvsanches.com
```

## 🔍 Verificação Detalhada

### Verificar Certificado do Grafana

```bash
# Ver informações do certificado
sudo openssl x509 -in /etc/letsencrypt/live/grafana.app-socialselling.willianbvsanches.com/fullchain.pem -text -noout | grep -A 2 "Subject:"

# Deve mostrar:
# Subject: CN=grafana.app-socialselling.willianbvsanches.com
```

### Verificar Nginx

```bash
# Testar configuração
docker compose exec nginx nginx -t

# Ver qual certificado está sendo usado
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A 5 "grafana.app-socialselling"
```

## 📋 Checklist de Correção

- [ ] Push do código feito
- [ ] Pull no servidor executado
- [ ] Certificado para grafana.app-socialselling.willianbvsanches.com existe
- [ ] Certificado para prometheus.app-socialselling.willianbvsanches.com existe
- [ ] Nginx reiniciado
- [ ] Logs do Nginx sem erros de SSL
- [ ] https://grafana.app-socialselling.willianbvsanches.com acessível
- [ ] https://prometheus.app-socialselling.willianbvsanches.com acessível
- [ ] Navegador não mostra aviso de certificado

## 🎯 Diferença nas Configurações

### ❌ ANTES (Errado)

```nginx
server {
    listen 443 ssl;
    server_name grafana.app-socialselling.willianbvsanches.com;

    # Usava certificado do domínio principal - ERRADO!
    ssl_certificate /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/privkey.pem;
    ...
}
```

**Problema**: O certificado de `app-socialselling.willianbvsanches.com` não é válido para `grafana.app-socialselling.willianbvsanches.com`.

### ✅ AGORA (Correto)

```nginx
server {
    listen 443 ssl;
    server_name grafana.app-socialselling.willianbvsanches.com;

    # Usa certificado específico do Grafana - CORRETO!
    ssl_certificate /etc/letsencrypt/live/grafana.app-socialselling.willianbvsanches.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grafana.app-socialselling.willianbvsanches.com/privkey.pem;
    ...
}
```

**Solução**: Cada subdomínio tem seu próprio certificado Let's Encrypt.

## 🔐 Certificados Necessários

Após aplicar a correção, você terá:

```
/etc/letsencrypt/live/
├── app-socialselling.willianbvsanches.com/
│   ├── fullchain.pem
│   └── privkey.pem
├── api.app-socialselling.willianbvsanches.com/
│   ├── fullchain.pem
│   └── privkey.pem
├── grafana.app-socialselling.willianbvsanches.com/   ← ESTE RESOLVE O PROBLEMA!
│   ├── fullchain.pem
│   └── privkey.pem
└── prometheus.app-socialselling.willianbvsanches.com/
    ├── fullchain.pem
    └── privkey.pem
```

## ⚠️ Troubleshooting

### Erro: "Certificate not found"

**Causa**: Certificado ainda não foi gerado para o Grafana.

**Solução**: Execute o Passo 4A acima.

### Erro: "nginx: [emerg] cannot load certificate"

**Causa**: Nginx tentando usar certificado que não existe.

**Solução**:
```bash
# Verificar se o caminho existe
sudo ls -la /etc/letsencrypt/live/grafana.app-socialselling.willianbvsanches.com/

# Se não existir, gerar certificado (Passo 4A)
```

### Erro: "NET::ERR_CERT_COMMON_NAME_INVALID" no navegador

**Causa**: Nginx ainda usando certificado errado.

**Solução**:
```bash
# Garantir que a nova configuração está ativa
docker compose restart nginx

# Limpar cache do navegador
# CTRL+SHIFT+DELETE no Chrome/Firefox
```

## ✅ Confirmação Final

Após aplicar todas as mudanças, execute:

```bash
# Testar todos os domínios
for domain in app-socialselling.willianbvsanches.com \
              api.app-socialselling.willianbvsanches.com \
              grafana.app-socialselling.willianbvsanches.com \
              prometheus.app-socialselling.willianbvsanches.com; do
  echo "Testing $domain..."
  curl -I https://$domain 2>&1 | grep -i "HTTP\|SSL\|certificate"
  echo "---"
done
```

Todos devem retornar `HTTP/2 200` sem erros de SSL!

## 🎉 Resultado Esperado

✅ https://grafana.app-socialselling.willianbvsanches.com - **SEM ERRO DE CERTIFICADO**
✅ https://prometheus.app-socialselling.willianbvsanches.com - **SEM ERRO DE CERTIFICADO**
✅ Cadeado verde no navegador
✅ Certificados válidos por 90 dias (Let's Encrypt)
✅ Renovação automática configurada
