# 🌐 Docker Networking - Quando Usar localhost vs Service Names

## TL;DR - Regra Simples

| Contexto | Use | Exemplo |
|----------|-----|---------|
| Health check do próprio container | `localhost` | `wget http://localhost:4000` |
| Container A acessando Container B | `service-name` | `wget http://backend:4000` |
| Navegador/Host acessando container | `localhost` ou domínio | `https://app-socialselling.com` |

---

## 📋 Exemplos Práticos

### ✅ Health Checks (Correto)

```yaml
# docker-compose.yml
services:
  backend:
    ports:
      - "4000:4000"
    healthcheck:
      # ✅ CORRETO: localhost (dentro do próprio container)
      test: ["CMD", "wget", "http://localhost:4000/health/ready"]
```

**Por que `localhost`?**
- O comando `wget` roda **dentro** do container `backend`
- `localhost` refere-se ao próprio container
- A porta 4000 está exposta internamente no container

**Por que NÃO usar `backend:4000`?**
- `backend` é o service name da rede Docker
- Dentro do container, isso tentaria resolver para o IP da rede
- Adiciona overhead de DNS desnecessário
- Menos eficiente

---

### ✅ Container para Container (Correto)

```yaml
# Nginx acessando o Backend
services:
  nginx:
    # ...
    # Configuração interna do Nginx

  backend:
    # ...
```

```nginx
# infrastructure/nginx/production/conf.d/default.conf

# ✅ CORRETO: usar service name
upstream backend {
    server backend:4000;
}

server {
    location /api {
        proxy_pass http://backend;  # ← Service name
    }
}
```

**Por que usar `backend:4000`?**
- Nginx (container) quer acessar Backend (outro container)
- Docker DNS resolve `backend` para o IP do container backend
- Funciona mesmo se o container for recriado (IP dinâmico)

---

### ✅ Frontend para Backend (Variável de Ambiente)

```yaml
# docker-compose.yml
services:
  frontend:
    environment:
      # ❌ ERRADO: Não use service name para acesso do navegador
      # NEXT_PUBLIC_API_URL: http://backend:4000

      # ✅ CORRETO: Use URL pública
      NEXT_PUBLIC_API_URL: ${API_URL}  # https://api.app-socialselling.com
```

**Por que NÃO usar `backend:4000`?**
- `NEXT_PUBLIC_*` é enviado para o navegador do usuário
- O navegador do usuário não tem acesso à rede Docker interna
- `backend` não resolve fora da rede Docker

**Quando usar service name no frontend?**
- Apenas em Server-Side Rendering (SSR)
- Dentro de `getServerSideProps` ou API routes
- Nunca em código client-side

---

## 🔍 Como Saber Qual Usar?

### Pergunte-se: "Quem está fazendo a requisição?"

#### 1. Container verificando a si mesmo
```yaml
healthcheck:
  test: ["CMD", "curl", "http://localhost:PORT"]
```
✅ Use: **localhost**

#### 2. Container A → Container B
```yaml
# Nginx → Backend
upstream backend {
  server backend:4000;
}
```
✅ Use: **service name**

#### 3. Navegador do usuário → Backend
```javascript
// Frontend React/Next.js
fetch('https://api.app-socialselling.com/posts')
```
✅ Use: **domínio público**

#### 4. Next.js SSR → Backend (servidor)
```javascript
// getServerSideProps (roda no container)
export async function getServerSideProps() {
  const res = await fetch('http://backend:4000/api/posts');
  // ...
}
```
✅ Use: **service name** (porque roda no servidor)

#### 5. Next.js Client-Side → Backend
```javascript
// useEffect, onClick, etc. (roda no navegador)
useEffect(() => {
  fetch('https://api.app-socialselling.com/api/posts')
}, []);
```
✅ Use: **domínio público** (porque roda no navegador)

---

## 🌐 Rede Docker Explicada

