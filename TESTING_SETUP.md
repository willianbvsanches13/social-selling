# Instagram Messaging - Testing Infrastructure

Complete testing setup for the Instagram messaging feature including database seeds, webhook simulation, and comprehensive E2E tests.

## 📋 Overview

This document describes the complete testing infrastructure created for the Instagram messaging feature:

1. **Database Seed** - Pre-populated test data for local development
2. **Webhook Simulator** - Script to simulate Instagram webhook delivery
3. **E2E Tests** - Comprehensive Playwright tests covering all functionality

## 🗄️ Database Seed

### Location
```
backend/migrations/seed-instagram-messages.sql
```

### What It Creates

- **1 Test User**
  - Email: `test@example.com`
  - ID: `00000000-0000-0000-0000-000000000001`

- **1 Instagram Business Account**
  - Username: `mybusiness`
  - Platform ID: `17841403506636395`
  - ID: `00000000-0000-0000-0000-000000000010`

- **3 Conversations**
  - User 1 (ID: `1378516947077414`) - 1 unread message
  - User 2 (ID: `2149642518895477`) - 2 unread messages
  - User 3 (ID: `3456789012345678`) - 2 unread messages

- **8 Messages**
  - 7 customer messages
  - 1 echo message (sent by business)

### Usage

```bash
# From the backend directory
npm run db:seed:messages

# Or directly with psql
psql -h localhost -U postgres -d social_selling -f migrations/seed-instagram-messages.sql
```

### Message Examples

1. "Oi! Gostaria de saber mais sobre os produtos" - @user1
2. "Olá, vi seu post no Instagram e me interessei" - @user2
3. "Vocês fazem entrega para São Paulo?" - @user2
4. "Sim, fazemos entrega em toda região metropolitana!" - System (echo)
5. "Perfeito! Qual o prazo de entrega?" - @user2
6. "Vocês aceitam cartão de crédito?" - @user1
7. "Boa tarde! Vocês têm estoque disponível?" - @user3
8. "Adorei os produtos! 😍🛍️" - @user3

## 🔄 Webhook Simulator

### Location
```
backend/scripts/simulate-webhooks.ts
backend/test/fixtures/instagram-webhooks.json
```

### Purpose

Simulates Instagram sending webhooks to your local backend, since Instagram cannot reach `localhost` for webhook delivery.

### Features

- ✅ Loads realistic webhook payloads from JSON fixtures
- ✅ Sends to configurable backend URL
- ✅ Supports sending individual or all webhooks
- ✅ Configurable delay between webhook deliveries
- ✅ Detailed console logging with emoji indicators
- ✅ Error handling and reporting

### Usage

```bash
# From the backend directory

# Send all 8 webhook examples (default 1s delay)
npm run simulate-webhooks

# Send only webhook at index 0
npm run simulate-webhooks -- --index=0

# Send all with 2-second delay between each
npm run simulate-webhooks -- --delay=2000

# Combine options
npm run simulate-webhooks -- --index=3 --delay=500
```

### Output Example

```
🚀 Simulador de Webhooks do Instagram
=====================================
📡 Backend URL: http://localhost:3001
⏱️  Delay entre webhooks: 1000ms
📊 Total de webhooks disponíveis: 8

📬 Enviando 8 webhooks...

[1/8]
📤 Enviando: Mensagem de @user1 (cliente)
📍 URL: http://localhost:3001/instagram/webhooks
✅ Sucesso! Status: 200
📦 Resposta: { "success": true }
⏳ Aguardando 1000ms...

[2/8]
📤 Enviando: Mensagem de @user2 (cliente)
...
```

### Environment Variables

```bash
# Configure backend URL (defaults to http://localhost:3001)
BACKEND_URL=http://localhost:3001 npm run simulate-webhooks
```

## 🧪 E2E Tests with Playwright

### Location
```
e2e/messaging.spec.ts
e2e/fixtures/messaging.ts
e2e/messaging/README.md
```

### Test Coverage

**25 comprehensive E2E tests** covering:

#### 1. Webhook Reception and Processing (3 tests)
- Receive and process Instagram webhook
- Handle multiple webhooks in sequence
- Handle echo messages (sent by business)

#### 2. Conversation List Display (4 tests)
- Display list of conversations
- Filter conversations by unread status
- Display conversation with latest message timestamp
- Show profile picture for each conversation

#### 3. Message Thread Display (5 tests)
- Display messages when conversation is selected
- Display messages with correct sender alignment
- Display message timestamps
- Display delivery status for sent messages
- Auto-scroll to latest message

#### 4. Sending Messages (4 tests)
- Send a text message
- Disable send button when message is empty
- Send message with Enter key
- Show loading state while sending

#### 5. Mark as Read Functionality (2 tests)
- Mark conversation as read when opened
- Update unread count in real-time

#### 6. Real-time Updates (2 tests)
- Poll for new messages periodically
- Update conversation list with new messages

#### 7. Error Handling (2 tests)
- Handle network errors gracefully
- Handle send message failure

#### 8. UI/UX Features (3 tests)
- Show typing indicator placeholder
- Display empty state when no conversations
- Highlight selected conversation

### Running Tests

```bash
# From the project root

# Run all E2E tests
npm run test:e2e

# Run only messaging tests
npx playwright test messaging

# Run with interactive UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test suite
npx playwright test messaging -g "Webhook Reception"
npx playwright test messaging -g "Conversation List"
npx playwright test messaging -g "Sending Messages"
```

### Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

