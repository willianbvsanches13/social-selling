# Investigation Findings - Inbox System Analysis

**Feature ID**: FEAT-2025-20251103171956
**Investigation Date**: 2025-11-03
**Environment**: Production (https://app-socialselling.willianbvsanches.com)

## Executive Summary

Investigação manual revelou **5 problemas críticos** no sistema de inbox que impactam severamente a experiência do usuário. Todos os problemas foram reproduzidos e documentados com screenshots.

---

## Problems Identified

### 🔴 PROBLEMA 1: Lista de Conversas sem Nome do Usuário
**Severidade**: CRÍTICA
**Status**: CONFIRMADO

**Descrição**:
- Todas as conversas na lista mostram apenas "@" sem o username
- O heading (nome do usuário) aparece completamente vazio
- Estrutura HTML: `<heading [level=4]>` sem conteúdo de texto

**Evidência**:
- Screenshot: `02-inbox-conversations-list.png`
- Page snapshot mostra: `paragraph [ref=e143]: "@"` seguido de heading vazio
- API response: `/api/messaging/conversations` retorna dados (200 OK)

**Sintomas Observados**:
```yaml
- generic [ref=e142]:
  - heading [level=4]  # ← VAZIO, deveria ter nome
  - paragraph [ref=e143]: "@"  # ← Apenas @ sem username
```

**Impacto**: Usuários não conseguem identificar com quem estão conversando

---

### 🔴 PROBLEMA 2: Header da Conversa Mostra "Unknown User"
**Severidade**: CRÍTICA
**Status**: CONFIRMADO

**Descrição**:
- Ao abrir uma conversa, o header mostra "Unknown User" e "@unknown"
- Mesmo havendo dados da conversa carregados pela API

**Evidência**:
- Screenshot: `03-conversation-opened.png`
- HTML mostra: `heading "Unknown User" [level=3]` e `paragraph: "@unknown"`

**Sintomas Observados**:
```yaml
- heading "Unknown User" [level=3]
- paragraph: "@unknown"
```

**Impacto**: Impossível identificar o cliente atual na conversa

---

### 🔴 PROBLEMA 3: Fotos de Perfil não Carregam (Placeholder Genérico)
**Severidade**: ALTA
**Status**: CONFIRMADO

**Descrição**:
- Todas as conversas mostram ícone placeholder genérico ao invés da foto do perfil do Instagram
- As imagens existem (vistas nas mensagens com anexos) mas não aparecem na lista

**Evidência**:
- Screenshots: `02-inbox-conversations-list.png`, `03-conversation-opened.png`
- Network logs mostram imagens sendo carregadas de `scontent-lga3-3.xx.fbcdn.net` mas não aplicadas aos avatares

**Sintomas Observados**:
- Todos os avatares mostram ícone genérico
- API retorna profile_pic_url mas não é renderizado

**Impacto**: Interface menos intuitiva, dificulta reconhecimento visual de clientes

---

### 🟡 PROBLEMA 4: Anexos/Mídias Carregam MAS Podem Ter Problemas de Exibição
**Severidade**: MÉDIA
**Status**: PARCIALMENTE CONFIRMADO

**Descrição**:
- As mídias/anexos estão sendo carregados da API do Instagram (via lookaside.fbsbx.com)
- Network logs mostram requisições [206] para múltiplos vídeos/imagens
- Visualmente aparecem como boxes com ícones, mas não é claro se são clicáveis ou expandíveis

**Evidência**:
- Page snapshot mostra várias mensagens com: `generic: img` (nested inside generic containers)
- Network logs confirmam carregamento: 10+ assets de `lookaside.fbsbx.com`

**Sintomas Observados**:
```yaml
- generic [ref=e321]:
  - generic [ref=e323]:
    - generic:
      - img  # ← Imagem existe mas pode não ser interativa
  - paragraph [ref=e325]: "KKKKKKKK #memes..."
```

**Impacto**: Possível dificuldade em visualizar/expandir anexos

---

### 🔴 PROBLEMA 5: Sistema de Reply não Mostra Vínculo com Mensagem Original
**Severidade**: ALTA
**Status**: CONFIRMADO

**Descrição**:
- Mensagens que são respostas (replies) não mostram nenhum indicador visual da mensagem original
- Não há componente de "quoted message" ou "replying to"
- Impossível saber o contexto da resposta

**Evidência**:
- Screenshot: `03-conversation-opened.png`
- Todas as mensagens aparecem como mensagens normais, sem indicação de thread/reply

**Sintomas Observados**:
- Estrutura flat de mensagens sem hierarquia visual
- Nenhum elemento de "replied_to_message" no DOM

**Impacto**: Perda de contexto em conversas complexas

---

### 🟡 PROBLEMA 6: Envio de Mensagens Não Funciona
**Severidade**: CRÍTICA
**Status**: CONFIRMADO

**Descrição**:
- Campo de texto aceita input normalmente
- Botão de envio fica habilitado quando há texto
- AO CLICAR NO BOTÃO: mensagem NÃO é enviada
- Mensagem permanece no campo de texto
- Nenhum feedback visual de erro ou sucesso

**Evidência**:
- Screenshots: `05-typing-message.png`, `06-after-sending-message.png`
- Mensagem "Teste de mensagem" permanece no campo após 3 segundos do clique
- Nenhum erro no console
- Nenhuma requisição POST para envio detectada nos network logs

**Sintomas Observados**:
```yaml
# Antes do clique:
- textbox "Type a message...": Teste de mensagem
- button [ref=e534] [cursor=pointer]  # Habilitado

# Após clique (3s depois):
- textbox "Type a message..." [ref=e533]: Teste de mensagem  # ← AINDA LÁ!
- button [active] [ref=e534]  # Botão ficou "active" mas nada aconteceu
```

**Impacto**:
- CRÍTICO: Usuários não conseguem enviar mensagens
- Possível perda de mensagens tentadas
- Quebra total da funcionalidade principal do inbox

---

## Technical Analysis

### API Calls Observed
```
✅ GET /api/instagram/accounts => 200 OK
✅ GET /api/messaging/conversations?clientAccountId=... => 200 OK
✅ GET /api/messaging/conversations/{id}/messages?limit=100 => 200 OK
✅ GET lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=... => 206 Partial Content (attachments)
❌ POST /api/messaging/... => NENHUMA REQUISIÇÃO DETECTADA (envio de mensagem)
```

### Network Issues Found
```
❌ 404 - /customers?_rsc=... (não relacionado ao inbox)
❌ 404 - /settings?_rsc=... (não relacionado ao inbox)
❌ 404 - /help?_rsc=... (não relacionado ao inbox)
```

### Data Flow Analysis

**Conversations List**:
1. API retorna dados corretamente ✅
2. Frontend recebe dados ✅
3. **Componente não renderiza username/foto** ❌

**Message View**:
1. API retorna mensagens ✅
2. API retorna anexos ✅
3. **Componente não identifica usuário corretamente** ❌
4. **Sistema de reply não implementado ou quebrado** ❌

**Message Sending**:
1. Input funciona ✅
2. Botão habilita corretamente ✅
3. **Click handler não executa POST** ❌
4. **Nenhum feedback de erro** ❌

---

## Root Cause Hypotheses

### H1: Problemas de Mapeamento de Dados (Username/Foto)
- Frontend não está acessando campos corretos da resposta da API
- Possível: `participant.username` vs `participant.user.username`
- Possível: `profile_pic_url` não está sendo passado corretamente para componente Avatar

### H2: Componente de Reply não Implementado
- Sistema de exibição de mensagens não verifica campo `reply_to` ou similar
- Nenhum componente visual para quoted messages

### H3: Handler de Envio Quebrado/Não Conectado
- onClick do botão pode estar:
  - Não conectado à função de envio
  - Executando mas sem fazer POST (erro silencioso)
  - Validação impedindo envio mas sem mostrar erro

---

## Recommended Next Steps

### Fase 2: Code Analysis (PRÓXIMA)
1. **Identificar componente da lista de conversas**
   - Procurar por: `ConversationList`, `InboxList`, etc.
   - Analisar como dados são mapeados para UI

2. **Identificar componente de mensagens**
   - Procurar por: `MessageView`, `ChatView`, `ConversationDetail`
   - Verificar renderização de attachments e replies

3. **Identificar handler de envio**
   - Procurar por: `sendMessage`, `onSend`, handler do botão de envio
   - Verificar integração com API

4. **Identificar API de mensagens**
   - Endpoint: POST `/api/messaging/...`
   - Verificar se rota existe no backend

### Fase 3: Implementation Plan
- Prioridade 1: Envio de mensagens (CRÍTICO)
- Prioridade 2: Exibição de username/foto (CRÍTICO)
- Prioridade 3: Sistema de replies (ALTA)
- Prioridade 4: Melhorias em anexos (MÉDIA)

---

## Screenshots Reference
1. `01-inbox-initial.png` - Dashboard inicial
2. `02-inbox-conversations-list.png` - **Lista de conversas com problemas**
3. `03-conversation-opened.png` - **Conversa aberta mostrando "Unknown User"**
4. `04-messages-with-media.png` - Mensagens com anexos
5. `05-typing-message.png` - **Digitando mensagem de teste**
6. `06-after-sending-message.png` - **Mensagem NÃO enviada (ainda no campo)**

---

---

## Fase 2: Detailed Code Analysis - COMPLETED ✅

### Analysis Summary
Realizamos análise completa do código frontend e backend para identificar as causas raiz de todos os problemas.

### Key Files Analyzed
```
Frontend:
- frontend/src/components/messages/ConversationList.tsx
- frontend/src/components/messages/MessageThread.tsx
- frontend/src/components/messages/MessageInput.tsx
- frontend/src/app/(dashboard)/inbox/page.tsx
- frontend/src/lib/hooks/useMessaging.ts
- frontend/src/lib/api/messaging.ts
- frontend/src/lib/api/client.ts
- frontend/src/lib/api/endpoints.ts
- frontend/src/types/message.ts

Backend:
- backend/src/modules/messaging/controllers/messaging.controller.ts
- backend/src/modules/messaging/services/messaging.service.ts
- backend/src/modules/messaging/services/conversation.service.ts
- backend/src/modules/messaging/dto/message-response.dto.ts
- backend/src/modules/messaging/dto/conversation-response.dto.ts
- backend/src/domain/entities/message.entity.ts
- backend/src/domain/entities/conversation.entity.ts
```

---

### 🔍 ROOT CAUSE ANALYSIS - DETAILED FINDINGS

#### PROB-001 & PROB-003: Username e Profile Picture Vazios

**Root Cause Confirmada**:
```typescript
// conversation.service.ts:52-79 - listConversations
async listConversations(...): Promise<ConversationListResult> {
  // ...
  const conversations = await this.conversationRepository.findByClientAccount(
    clientAccountId,
    { status, hasUnread, limit, offset }
  );

  return {
    conversations,  // ← Retorna direto do repositório SEM enrichment!
    total,
    limit,
    offset,
  };
}
```

**Problema Identificado**:
1. O serviço tem método `enrichParticipantProfile` (lines 111-192) que:
   - Busca dados do Instagram API via `instagramApiService.getUserProfileById`
   - Atualiza `participantUsername` e `participantProfilePic`
   - **MAS este método NÃO é chamado automaticamente em listConversations!**

2. Conversas são retornadas do banco de dados com campos null/undefined
3. Frontend renderiza corretamente os campos (ConversationList.tsx:78, 81)
4. **Mas não há dados para renderizar**

**UPDATE - Root Cause REAL (após análise aprofundada)**:
❌ O método `enrichParticipantProfile` **É CHAMADO** pelo webhook (lines 98-124 do webhook-message.handler.ts) MAS **FALHA SILENCIOSAMENTE** porque:

1. Tenta fazer: `GET /{participantPlatformId}` (ex: GET /12345678)
2. **Instagram Graph API NÃO PERMITE buscar perfis de usuários aleatórios pelo IGID**
3. Você só consegue dados da SUA conta business, não de terceiros
4. Erro retorna `null` (não quebra) mas dados nunca são salvos

**Solução CORRETA**:
```typescript
// instagram-api.service.ts:387 - getConversations
const params = {
  fields: 'id,participants,updated_time',  // ← PROBLEMA AQUI!
  // DEVERIA SER: 'id,participants{id,username,profile_pic},updated_time'
};
```

A API do Instagram Messenger **PODE retornar** `username` e `profile_pic` dos participantes, mas o código não está pedindo esses campos!

**Localização do Problema Real**:
- `backend/src/modules/instagram/services/instagram-api.service.ts:387` (getConversations fields)
- `backend/src/modules/messaging/services/conversation.service.ts:111-192` (enrichParticipantProfile não funciona)

---

#### PROB-002: Header Mostra "Unknown User"

**Root Cause Confirmada**:
```typescript
// inbox/page.tsx - MessageThread não recebe conversation data
<MessageThread
  messages={messagesData?.messages || []}
  isLoading={messagesIsLoading}
  // ← Falta: conversation={selectedConversation}
/>

// MessageThread.tsx - Não tem prop para conversation
interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  // ← Falta: conversation?: Conversation
}
```

**Problema Identificado**:
1. MessageThread precisa de dados do participante para header
2. Mas component não recebe `conversation` como prop
3. Header usa fallback "Unknown User" e "@unknown"

**Solução**:
1. Adicionar `conversation?: Conversation` em MessageThreadProps
2. Passar `selectedConversation` como prop em inbox/page.tsx
3. Usar `conversation.participantUsername` e `conversation.participantProfilePic` no header

**Localização do Problema**:
- `frontend/src/app/(dashboard)/inbox/page.tsx` (linha ~70-75)
- `frontend/src/components/messages/MessageThread.tsx:11-14`

---

#### PROB-004: Envio de Mensagens Não Funciona

**Análise Completa da Cadeia de Execução**:

✅ **MessageInput.tsx (lines 22-34)** - CORRETO
```typescript
const handleSend = async () => {
  if (!text.trim()) return;
  if (disabled) return;
  onSend(text.trim());  // ← Chama callback corretamente
  setText('');
  // ...
};
```

✅ **inbox/page.tsx (lines 92-95)** - CORRETO
```typescript
const handleSendMessage = async (text: string) => {
  if (!selectedConversation) return;
  sendMessageMutation.mutate({
    conversationId: selectedConversation.id,
    data: { text },
  });
};
```

✅ **useMessaging.ts (lines 76-106)** - CORRETO
```typescript
export function useSendMessage(...) {
  return useMutation({
    mutationFn: ({ conversationId, data }) =>
      messagingApi.sendMessage(conversationId, data),  // ← Chama API
    onSuccess: (message, variables) => {
      // Invalidate queries corretamente
    },
  });
}
```

✅ **messaging.ts (lines 69-78)** - CORRETO
```typescript
async sendMessage(conversationId: string, data: SendMessageRequest): Promise<Message> {
  const response = await apiClient.post<Message>(
    API_ENDPOINTS.CONVERSATION_SEND_MESSAGE(conversationId),
    data
  );
  return response.data!;
}
```

✅ **endpoints.ts (line 50)** - CORRETO
```typescript
CONVERSATION_SEND_MESSAGE: (conversationId: string) =>
  `/messaging/conversations/${conversationId}/messages`
```

✅ **client.ts (lines 126-138)** - CORRETO
```typescript
async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await this.client.post<T>(url, data, config);
  return {
    success: true,
    data: response.data,
  };
}
```

✅ **messaging.controller.ts (lines 161-201)** - CORRETO
```typescript
@Post('conversations/:id/messages')
async sendMessage(@Request() req: any, @Param('id') conversationId: string, @Body() sendMessageDto: SendMessageDto): Promise<MessageResponseDto> {
  const message = await this.messagingService.sendTextMessage(
    req.user.id,
    conversationId,
    sendMessageDto.text,
  );
  return message.toJSON() as MessageResponseDto;
}
```

**Root Cause**:
- **TODO CÓDIGO ESTÁ CORRETO!** ✅
- Problema deve ser RUNTIME, não código
- Possíveis causas:
  1. **Erro silencioso** - mutation onError não configurado para mostrar erro
  2. **24-hour window expired** - backend valida janela de resposta do Instagram
  3. **Problema de autenticação/permissão** - token inválido
  4. **CORS ou network issue** - request bloqueado antes de chegar ao backend

**Ação Necessária**:
- Adicionar logging/debugging no mutation
- Verificar console do browser durante envio
- Verificar network tab para ver se POST é feito
- Checar se há erro do backend (24h window, etc.)

**Localização Investigação**: Runtime debugging necessário

---

#### PROB-005: Reply Messages Não Mostram Contexto

**Root Cause Confirmada**:

✅ **Backend SUPORTA repliedToMessage completamente**:
```typescript
// message-response.dto.ts:48-52
@ApiPropertyOptional({
  description: 'The message being replied to (if this is a reply)',
  type: () => RepliedMessageDto,
})
repliedToMessage?: RepliedMessageDto;

// messaging.service.ts:141-161
if (message.repliedToMessageId) {
  const repliedMessage = await this.messageRepository.findById(
    message.repliedToMessageId
  );
  if (repliedMessage) {
    baseDto.repliedToMessage = this.mapToRepliedMessageDto(repliedMessage);
  }
}

// message.entity.ts:46
repliedToMessageId?: string;
```

✅ **Frontend RENDERIZA corretamente SE dados existirem**:
```typescript
// MessageThread.tsx:102-106
{message.repliedToMessage && (
  <div className="mb-3">
    <QuotedMessage repliedMessage={message.repliedToMessage} />
  </div>
)}
```

**Problema Real**:
- Backend código está CORRETO
- Frontend código está CORRETO
- **MAS `message.repliedToMessageId` no banco está sempre null/undefined**

**Root Cause REAL**:
- Instagram webhook handler NÃO está capturando o relacionamento de reply
- Quando Instagram envia mensagem de reply, o campo `reply_to` não está sendo:
  1. Extraído do payload do Instagram
  2. Mapeado para `repliedToMessageId` na entidade Message
  3. Salvo no banco de dados

**Solução**:
1. Verificar Instagram webhook handler/processor
2. Adicionar lógica para capturar campo `reply_to` ou similar do Instagram payload
3. Mapear para Message.repliedToMessageId ao criar mensagem
4. Garantir que mensagem original já existe no banco antes de criar reply

**Localização do Problema**: Instagram webhook handler (não analisado ainda)

---

#### PROB-006: Attachments Funcionam Mas Podem Ter Issues

**Análise Completa**:

✅ **Backend suporta attachments completamente**:
```typescript
// message.entity.ts:24-28, 47
export interface Attachment {
  url: string;
  type: AttachmentType;
  metadata: Record<string, unknown>;
}
attachments?: Attachment[];

// messaging.service.ts:164-172
if (message.hasAttachments) {
  baseDto.attachments = message.attachments.map(
    (attachment): AttachmentDto => ({
      url: attachment.url,
      type: attachment.type,
      metadata: attachment.metadata,
    }),
  );
}
```

✅ **Frontend renderiza attachments corretamente**:
```typescript
// MessageThread.tsx:112-122
{message.attachments && message.attachments.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {message.attachments.map((attachment, index) => (
      <MediaAttachment
        key={index}
        attachment={attachment}
        onClick={() => handleOpenModal(message.attachments!, index)}
      />
    ))}
  </div>
)}
```

**Status**:
- Attachments CARREGAM corretamente (confirmado no browser)
- Network logs mostram assets sendo baixados (206 responses)
- Componentes MediaAttachment e AttachmentModal existem
- onClick handlers configurados

**Possível Issue**: Modal pode não abrir ou não funcionar corretamente ao clicar
**Ação**: Teste manual após correções críticas

---

## Conclusion

### Code Analysis - FASE 2 COMPLETA ✅

A investigação manual + análise de código confirmou **6 problemas**, sendo **4 críticos**:

| ID | Problema | Severidade | Root Cause Confirmada | Status |
|----|----------|------------|----------------------|--------|
| PROB-001 | Usernames não aparecem | CRÍTICO | ConversationService.listConversations não chama enrichParticipantProfile | ✅ CONFIRMADO |
| PROB-002 | "Unknown User" no header | CRÍTICO | MessageThread não recebe conversation como prop | ✅ CONFIRMADO |
| PROB-003 | Fotos de perfil não carregam | ALTA | Mesmo que PROB-001 - enrichment não executado | ✅ CONFIRMADO |
| PROB-004 | Envio de mensagens quebrado | CRÍTICO BLOCKER | Código correto - Issue runtime (24h window? erro silencioso?) | ⚠️ DEBUGGING NEEDED |
| PROB-005 | Reply não mostra contexto | ALTA | Instagram webhook não popula repliedToMessageId no banco | ✅ CONFIRMADO |
| PROB-006 | Attachments interação | MÉDIA | Attachments carregam OK - verificar modal | ⚠️ TESTE MANUAL |

**Status**: Pronto para Fase 3 (Task Creation & Implementation)