```
┌─────────────────────────────────────────────────────────────┐
│ Host Machine (seu servidor)                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Docker Network: social-selling-network                  │ │
│  │                                                          │ │
│  │  ┌──────────────┐        ┌──────────────┐              │ │
│  │  │   Backend    │        │   Frontend   │              │ │
│  │  │ (backend:4000)│◄──────│(frontend:3000)│             │ │
│  │  │              │   SSR  │              │              │ │
│  │  │ localhost:   │        │ localhost:   │              │ │
│  │  │   4000       │        │   3000       │              │ │
│  │  └──────▲───────┘        └──────────────┘              │ │
│  │         │                                                │ │
│  │         │                                                │ │
│  │  ┌──────┴───────┐                                       │ │
│  │  │    Nginx     │                                       │ │
│  │  │   (nginx)    │                                       │ │
│  │  │              │                                       │ │
│  │  │ upstream     │                                       │ │
│  │  │ backend:4000 │                                       │ │
│  │  └──────────────┘                                       │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│         ▲                                                    │
│         │ Port Mapping                                      │
│         │ 80:80, 443:443                                    │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ Internet
          ▼
   ┌──────────────┐
   │   Browser    │
   │  (usuário)   │
   │              │
   │ https://     │
   │ app-social   │
   │ selling.com  │
   └──────────────┘
```

### Fluxo de uma Requisição

1. **Usuário acessa**: `https://app-socialselling.com`
2. **DNS resolve**: IP do servidor
3. **Nginx recebe**: porta 443 (mapeada)
4. **Nginx proxy_pass**: `http://frontend:3000` (service name)
5. **Frontend SSR precisa de dados**: `http://backend:4000/api/posts` (service name)
6. **Backend responde**: para frontend
7. **Frontend renderiza**: HTML
8. **Navegador recebe**: HTML + JavaScript
9. **JavaScript no navegador faz fetch**: `https://api.app-socialselling.com/api/posts` (domínio público)
10. **Nginx recebe**: porta 443
11. **Nginx proxy_pass**: `http://backend:4000` (service name)
12. **Backend responde**: JSON

---

## ⚙️ Configuração Atual do Projeto

### Backend Health Check
```yaml
backend:
  healthcheck:
    test: ["CMD", "wget", "http://localhost:4000/health/ready"]
```
✅ **Correto**: Backend verificando a si mesmo

### Frontend Health Check
```yaml
frontend:
  healthcheck:
    test: ["CMD", "wget", "http://localhost:3000"]
```
✅ **Correto**: Frontend verificando a si mesmo

### Nginx → Backend
```nginx
upstream backend {
    server backend:4000;
}
```
✅ **Correto**: Nginx acessando outro container

### Frontend Environment
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: ${API_URL}  # https://api.app-socialselling.com
```
✅ **Correto**: URL pública para o navegador

---

## 🚫 Erros Comuns

### ❌ Erro 1: Service name no health check
```yaml
backend:
  healthcheck:
    # ❌ ERRADO
    test: ["CMD", "wget", "http://backend:4000/health"]
```
**Problema**: Overhead de DNS, pode falhar se DNS não estiver pronto

### ❌ Erro 2: localhost em comunicação entre containers
```nginx
# ❌ ERRADO
upstream backend {
    server localhost:4000;
}
```
**Problema**: Nginx tentará acessar porta 4000 do próprio container, não do backend

### ❌ Erro 3: Service name em variável client-side
```yaml
frontend:
  environment:
    # ❌ ERRADO - navegador não consegue resolver
    NEXT_PUBLIC_API_URL: http://backend:4000
```
**Problema**: Navegador do usuário não está na rede Docker

### ❌ Erro 4: URL externa em health check
```yaml
backend:
  healthcheck:
    # ❌ ERRADO - sai da rede e volta
    test: ["CMD", "wget", "https://api.app-socialselling.com/health"]
```
**Problema**: Depende de DNS externo, Nginx, SSL - muito overhead para um health check simples

---

## 🎯 Resumo Final

| Situação | Use | Por que |
|----------|-----|---------|
| Health check próprio | `localhost:PORT` | Mais rápido, sem DNS |
| Container → Container | `service-name:PORT` | Resolve via Docker DNS |
| Navegador → API | `https://dominio.com` | Navegador não está na rede Docker |
| SSR → Backend | `http://service-name:PORT` | Servidor está na rede Docker |

---

## 📚 Referências

- [Docker Networking](https://docs.docker.com/network/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [Next.js Server vs Client](https://nextjs.org/docs/basic-features/data-fetching)
