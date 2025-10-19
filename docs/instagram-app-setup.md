# Guia de Configuração do App Instagram/Facebook

Este guia mostra como criar e configurar um aplicativo no Facebook Developers para integração com Instagram.

---

## Pré-requisitos

1. **Conta Facebook** ativa
2. **Conta Instagram Business** conectada a uma página do Facebook
3. **Página do Facebook** (não pode ser perfil pessoal)

---

## Passo 1: Criar Conta de Desenvolvedor Facebook

### 1.1 Acessar Facebook for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em **"Começar"** ou **"Get Started"** no canto superior direito
3. Faça login com sua conta Facebook

### 1.2 Registrar como Desenvolvedor

1. Preencha as informações solicitadas:
   - Nome completo
   - Email de contato
   - Tipo de desenvolvedor: **"Empresa"** ou **"Desenvolvedor Individual"**
2. Aceite os Termos de Serviço
3. Complete a verificação de segurança (se solicitado)

---

## Passo 2: Criar Novo App

### 2.1 Criar Aplicativo

1. No painel, clique em **"Meus Apps"** (My Apps)
2. Clique em **"Criar App"** (Create App)
3. Selecione o tipo de app:
   - Escolha **"Empresa"** (Business)
   - Clique em **"Continuar"**

### 2.2 Informações do App

Preencha os dados do aplicativo:

```yaml
Nome do App: Social Selling Platform
Email de contato do app: seu-email@exemplo.com
Empresa do App: Sua Empresa (ou deixe em branco)
Categoria do App: Business and Pages
```

4. Clique em **"Criar App"**
5. Complete a verificação de segurança (se solicitado)

---

## Passo 3: Configurar Produtos do App

### 3.1 Adicionar Instagram Basic Display API

1. No painel do app, role até a seção **"Produtos"** (Products)
2. Encontre **"Instagram Basic Display"**
3. Clique em **"Configurar"** (Set Up)

### 3.2 Adicionar Instagram Graph API (Recomendado para Business)

1. Na seção de Produtos, encontre **"Instagram Graph API"**
2. Clique em **"Configurar"** (Set Up)
3. Esta API permite funcionalidades avançadas para contas Business/Creator

### 3.3 Adicionar Webhooks (para receber notificações)

1. Encontre **"Webhooks"** nos produtos
2. Clique em **"Configurar"**

---

## Passo 4: Obter App ID e App Secret

### 4.1 Localizar Credenciais

1. No painel do app, vá para **"Configurações"** → **"Básico"** (Settings → Basic)
2. Você verá:

```
App ID: 123456789012345
App Secret: [Clique em "Mostrar" para revelar]
```

### 4.2 Copiar Credenciais

```bash
# Copie e salve em local seguro:
INSTAGRAM_APP_ID=123456789012345
INSTAGRAM_APP_SECRET=abc123def456ghi789jkl012mno345pq
```

**IMPORTANTE:** Nunca compartilhe seu App Secret publicamente!

### 4.3 Configurar URIs de Redirecionamento OAuth

1. Na mesma página de **"Configurações"** → **"Básico"**
2. Role até **"OAuth Redirect URIs"** (ou vá em Instagram Basic Display → Configurações)
3. Adicione suas URLs:

```
URLs de Desenvolvimento:
http://localhost:4000/api/instagram/oauth/callback
http://localhost/api/instagram/oauth/callback

URLs de Produção (após deploy):
https://seu-dominio.com/api/instagram/oauth/callback
```

4. Clique em **"Salvar Alterações"**

### 4.4 Desativar Dados de Aplicativo (Para desenvolvimento)

1. Em **"Configurações"** → **"Básico"**
2. Role até **"Dados de Aplicativo"**
3. Desative temporariamente durante desenvolvimento (você pode ativar depois)

---

## Passo 5: Configurar Instagram Basic Display

### 6.1 Criar Instagram App

1. Vá para **"Produtos"** → **"Instagram Basic Display"** → **"Configurações Básicas"**
2. Role até **"Instagram App"**
3. Clique em **"Criar novo App"** (Create New App)
4. Preencha:

```yaml
Display Name: Social Selling Platform
Valid OAuth Redirect URIs:
  - http://localhost:4000/api/instagram/oauth/callback
  - http://localhost/api/instagram/oauth/callback
Deauthorize Callback URL: http://localhost:4000/api/instagram/deauthorize
Data Deletion Request URL: http://localhost:4000/api/instagram/delete
```

5. Clique em **"Salvar Alterações"**

### 5.2 Obter Instagram App ID

