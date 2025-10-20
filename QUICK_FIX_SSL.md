# 🚀 Correção Rápida - SSL Já Existe!

## ✅ Boa Notícia: Você JÁ TEM os certificados SSL!

Baseado na saída do `certbot certificates`, você tem:

```
✓ app-socialselling.willianbvsanches.com
✓ api.app-socialselling.willianbvsanches.com
✓ grafana.app-socialselling.willianbvsanches.com
✓ prometheus.app-socialselling.willianbvsanches.com
```

## 🔧 Solução Rápida (2 minutos)

### No Servidor:

```bash
# 1. Pull das novas configurações
cd ~/social-selling  # ou seu caminho
git pull origin main

# 2. Parar containers
docker compose down

# 3. Iniciar serviços (agora com ordem automática via depends_on)
docker compose up -d

# O Docker Compose agora aguarda automaticamente:
# 1. postgres, redis, minio ficarem healthy
# 2. backend e frontend ficarem healthy
# 3. Só então inicia o nginx

# 4. Verificar se todos os serviços estão rodando
docker compose ps

# 5. Verificar logs do nginx
docker compose logs -f nginx
```

## ✅ Verificação

```bash
# Todos devem retornar HTTP/2 200
curl -I https://app-socialselling.willianbvsanches.com
curl -I https://api.app-socialselling.willianbvsanches.com
curl -I https://grafana.app-socialselling.willianbvsanches.com
curl -I https://prometheus.app-socialselling.willianbvsanches.com
```

## 🎉 Pronto!

Após o git pull e restart, tudo deve funcionar com SSL corretamente!
