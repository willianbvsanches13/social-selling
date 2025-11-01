# Instagram Messaging E2E Tests

This directory contains comprehensive end-to-end tests for the Instagram messaging feature.

## Overview

The messaging E2E tests cover the complete user flow from webhook reception to message display and interaction:

1. **Webhook Reception**: Testing Instagram webhooks being received and processed
2. **Conversation List**: Testing conversation list display, filtering, and real-time updates
3. **Message Thread**: Testing message display, alignment, timestamps, and delivery status
4. **Sending Messages**: Testing message sending, input validation, and loading states
5. **Mark as Read**: Testing read status updates and unread count changes
6. **Real-time Updates**: Testing polling for new messages and conversation updates
7. **Error Handling**: Testing network errors and API failures
8. **UI/UX Features**: Testing empty states, selected states, and visual feedback

## Test Structure

```
e2e/
├── messaging.spec.ts          # Main test suite
├── fixtures/
│   ├── messaging.ts          # Mock data and API routes for messaging
│   └── auth.ts               # Authentication helpers
└── utils/
    └── test-helpers.ts       # Shared test utilities
```

## Prerequisites

### 1. Database Setup

First, run the database seed to populate test data:

```bash
# From the backend directory
npm run db:seed:messages
```

This will create:
- 1 test user
- 1 Instagram business account
- 3 conversations (with user1, user2, and user3)
- 8 messages across the conversations

### 2. Docker Environment

Ensure your Docker environment is running:

```bash
docker-compose up -d
```

This should start:
- PostgreSQL database
- Redis
- Backend API (port 3001)
- Frontend (port 3000)
- Workers (for queue processing)

## Running Tests

### Run All E2E Tests

From the project root:

```bash
# Run all E2E tests
npm run test:e2e

# Run only messaging tests
npx playwright test messaging

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Run Specific Test Suites

```bash
# Run only webhook tests
npx playwright test messaging -g "Webhook Reception"

# Run only conversation list tests
npx playwright test messaging -g "Conversation List"

# Run only message sending tests
npx playwright test messaging -g "Sending Messages"
```

## Webhook Simulator

For testing webhook reception without Instagram:

### Using the Webhook Simulator Script

```bash
# From the backend directory

# Send all webhook examples
npm run simulate-webhooks

# Send a specific webhook by index
npm run simulate-webhooks -- --index=0

