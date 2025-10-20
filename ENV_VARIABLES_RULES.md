# 🔐 Regras para Adicionar Variáveis de Ambiente

## 📋 Checklist Obrigatório

Toda vez que adicionar uma nova variável de ambiente no projeto, **SEMPRE** execute TODAS estas etapas:

### ✅ 1. Adicionar no `.env.example`

**Arquivo**: `.env.example`

```bash
# [CATEGORIA]
# Descrição clara do que a variável faz
NOVA_VARIAVEL=valor_padrao_ou_exemplo
```

**Regras**:
- ✅ Adicionar comentário explicativo
- ✅ Agrupar por categoria (Database, Auth, Storage, Email, etc.)
- ✅ Se for senha/secret: usar `CHANGE_ME_*` como placeholder
- ✅ Se for chave de API: indicar onde obter (URL de registro)
- ✅ Adicionar exemplo de valor correto

**Exemplo**:
```bash
# ====================================
# EMAIL SERVICE (SendGrid/Mailgun)
# ====================================
# SMTP server hostname
SMTP_HOST=smtp.sendgrid.net
# SMTP server port (usually 587 for TLS)
SMTP_PORT=587
# SMTP username (SendGrid uses 'apikey')
SMTP_USER=apikey
# SMTP password (your SendGrid API key from https://app.sendgrid.com/settings/api_keys)
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
```

---

### ✅ 2. Adicionar no `docker-compose.yml`

**Arquivo**: `docker-compose.yml`

Adicione a variável em **TODOS** os serviços que precisam dela:

#### Backend
```yaml
backend:
  environment:
    NOVA_VARIAVEL: ${NOVA_VARIAVEL}
```

#### Worker
```yaml
worker:
  environment:
    NOVA_VARIAVEL: ${NOVA_VARIAVEL}
```

#### Frontend (se aplicável)
```yaml
frontend:
  environment:
    # Apenas variáveis públicas começam com NEXT_PUBLIC_
    NEXT_PUBLIC_NOVA_VARIAVEL: ${NOVA_VARIAVEL}
```

**Regras**:
- ✅ Backend: adicionar se a API precisa
- ✅ Worker: adicionar se os jobs em background precisam
- ✅ Frontend: adicionar APENAS se necessário (preferir usar via API)
- ❌ Nunca expor secrets no frontend (NEXT_PUBLIC_)

**Checklist por serviço**:
```
[ ] Backend precisa? → Adicionar em backend.environment
[ ] Worker precisa? → Adicionar em worker.environment
[ ] Frontend precisa? → Adicionar em frontend.environment (com NEXT_PUBLIC_ se for público)
[ ] Outros serviços? → Verificar se nginx, postgres, etc. precisam
```

---

### ✅ 3. Adicionar no `scripts/check-env.sh`

**Arquivo**: `scripts/check-env.sh`

#### 3a. Adicionar em `REQUIRED_VARS` (se obrigatória)

```bash
REQUIRED_VARS=(
    "NODE_ENV"
    "POSTGRES_PASSWORD"
    # ... outras variáveis
    "NOVA_VARIAVEL"  # ← Adicionar aqui
)
```

#### 3b. Adicionar em `NO_DEFAULT_VARS` (se for senha/secret)

```bash
NO_DEFAULT_VARS=(
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    # ... outras variáveis
    "NOVA_VARIAVEL"  # ← Adicionar aqui se for senha/secret
)
```

**Regras**:
- ✅ Se a variável é **obrigatória** → `REQUIRED_VARS`
- ✅ Se a variável é **senha/secret** → `NO_DEFAULT_VARS`
- ✅ Se a variável é **opcional** → Não adicionar

**Exemplo**:
```bash
# Obrigatória mas pode ter valor padrão (ex: SMTP_HOST)
REQUIRED_VARS=("SMTP_HOST")

# Obrigatória e NÃO pode ter valor padrão (ex: SMTP_PASSWORD)
REQUIRED_VARS=("SMTP_PASSWORD")
NO_DEFAULT_VARS=("SMTP_PASSWORD")
```

---

### ✅ 4. Adicionar no `scripts/generate-keys.sh` (se for secret)

**Arquivo**: `scripts/generate-keys.sh`

Se a variável for uma **senha, chave ou token**, adicionar geração automática:

```bash
echo "# [Descrição]"
echo "NOVA_VARIAVEL=$(openssl rand -base64 32 | tr -d '\n')"
echo ""
```

**Regras**:
- ✅ Usar `openssl rand -base64 32` para secrets de 32 bytes
- ✅ Usar `openssl rand -base64 64` para secrets de 64 bytes
- ✅ Usar `openssl rand -hex 32` para tokens hexadecimais
- ✅ Adicionar comentário descritivo

**Exemplo**:
```bash
echo "# API Webhook Secret (32 bytes)"
echo "WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -d '\n')"
echo ""
```

---