Você verá:
```
Instagram App ID: 987654321098765
Instagram App Secret: xyz789abc123def456ghi789
```

---

## Passo 6: Configurar Webhooks do Instagram

### 6.1 Adicionar Webhook

1. Vá em **"Produtos"** → **"Webhooks"**
2. Selecione **"Instagram"** no dropdown
3. Clique em **"Assinar este objeto"** (Subscribe to this object)

### 6.2 Configurar URL do Webhook

Preencha:

```yaml
Callback URL: https://seu-dominio.com/api/instagram/webhook
           # Para desenvolvimento local, use ngrok:
           # https://abc123.ngrok.io/api/instagram/webhook

Verify Token: MEU_TOKEN_SECRETO_123
              # Gere um token aleatório forte:
              # openssl rand -base64 32
```

4. Clique em **"Verificar e Salvar"**

### 6.3 Assinar Campos do Webhook

Selecione os eventos que deseja receber:

```
✓ comments         (Comentários)
✓ messages         (Mensagens diretas)
✓ mentions         (Menções)
✓ story_insights   (Insights de stories)
```

---

## Passo 7: Adicionar Testers/Usuários de Teste

### 7.1 Adicionar Usuário de Teste Instagram

1. Vá em **"Funções"** → **"Funções"** (Roles)
2. Role até **"Instagram Testers"**
3. Clique em **"Adicionar Instagram Testers"**
4. Digite seu username do Instagram
5. Aceite o convite no app do Instagram:
   - Vá em Configurações → Apps e Sites → Testador
   - Aceite o convite

---

## Passo 8: Obter Token de Acesso do Usuário

### 8.1 URL de Autorização

Monte a URL para autorização OAuth:

```
https://api.instagram.com/oauth/authorize
  ?client_id={INSTAGRAM_APP_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=user_profile,user_media
  &response_type=code
```

Exemplo completo:
```
https://api.instagram.com/oauth/authorize?client_id=987654321098765&redirect_uri=http://localhost:4000/api/instagram/oauth/callback&scope=user_profile,user_media&response_type=code
```

### 8.2 Autorizar App

1. Acesse a URL montada no navegador
2. Faça login com sua conta Instagram (se necessário)
3. Clique em **"Autorizar"** (Authorize)
4. Você será redirecionado para:
```
http://localhost:4000/api/instagram/oauth/callback?code=ABC123DEF456...
```

### 8.3 Trocar Code por Token

Use o código recebido para obter o token de acesso:

```bash
curl -X POST \
  https://api.instagram.com/oauth/access_token \
  -F client_id={INSTAGRAM_APP_ID} \
  -F client_secret={INSTAGRAM_APP_SECRET} \
  -F grant_type=authorization_code \
  -F redirect_uri={REDIRECT_URI} \
  -F code={CODE_RECEBIDO}
```

Resposta:
```json
{
  "access_token": "IGQVJ...",
  "user_id": 123456789
}
```

---

## Passo 9: Configurar para Instagram Graph API (Business)

### 9.1 Permissões Necessárias

Para usar Instagram Graph API (para contas Business/Creator):

```
Permissões (Scopes):
- instagram_basic
- instagram_content_publish
- instagram_manage_comments
- instagram_manage_insights
- instagram_manage_messages
- pages_show_list
- pages_read_engagement
```

### 9.2 Obter Token de Acesso da Página

1. Use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecione seu App
3. Clique em **"Gerar Token de Acesso"** (Generate Access Token)
4. Selecione as permissões necessárias
5. Copie o token gerado

### 9.3 Obter Instagram Business Account ID

```bash
curl -X GET \
  "https://graph.facebook.com/v18.0/me/accounts?access_token={PAGE_ACCESS_TOKEN}"
```

Depois, obtenha o Instagram Business Account:

```bash
curl -X GET \
  "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_ACCESS_TOKEN}"
```

---

## Passo 10: Configurar Variáveis de Ambiente

### 10.1 Atualizar .env

Edite o arquivo `.env` no projeto:

```bash
# ====================================
# INSTAGRAM API CREDENTIALS
# ====================================

# App Credentials (do Facebook Developers)
INSTAGRAM_APP_ID=987654321098765
INSTAGRAM_APP_SECRET=xyz789abc123def456ghi789

# OAuth Configuration
INSTAGRAM_REDIRECT_URI=http://localhost:4000/api/instagram/oauth/callback

# Webhook Configuration
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=MEU_TOKEN_SECRETO_123

# Instagram Graph API (Business)
INSTAGRAM_GRAPH_API_VERSION=v18.0
```