# Customize delay between webhooks (milliseconds)
npm run simulate-webhooks -- --delay=2000
```

### Available Webhook Examples

The webhook fixtures include 8 realistic examples:

1. **Index 0**: Message from @user1 - "Oi! Gostaria de saber mais sobre os produtos"
2. **Index 1**: Message from @user2 - "Olá, vi seu post no Instagram e me interessei"
3. **Index 2**: Second message from @user2 - "Vocês fazem entrega para São Paulo?"
4. **Index 3**: Echo message (system response) - "Sim, fazemos entrega em toda região metropolitana!"
5. **Index 4**: Third message from @user2 - "Perfeito! Qual o prazo de entrega?"
6. **Index 5**: Second message from @user1 - "Vocês aceitam cartão de crédito?"
7. **Index 6**: Message from @user3 (new customer) - "Boa tarde! Vocês têm estoque disponível?"
8. **Index 7**: Message with emoji from @user3 - "Adorei os produtos! 😍🛍️"

## Test Scenarios Covered

### Webhook Reception (3 tests)
- ✅ Receive and process single Instagram webhook
- ✅ Handle multiple webhooks in sequence
- ✅ Handle echo messages (sent by business)

### Conversation List Display (4 tests)
- ✅ Display all conversations with usernames and profile pictures
- ✅ Show unread count badges
- ✅ Filter conversations by unread status
- ✅ Display relative timestamps

### Message Thread Display (5 tests)
- ✅ Display all messages in a conversation
- ✅ Align customer messages left, user messages right
- ✅ Show message timestamps
- ✅ Display delivery status icons (checkmarks)
- ✅ Auto-scroll to latest message

### Sending Messages (4 tests)
- ✅ Send text message via button click
- ✅ Send text message via Enter key
- ✅ Disable send button when input is empty
- ✅ Show loading state while sending

### Mark as Read (2 tests)
- ✅ Mark conversation as read when opened
- ✅ Update unread count in real-time

### Real-time Updates (2 tests)
- ✅ Poll for new messages every 5 seconds
- ✅ Update conversation list with new messages

### Error Handling (2 tests)
- ✅ Handle network errors gracefully
- ✅ Handle send message failures with error feedback

### UI/UX Features (3 tests)
- ✅ Show placeholder text in message input
- ✅ Display empty state when no conversations
- ✅ Highlight selected conversation

**Total: 25 comprehensive E2E tests**

## Test Data IDs

The tests use `data-testid` attributes for reliable element selection:

### Conversation List
- `[data-testid="conversation-list"]` - The conversation list container
- `[data-testid="conversation-{id}"]` - Individual conversation item
- `[data-testid="unread-badge"]` - Unread count badge
- `[data-testid="filter-unread"]` - Unread filter button
- `[data-testid="message-time"]` - Last message timestamp

### Message Thread
- `[data-testid="message-thread"]` - Message thread container
- `[data-testid="message-{id}"]` - Individual message
- `[data-testid="message-timestamp"]` - Message timestamp
- `[data-testid="delivery-status"]` - Delivery status icon

### Message Input
- `[data-testid="message-input"]` - Message text input
- `[data-testid="send-button"]` - Send message button

### Error States
- `[data-testid="error-message"]` - Error message display
- `[data-testid="error-toast"]` - Error toast notification
- `[data-testid="empty-state"]` - Empty state display

## Continuous Integration

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    CI: true
    BASE_URL: http://localhost:3000
    BACKEND_URL: http://localhost:3001
```

## Debugging Tests

### Visual Debugging

```bash
# Run with UI mode to see test execution
npm run test:e2e:ui

# Run in headed mode to see browser
npm run test:e2e:headed
```

### Debug Mode

```bash
# Step through tests with debugger
npm run test:e2e:debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots on failure
- Videos on failure
- Traces for debugging

Access these in:
```
test-results/
├── screenshots/
├── videos/
└── traces/
```

### View Test Report

```bash
# Generate and open HTML report
npm run test:e2e:report
```

## Mock Data vs Real Backend

The tests use a hybrid approach:

1. **Mock Data**: Used for frontend-only tests
   - Conversation list
   - Message display
   - UI interactions

2. **Real Backend**: Used for integration tests
   - Webhook reception
   - Database queries
   - Queue processing

To test against real backend:
1. Ensure backend is running (`npm run dev` in backend/)
2. Run webhook simulator to populate data
3. Run E2E tests

## Troubleshooting

### Tests Failing

1. **Database not seeded**
   ```bash
   cd backend && npm run db:seed:messages
   ```

2. **Backend not running**
   ```bash
   docker-compose up -d
   # Or manually: cd backend && npm run dev
   ```

3. **Port conflicts**
   - Ensure ports 3000 (frontend) and 3001 (backend) are available
   - Check `docker-compose ps` for service status

4. **Stale test data**
   ```bash
   # Re-run seed to reset data
   cd backend && npm run db:seed:messages
   ```

### Slow Tests

If tests are slow:
1. Reduce polling intervals in frontend code during tests
2. Use mock data instead of real API calls
3. Run tests in parallel (default in Playwright)

### Flaky Tests

If tests are intermittently failing:
1. Increase timeouts for API calls
2. Add explicit waits for animations
3. Use `waitForLoadState` before assertions
4. Check for race conditions in real-time updates

## Contributing

When adding new messaging features:

1. Add test data to `e2e/fixtures/messaging.ts`
2. Create test scenarios in `e2e/messaging.spec.ts`
3. Add `data-testid` attributes to new UI components
4. Update this README with new test scenarios
5. Ensure all tests pass before merging

## References

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Instagram Graph API - Webhooks](https://developers.facebook.com/docs/graph-api/webhooks)