### ✅ 5. Adicionar no `backend/src/config/configuration.ts`

**Arquivo**: `backend/src/config/configuration.ts`

```typescript
export default () => ({
  // ... outras configs
  novaCategoria: {
    novaVariavel: process.env.NOVA_VARIAVEL || 'valor_padrao',
  },
});
```

**Regras**:
- ✅ Agrupar por categoria lógica
- ✅ Usar valores padrão apropriados para desenvolvimento
- ✅ Fazer parsing de tipos (parseInt, Boolean, etc.)
- ✅ Nunca usar valores padrão para secrets em produção

**Exemplo**:
```typescript
export default () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@localhost',
    fromName: process.env.SMTP_FROM_NAME || 'App Name',
  },
});
```

---

### ✅ 6. Atualizar `FIX_PRODUCTION.md`

**Arquivo**: `FIX_PRODUCTION.md`

Adicionar na seção "Variáveis Obrigatórias" se for importante:

```bash
# [Categoria]
NOVA_VARIAVEL=valor_exemplo    # ← Descrição breve
```

**Regras**:
- ✅ Apenas variáveis **críticas** para produção
- ✅ Adicionar comentário explicando onde obter valor
- ✅ Incluir exemplo de valor válido

---

### ✅ 7. Testar Localmente

Antes de commitar:

```bash
# 1. Verificar se está no .env.example
grep "NOVA_VARIAVEL" .env.example

# 2. Adicionar no .env local
echo "NOVA_VARIAVEL=valor_teste" >> .env

# 3. Verificar com o script
./scripts/check-env.sh

# 4. Testar a aplicação
docker compose down
docker compose up -d --build

# 5. Verificar logs
docker logs social-selling-backend --tail 50 | grep -i "nova_variavel\|error"
```

---

## 📊 Matriz de Decisão Rápida

| Tipo de Variável | .env.example | docker-compose.yml | check-env.sh | generate-keys.sh | configuration.ts | FIX_PRODUCTION.md |
|------------------|--------------|-------------------|--------------|-----------------|-----------------|-------------------|
| Secret/Password | ✅ CHANGE_ME | ✅ Todos serviços | ✅ REQUIRED + NO_DEFAULT | ✅ Gerar | ✅ Sem default | ✅ Documentar |
| API Key | ✅ YOUR_KEY | ✅ Serviços que usam | ✅ REQUIRED | ❌ | ✅ Sem default | ✅ Documentar |
| Config (obrig.) | ✅ Valor padrão | ✅ Todos serviços | ✅ REQUIRED | ❌ | ✅ Com default | ✅ Se crítica |
| Config (opcional) | ✅ Valor padrão | ✅ Se usado | ❌ | ❌ | ✅ Com default | ❌ |
| Feature Flag | ✅ true/false | ✅ Se usado | ❌ | ❌ | ✅ Com default | ❌ |

---

## 🎯 Exemplo Completo: Adicionar Twilio (SMS)

### Passo 1: .env.example

```bash
# ====================================
# SMS SERVICE (Twilio)
# ====================================
# Get your credentials from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=+1234567890
```

### Passo 2: docker-compose.yml

```yaml
backend:
  environment:
    # ... outras variáveis
    TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
    TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
    TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}

worker:
  environment:
    # ... outras variáveis
    TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
    TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
    TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}
```

### Passo 3: scripts/check-env.sh

```bash
REQUIRED_VARS=(
    # ... outras variáveis
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN"
    "TWILIO_PHONE_NUMBER"
)

NO_DEFAULT_VARS=(
    # ... outras variáveis
    "TWILIO_AUTH_TOKEN"
)
```

### Passo 4: scripts/generate-keys.sh

```bash
# Não aplicável - Twilio fornece as credenciais
```

### Passo 5: backend/src/config/configuration.ts

```typescript
export default () => ({
  // ... outras configs
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
});
```

### Passo 6: FIX_PRODUCTION.md

```bash
# SMS / Twilio (se estiver usando)
TWILIO_ACCOUNT_SID=AC...           # ← Do console Twilio
TWILIO_AUTH_TOKEN=...              # ← Do console Twilio
TWILIO_PHONE_NUMBER=+1234567890    # ← Seu número Twilio
```

### Passo 7: Testar

```bash
grep "TWILIO" .env.example
echo "TWILIO_ACCOUNT_SID=test" >> .env
echo "TWILIO_AUTH_TOKEN=test" >> .env
echo "TWILIO_PHONE_NUMBER=+1234567890" >> .env
./scripts/check-env.sh
docker compose restart backend worker
docker logs social-selling-backend --tail 50
```

---

## 🚫 Anti-Patterns (O Que NÃO Fazer)

### ❌ Não adicionar apenas em um lugar

```bash
# ERRADO: Só no docker-compose.yml
backend:
  environment:
    NOVA_VAR: ${NOVA_VAR}

# Faltou: .env.example, check-env.sh, configuration.ts
```