Reports include:
- Test execution timeline
- Screenshots of failures
- Videos of failed tests
- Execution traces for debugging

## 🏗️ Complete Testing Workflow

### Step 1: Set Up Database

```bash
# Ensure Docker is running
docker-compose up -d

# Run database migrations (if needed)
cd backend
npm run migrate:up

# Seed test data
npm run db:seed:messages
```

### Step 2: Start Services

```bash
# Start backend (in one terminal)
cd backend
npm run start:dev

# Start frontend (in another terminal)
cd frontend
npm run dev

# Start workers (if needed, in another terminal)
cd backend
npm run start:worker:dev
```

### Step 3: Test Webhook Reception

```bash
# Send webhook examples to backend
cd backend
npm run simulate-webhooks

# Check backend logs to verify processing
# Check frontend at http://localhost:3000/inbox to see messages
```

### Step 4: Run E2E Tests

```bash
# From project root
npm run test:e2e

# Or run in UI mode to watch execution
npm run test:e2e:ui
```

## 📁 File Structure

```
social-selling-2/
├── backend/
│   ├── migrations/
│   │   └── seed-instagram-messages.sql         # Database seed
│   ├── scripts/
│   │   └── simulate-webhooks.ts                # Webhook simulator
│   ├── test/
│   │   └── fixtures/
│   │       └── instagram-webhooks.json         # Webhook payloads
│   └── package.json                            # Added scripts
├── e2e/
│   ├── messaging.spec.ts                       # Main test suite
│   ├── fixtures/
│   │   ├── messaging.ts                        # Test fixtures
│   │   └── auth.ts                             # Auth helpers
│   ├── messaging/
│   │   └── README.md                           # Testing guide
│   └── utils/
│       └── test-helpers.ts                     # Shared utilities
├── playwright.config.ts                        # Playwright config
└── package.json                                # E2E test scripts
```

## 🔧 npm Scripts Added

### Backend (`backend/package.json`)

```json
{
  "scripts": {
    "db:seed:messages": "psql -h localhost -U postgres -d social_selling -f migrations/seed-instagram-messages.sql",
    "simulate-webhooks": "ts-node -r tsconfig-paths/register scripts/simulate-webhooks.ts"
  }
}
```

### Root (`package.json`)

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

## 🎯 Use Cases

### For Development

```bash
# Quick test of webhook processing
npm run db:seed:messages
cd backend && npm run simulate-webhooks -- --index=0

# Visual testing during development
npm run test:e2e:ui
```

### For CI/CD

```bash
# Run all tests in headless mode
npm run test:e2e

# Generate reports
npm run test:e2e:report
```

### For Debugging

```bash
# Step through failing test
npm run test:e2e:debug

# Run specific test with headed browser
npx playwright test messaging -g "should send a text message" --headed
```

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Re-run migrations
cd backend && npm run migrate:up

# Re-seed data
npm run db:seed:messages
```

### Webhook Not Received

```bash
# Check backend is running
curl http://localhost:3001/health

# Check webhook endpoint
curl -X POST http://localhost:3001/instagram/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha1=test" \
  -d '{"object":"instagram","entry":[]}'
```

### Tests Failing

```bash
# Clear Playwright cache
npx playwright install --force

# Update browser binaries
npx playwright install

# Run with debug output
DEBUG=pw:api npm run test:e2e
```

## 📊 Test Data IDs

For reliable test selection, use these `data-testid` attributes in components:

```tsx
// Conversation List
<div data-testid="conversation-list">
  <div data-testid={`conversation-${conversation.id}`}>
    <span data-testid="unread-badge">{unreadCount}</span>
    <span data-testid="message-time">{timestamp}</span>
  </div>
</div>

// Message Thread
<div data-testid="message-thread">
  <div data-testid={`message-${message.id}`}>
    <span data-testid="message-timestamp">{time}</span>
    <span data-testid="delivery-status">✓✓</span>
  </div>
</div>

// Message Input
<input data-testid="message-input" />
<button data-testid="send-button">Send</button>

// States
<div data-testid="error-message">Error occurred</div>
<div data-testid="error-toast">Failed to send</div>
<div data-testid="empty-state">No conversations</div>
```

## 📚 Additional Resources

- **Webhook Simulator**: `backend/scripts/simulate-webhooks.ts`
- **Webhook Fixtures**: `backend/test/fixtures/instagram-webhooks.json`
- **E2E Tests**: `e2e/messaging.spec.ts`
- **Test Fixtures**: `e2e/fixtures/messaging.ts`
- **Testing Guide**: `e2e/messaging/README.md`

## ✅ Checklist for New Features

When adding new messaging features:

- [ ] Add seed data to `seed-instagram-messages.sql`
- [ ] Add webhook examples to `instagram-webhooks.json`
- [ ] Add test fixtures to `e2e/fixtures/messaging.ts`
- [ ] Write E2E tests in `e2e/messaging.spec.ts`
- [ ] Add `data-testid` attributes to new components
- [ ] Update this documentation
- [ ] Verify all tests pass: `npm run test:e2e`

## 🎉 Summary

This testing infrastructure provides:

1. **Realistic Test Data** - Database seed with 3 conversations and 8 messages
2. **Webhook Simulation** - Test Instagram webhook reception without production setup
3. **Comprehensive E2E Tests** - 25 tests covering all messaging functionality
4. **Developer Experience** - Easy-to-use scripts and detailed documentation
5. **CI/CD Ready** - Tests can run in automated pipelines

All tests are designed to work both locally with Docker and in CI/CD environments.
