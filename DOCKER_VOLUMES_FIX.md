# 🐳 Correção: Build Automático em Produção

## ❌ Problema Original

Você precisava rodar `npm run build` manualmente antes de `docker compose up` em produção porque:

1. O `docker-compose.yml` tinha volumes montados: `- ./backend:/app`
2. Isso **sobrescrevia** a pasta `dist/` buildada dentro do container
3. O código fonte local (sem build) substituía o código compilado

## ✅ Solução Implementada

### Arquitetura de 3 Camadas

```
docker-compose.yml              → Base (produção e desenvolvimento)
docker-compose.override.yml     → Apenas desenvolvimento (hot reload)
.gitignore                      → Ignora override.yml em produção
```

### Como Funciona

#### 📁 docker-compose.yml (Base)
```yaml
backend:
  build:
    target: ${NODE_ENV}  # 'production' ou 'development'
  # SEM volumes aqui!
  # Em produção, usa código do Docker image
```

**Produção**: Usa código compilado do Dockerfile stage `production`

#### 📁 docker-compose.override.yml (Desenvolvimento)
```yaml
backend:
  volumes:
    - ./backend:/app        # Hot reload
    - /app/node_modules     # Protege node_modules
    - /app/dist             # Protege dist/
```

**Desenvolvimento**: Monta código fonte para hot reload

### Comportamento Automático

#### Em Desenvolvimento Local
```bash
docker compose up -d
```
✅ Carrega **ambos** os arquivos automaticamente
✅ Volumes montados = hot reload funciona
✅ `npm run start:dev` roda com watch mode

#### Em Produção (Servidor)
```bash
# Opção 1: Script automático
./scripts/deploy-production.sh

# Opção 2: Manual
mv docker-compose.override.yml docker-compose.override.yml.backup
docker compose up -d --build
```
✅ SEM volumes = usa código compilado do Docker
✅ `node dist/main` roda código otimizado
✅ Build automático no Dockerfile

## 🏗️ Processo de Build (Produção)

### Dockerfile Multi-Stage

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build  # ← Build automático aqui!
RUN npm prune --production

# Stage 2: Production
FROM node:22-alpine AS production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/main"]  # ← Executa código compilado
```

**Benefícios**:
1. Build acontece **dentro do Docker**
2. Imagem final contém **apenas** código compilado
3. Sem dependências de dev na imagem final
4. Tamanho otimizado

## 📋 Diferenças entre Ambientes

| Característica | Desenvolvimento | Produção |
|---------------|-----------------|----------|
| **Volumes** | ✅ Sim (hot reload) | ❌ Não |
| **Build** | No container | No Dockerfile |
| **Comando** | `npm run start:dev` | `node dist/main` |
| **Código fonte** | Local montado | Dentro da imagem |
| **node_modules** | Protegido | Apenas production |

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# Padrão - carrega override automaticamente
docker compose up -d

# Ver arquivos carregados
docker compose config --files
# Saída:
# docker-compose.yml
# docker-compose.override.yml
```

### Produção (Servidor)

**Opção 1: Script Automático (Recomendado)**
```bash
./scripts/deploy-production.sh
```

**Opção 2: Manual**
```bash
# Garantir que override não existe
rm -f docker-compose.override.yml

# Build e deploy
docker compose up -d --build
```

**Opção 3: Ignorar Override Explicitamente**
```bash
docker compose -f docker-compose.yml up -d --build
```

## 🔍 Verificando o Comportamento

### Ver Volumes Montados

```bash
# Desenvolvimento (com override)
docker inspect social-selling-backend | grep -A 20 Mounts

# Produção (sem override)
docker inspect social-selling-backend | grep -A 20 Mounts
# Deve mostrar apenas volumes nomeados, SEM bind mounts
```

### Ver Código Sendo Executado

```bash
# Ver estrutura de diretórios dentro do container
docker exec social-selling-backend ls -la /app

# Desenvolvimento: verá código fonte
# Produção: verá apenas dist/, node_modules/, package.json
```

## ⚠️ Importante

### .gitignore

**NUNCA** commitar `docker-compose.override.yml` em produção!

```gitignore
# .gitignore já configurado
docker-compose.override.yml.backup
```

### No Servidor

1. ✅ Clone o repositório
2. ✅ `docker-compose.override.yml` NÃO estará presente
3. ✅ `docker compose up -d` usa apenas `docker-compose.yml`
4. ✅ Build automático acontece

### Localmente

1. ✅ `docker-compose.override.yml` existe
2. ✅ `docker compose up -d` usa ambos os arquivos
3. ✅ Hot reload funciona

## 🐛 Troubleshooting

### "Ainda preciso fazer build manual"

**Causa**: `docker-compose.override.yml` está presente em produção

**Solução**:
```bash
rm docker-compose.override.yml
docker compose down
docker compose up -d --build
```

### "Hot reload não funciona no desenvolvimento"

**Causa**: `docker-compose.override.yml` não existe

**Solução**:
```bash
# Recriar o arquivo
git checkout docker-compose.override.yml
docker compose restart backend frontend
```

### "Código antigo está sendo executado"

**Causa**: Cache do Docker

**Solução**:
```bash
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

## ✅ Checklist de Produção

Antes de fazer deploy em produção:

- [ ] `docker-compose.override.yml` NÃO existe no servidor
- [ ] `NODE_ENV=production` no `.env`
- [ ] Build automático configurado no Dockerfile
- [ ] Sem volumes de código no `docker-compose.yml`

## 🎯 Resultado Final

### Antes
```bash
# Produção ❌
cd backend
npm run build
cd ..
docker compose up -d
```

### Agora
```bash
# Produção ✅
docker compose up -d --build
# OU
./scripts/deploy-production.sh
```

**Sem build manual! Tudo automático!** 🎉