### ❌ Não usar valores hardcoded

```typescript
// ERRADO
const apiKey = 'sk-1234567890';

// CORRETO
const apiKey = process.env.API_KEY || '';
```

### ❌ Não expor secrets no frontend

```yaml
# ERRADO
frontend:
  environment:
    NEXT_PUBLIC_DATABASE_PASSWORD: ${POSTGRES_PASSWORD}

# CORRETO
backend:
  environment:
    DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
```

### ❌ Não commitar .env

```bash
# ERRADO
git add .env
git commit -m "Add env file"

# CORRETO
# .env já está no .gitignore
git add .env.example
git commit -m "Add new env variables to example"
```

---

## 🔄 Workflow Visual

```
┌─────────────────────────────────────────────────────────┐
│ ADICIONAR NOVA VARIÁVEL DE AMBIENTE                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  1. .env.example               │
         │     ✓ Comentário descritivo    │
         │     ✓ Valor exemplo/padrão     │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  2. docker-compose.yml         │
         │     ✓ Backend (se precisa)     │
         │     ✓ Worker (se precisa)      │
         │     ✓ Frontend (se precisa)    │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  3. scripts/check-env.sh       │
         │     ✓ REQUIRED_VARS            │
         │     ✓ NO_DEFAULT_VARS (secret) │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  4. scripts/generate-keys.sh   │
         │     (apenas se for secret)     │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  5. backend/src/config/        │
         │     configuration.ts           │
         │     ✓ Adicionar no export      │
         │     ✓ Valor padrão dev         │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  6. FIX_PRODUCTION.md          │
         │     (se for crítica)           │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  7. TESTAR LOCALMENTE          │
         │     ✓ check-env.sh             │
         │     ✓ docker compose up        │
         │     ✓ Verificar logs           │
         └────────────────┬───────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  ✅ COMMIT & PUSH              │
         └────────────────────────────────┘
```

---

## 📝 Template de Commit

```bash
git add .env.example docker-compose.yml scripts/check-env.sh scripts/generate-keys.sh backend/src/config/configuration.ts FIX_PRODUCTION.md

git commit -m "feat: add [NOME_VARIAVEL] environment variable

- Add [NOME_VARIAVEL] to .env.example with documentation
- Add [NOME_VARIAVEL] to docker-compose.yml (backend, worker)
- Update check-env.sh to validate [NOME_VARIAVEL]
- Add [NOME_VARIAVEL] generation to generate-keys.sh (if secret)
- Add [NOME_VARIAVEL] to backend configuration
- Update FIX_PRODUCTION.md with new variable
- Tested locally with docker compose

Closes #issue-number (if applicable)"
```

---

## 🎓 Checklist Final (Print e Use!)

```
┌─────────────────────────────────────────────────────────┐
│ CHECKLIST: Adicionar Variável de Ambiente              │
├─────────────────────────────────────────────────────────┤
│ [ ] 1. Adicionado em .env.example com comentários      │
│ [ ] 2. Adicionado em docker-compose.yml:               │
│     [ ] Backend (se precisa)                            │
│     [ ] Worker (se precisa)                             │
│     [ ] Frontend (se precisa)                           │
│ [ ] 3. Adicionado em scripts/check-env.sh:             │
│     [ ] REQUIRED_VARS (se obrigatória)                  │
│     [ ] NO_DEFAULT_VARS (se secret)                     │
│ [ ] 4. Adicionado em scripts/generate-keys.sh          │
│        (apenas se for secret/password)                  │
│ [ ] 5. Adicionado em backend/src/config/               │
│        configuration.ts                                 │
│ [ ] 6. Documentado em FIX_PRODUCTION.md                │
│        (se for crítica)                                 │
│ [ ] 7. Testado localmente:                             │
│     [ ] ./scripts/check-env.sh                          │
│     [ ] docker compose up -d --build                    │
│     [ ] docker logs (sem erros)                         │
│ [ ] 8. Commit com mensagem descritiva                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 Dúvidas Comuns

**P: E se a variável for opcional?**
R: Adicione em .env.example e configuration.ts com valor padrão, mas NÃO adicione em check-env.sh.

**P: E se a variável for apenas para desenvolvimento?**
R: Adicione em .env.example com comentário `# Development only`, não adicione em FIX_PRODUCTION.md.

**P: E se eu esquecer algum passo?**
R: Execute `./scripts/check-env.sh` - ele vai detectar variáveis faltando.

**P: Como saber se devo adicionar no frontend?**
R: Se o navegador precisa acessar, use `NEXT_PUBLIC_`. Se apenas o servidor Next.js precisa, use sem prefixo.

**P: Posso pular o generate-keys.sh?**
R: Apenas se a variável NÃO for uma senha/secret gerada aleatoriamente. API keys de terceiros não precisam.

---

## 📚 Leitura Complementar

- [The Twelve-Factor App - Config](https://12factor.net/config)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
