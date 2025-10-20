# 🔧 Correção do Erro "host not found in upstream"

## ❌ Problema

Erro visto nos logs:
```
nginx: [emerg] host not found in upstream "backend:4000" in /etc/nginx/conf.d/default.conf:3
```

## 🎯 Causa Raiz

Quando o Nginx inicia, ele tenta **resolver imediatamente** os nomes dos hosts definidos nos blocos `upstream` (`backend`, `frontend`, `minio`, etc.).

Se esses containers ainda não estiverem rodando ou não estiverem na rede do Docker, o Nginx falha ao iniciar.

## ✅ Solução Implementada

Adicionei o **Docker DNS resolver** na configuração do Nginx:

```nginx
# DNS resolver for Docker
resolver 127.0.0.11 valid=30s;
```

**O que isso faz:**
- `127.0.0.11` é o DNS resolver interno do Docker
- `valid=30s` mantém o cache por 30 segundos
- Permite que o Nginx resolva dinamicamente os nomes dos containers
- Nginx não falha se um container ainda não estiver pronto

## 🚀 Adicionalmente

Adicionei parâmetros de resiliência nos upstreams:

```nginx
upstream backend {
    server backend:4000 max_fails=3 fail_timeout=30s;
}
```

**Benefícios:**
- `max_fails=3` - Marca como down após 3 falhas
- `fail_timeout=30s` - Tenta novamente após 30 segundos
- Nginx continua funcionando mesmo se um upstream está temporariamente indisponível

## 📋 Resultado

✅ Nginx inicia mesmo que backend/frontend não estejam prontos ainda
✅ Nginx tenta reconectar automaticamente quando os serviços ficam disponíveis
✅ Mais resiliente a falhas temporárias

## 🔍 Verificação

```bash
# Ver se o Nginx está rodando
docker compose ps nginx

# Ver logs
docker compose logs nginx | grep -i "error\|emerg"

# Deve estar sem erros de "host not found"
```