### 10.2 Configuração Completa

Para ambiente de produção, adicione também:

```bash
# Production URLs
INSTAGRAM_REDIRECT_URI=https://seu-dominio.com/api/instagram/oauth/callback
INSTAGRAM_WEBHOOK_URL=https://seu-dominio.com/api/instagram/webhook

# Instagram Business Account
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400123456789
```

---

## Passo 11: Testar Configuração

### 11.1 Testar Credenciais

```bash
# Testar App ID e Secret
curl -X GET \
  "https://graph.facebook.com/v18.0/oauth/access_token_info?client_id={APP_ID}&access_token={USER_ACCESS_TOKEN}"
```

### 11.2 Testar Webhook

```bash
# O Facebook enviará uma requisição GET para verificar
GET /api/instagram/webhook?hub.mode=subscribe&hub.verify_token=MEU_TOKEN_SECRETO_123&hub.challenge=123456

# Seu endpoint deve retornar: hub.challenge
```

---

## Checklist de Verificação

Antes de começar o desenvolvimento, verifique:

- [ ] App criado no Facebook Developers
- [ ] App ID e App Secret copiados
- [ ] Instagram Basic Display configurado
- [ ] OAuth Redirect URIs adicionadas
- [ ] Webhook configurado (se necessário)
- [ ] Verify Token gerado e salvo
- [ ] Usuário de teste adicionado
- [ ] Token de acesso obtido com sucesso
- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Testes básicos de API funcionando

---

## URLs Importantes

### Painel de Desenvolvimento
- **Facebook Developers:** https://developers.facebook.com
- **Meus Apps:** https://developers.facebook.com/apps/
- **Graph API Explorer:** https://developers.facebook.com/tools/explorer/

### Documentação Oficial
- **Instagram Basic Display API:** https://developers.facebook.com/docs/instagram-basic-display-api
- **Instagram Graph API:** https://developers.facebook.com/docs/instagram-api
- **Webhooks:** https://developers.facebook.com/docs/graph-api/webhooks
- **Permissões:** https://developers.facebook.com/docs/permissions/reference

### Ferramentas
- **Access Token Debugger:** https://developers.facebook.com/tools/debug/accesstoken/
- **Webhook Tester:** https://webhook.site

---

## Problemas Comuns

### 1. "URL de Redirecionamento não está na lista permitida"

**Solução:**
- Verifique se a URL está exatamente igual em OAuth Redirect URIs
- Certifique-se de incluir http:// ou https://
- Não use trailing slash (/)

### 2. "Invalid Client Secret"

**Solução:**
- Verifique se copiou o App Secret corretamente
- Clique em "Mostrar" e copie novamente
- Não inclua espaços em branco

### 3. "Webhook Verification Failed"

**Solução:**
- Certifique-se que o verify_token está correto
- Seu endpoint deve retornar exatamente o hub.challenge recebido
- Verifique logs do servidor

### 4. "Insufficient Permissions"

**Solução:**
- Revise os scopes solicitados na URL de autorização
- Revise as permissões do app em App Review
- Para produção, pode precisar de App Review da Meta

---

## Modo de Desenvolvimento vs Produção

### Modo Desenvolvimento (Padrão)

```yaml
Características:
  - App não publicado
  - Apenas testers podem autorizar
  - Não requer App Review
  - Tokens expiram em 60 dias
  - Webhooks funcionam com ngrok

Limitações:
  - Máximo 25 usuários de teste
  - Funcionalidades limitadas
```

### Modo Produção (Requer App Review)

```yaml
Requisitos:
  - App Review aprovado pela Meta
  - Política de Privacidade publicada
  - Termos de Serviço disponíveis
  - Ícone e descrição do app
  - URL de Data Deletion Request

Benefícios:
  - Tokens de longa duração (60 dias renováveis)
  - Sem limite de usuários
  - Todas as funcionalidades disponíveis
```

---

## Próximos Passos

Após configurar tudo:

1. **Implementar OAuth Flow** (IG-001_task.md)
2. **Configurar Webhooks** (IG-002_task.md)
3. **Testar integração localmente**
4. **Preparar para App Review** (quando pronto para produção)

---

## Suporte

Se encontrar problemas:

1. Consulte a [Documentação Oficial da Meta](https://developers.facebook.com/docs/)
2. Verifique o [Status da Plataforma](https://developers.facebook.com/status/)
3. Acesse o [Fórum de Desenvolvedores](https://developers.facebook.com/community/)

---

**Última Atualização:** 2025-10-19
**Versão da API:** v18.0
**Preparado para:** Social Selling Platform
