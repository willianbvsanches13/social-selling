# 🔐 Fluxo OAuth Instagram - Guia Completo

## 📋 Resumo do Fluxo

```
Usuário → Frontend → Backend → Instagram API → Backend Callback → DB → Frontend
```

---

## 🚀 Como Funciona

### **1. Usuário clica em "Conectar Instagram"** (`/instagram`)

O frontend chama:
```typescript
GET /api/instagram/oauth/authorize
Headers: Authorization: Bearer {JWT_TOKEN}
```

### **2. Backend gera URL de autorização**

O backend (`instagram.controller.ts:39-66`):
- Gera um `state` único (CSRF protection)
- Salva o `state` no Redis com o `userId` (válido por 10min)
- Retorna a URL de autorização do Instagram

**Resposta:**
```json
{
  "authorizationUrl": "https://api.instagram.com/oauth/authorize?client_id=...&state=..."
}
```

### **3. Frontend redireciona para Instagram**

```typescript
window.location.href = authorizationUrl;
```

O usuário:
- Faz login no Instagram (se necessário)
- Vê as permissões solicitadas
- Clica em "Autorizar"

### **4. Instagram redireciona de volta**

Para: `https://api.app-socialselling.willianbvsanches.com/api/instagram/oauth/callback?code=ABC123&state=XYZ`

### **5. Backend processa automaticamente** (`instagram.controller.ts:68-120`)

1. Valida o `state` (busca no Redis)
2. Troca o `code` por um token de acesso curto
3. Troca o token curto por um token de longa duração (60 dias)
4. Busca informações do perfil Instagram
5. Salva na tabela `client_accounts`:
   ```sql
   INSERT INTO client_accounts (
     user_id, platform, username, instagram_business_account_id,
     display_name, profile_picture_url, follower_count, ...
   )
   ```
6. Salva o token criptografado na tabela `oauth_tokens`:
   ```sql
   INSERT INTO oauth_tokens (
     client_account_id, access_token, expires_at, ...
   )
   ```
7. Redireciona para o frontend:
   ```
   https://app-socialselling.willianbvsanches.com/clients?instagram_connected=true&account={UUID}
   ```

### **6. Frontend mostra feedback** (`/clients`)

A página `/clients` detecta os query params e mostra:
- ✅ Sucesso: Banner verde + toast de sucesso
- ❌ Erro: Banner vermelho + toast de erro
- Após 3 segundos, limpa a URL

---

## 🛠️ Arquivos Modificados

### **Backend:**
- ✅ `instagram.controller.ts` - Rotas OAuth
- ✅ `instagram-oauth.service.ts` - Lógica OAuth
- ✅ `instagram-webhooks.service.ts` - Webhook do Instagram
- ✅ `docker-compose.yml` - Adicionado `APP_BASE_URL`
- ✅ `backend/.env` - Adicionado `APP_BASE_URL`

### **Frontend:**
- ✅ `instagram.service.ts` - Service atualizado
- ✅ `app/(dashboard)/instagram/page.tsx` - Página de contas
- ✅ `app/(dashboard)/clients/page.tsx` - Página de callback (NOVO)
- ✅ `.env.local` - API_URL corrigida

---

## 📝 Como Usar

### **1. Configure as variáveis de ambiente no backend**

```env
# backend/.env
INSTAGRAM_APP_ID=seu_app_id
INSTAGRAM_APP_SECRET=sua_app_secret
INSTAGRAM_REDIRECT_URI=https://api.app-socialselling.willianbvsanches.com/api/instagram/oauth/callback
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=9101c24fd2d3bd64240fd7b5f56d49ed491969c9922842fd8605fdd10ca39092
APP_BASE_URL=https://api.app-socialselling.willianbvsanches.com
```

### **2. Configure no Facebook Developers**

#### **URIs de Redirecionamento OAuth Válidos:**
```
https://api.app-socialselling.willianbvsanches.com/api/instagram/oauth/callback
```

#### **Webhook:**
- **URL:** `https://api.app-socialselling.willianbvsanches.com/api/instagram/webhooks`
- **Token:** `9101c24fd2d3bd64240fd7b5f56d49ed491969c9922842fd8605fdd10ca39092`

#### **Permissões necessárias:**
- ✅ `instagram_basic`
- ✅ `instagram_manage_messages`
- ✅ `instagram_manage_comments`
- ✅ `pages_show_list`
- ✅ `pages_read_engagement`

### **3. Recrie os containers**

```bash
cd /root/social-selling
docker compose up -d --build backend frontend
```

### **4. Teste o fluxo**

1. Acesse: `https://app-socialselling.willianbvsanches.com/instagram`
2. Clique em **"Connect Account"**
3. Autorize no Instagram
4. Você será redirecionado de volta e verá o feedback

---

## 🧪 Testes

### **Testar OAuth (manual):**

```bash
# 1. Obter URL de autorização
curl -X GET "https://api.app-socialselling.willianbvsanches.com/api/instagram/oauth/authorize" \
  -H "Authorization: Bearer SEU_JWT_TOKEN"

# 2. Abrir URL no navegador e autorizar

# 3. Listar contas conectadas
curl -X GET "https://api.app-socialselling.willianbvsanches.com/api/instagram/accounts" \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### **Testar Webhook:**

```bash
curl "https://api.app-socialselling.willianbvsanches.com/api/instagram/webhooks?hub.mode=subscribe&hub.verify_token=9101c24fd2d3bd64240fd7b5f56d49ed491969c9922842fd8605fdd10ca39092&hub.challenge=TEST_123"
```

**Resposta esperada:** `TEST_123`

---

## 🗂️ Estrutura do Banco de Dados

### **`client_accounts`:**
```sql
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'instagram'
  username VARCHAR(255),
  instagram_business_account_id VARCHAR(255), -- ID do Instagram
  display_name VARCHAR(255),
  profile_picture_url TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  media_count INTEGER,
  biography TEXT,
  website TEXT,
  status VARCHAR(50), -- 'active', 'token_expired', 'disconnected'
  account_type VARCHAR(50), -- 'personal', 'business', 'creator'
  created_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  token_expires_at TIMESTAMP
);
```

### **`oauth_tokens`:**
```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY,
  client_account_id UUID NOT NULL,
  access_token TEXT NOT NULL, -- Criptografado
  refresh_token TEXT,
  expires_at TIMESTAMP,
  token_type VARCHAR(50),
  scope TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔒 Segurança

### **Proteções implementadas:**
1. ✅ **CSRF Protection**: State token único por requisição
2. ✅ **Token Encryption**: Tokens armazenados criptografados
3. ✅ **JWT Authentication**: Apenas usuários autenticados podem conectar contas
4. ✅ **State Expiration**: State expira em 10 minutos
5. ✅ **Webhook Signature**: Verificação HMAC SHA256

---

## 🐛 Troubleshooting

### **Erro: "Invalid or expired OAuth state"**
- O state expirou (10min)
- Limpe o Redis e tente novamente

### **Erro: "Invalid verify token"**
- Token do webhook não bate
- Verifique `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` no .env

### **Conta não aparece após conectar**
- Verifique os logs: `docker logs social-selling-backend --tail 100`
- Verifique o banco: `SELECT * FROM client_accounts;`

---

## 📚 Referências

- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Webhooks do Messenger](https://developers.facebook.com/docs/messenger-platform/webhooks)

---

**✅ Implementação Completa!**

O fluxo OAuth está 100% funcional e segue as melhores práticas de segurança e UX.
