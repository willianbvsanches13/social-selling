# E2E Test Plan - Instagram Inbox Features

## Overview
This document outlines the end-to-end tests to verify all fixes implemented for the Instagram inbox messaging system.

## Prerequisites
- Backend changes deployed to production
- Frontend changes deployed to production
- Test Instagram account connected: `@kalyanemartinsbeauty`
- Test credentials: `kalyanemartins@unochapeco.edu.br` / `@Dmin123`
- Run backfill endpoints if testing existing data:
  ```bash
  # Enrich participant profiles
  POST /api/messaging/conversations/enrich?clientAccountId={id}

  # Backfill reply message IDs
  POST /api/messaging/messages/backfill-replies?conversationId={optional}
  ```

---

## TASK-012: Conversation List - Usernames and Profile Pictures

### Test Case ID: TC-001
**Objective**: Verify conversation list displays participant usernames and profile pictures

### Steps:
1. Navigate to https://app-socialselling.willianbvsanches.com
2. Login with test credentials
3. Navigate to Inbox section
4. Select Instagram account `@kalyanemartinsbeauty` from dropdown

### Expected Results:
✅ Each conversation shows:
- Profile picture (circular avatar)
- Username displayed (not "Loading...")
- Instagram handle displayed as "@{username}"
- Last message timestamp
- Unread count badge (if applicable)

### Actual Results:
- [ ] Profile pictures visible
- [ ] Usernames displayed correctly
- [ ] Handles formatted correctly
- [ ] No "Loading..." placeholders

### Notes:
- If conversations show "Loading...", run enrichment endpoint
- Profile pictures should be Instagram CDN URLs
- Fallback: Gray circle with message icon if no profile pic

---

## TASK-013: Conversation Header - User Display

### Test Case ID: TC-002
**Objective**: Verify conversation header shows correct participant information

### Steps:
1. From inbox, click on any conversation
2. Observe the header area above the message thread

### Expected Results:
✅ Conversation header displays:
- Profile picture (40x40 circular)
- Participant username (not "Unknown User")
- Instagram handle "@{username}" (not "@unknown")
- Three-dot menu button (visible)

### Actual Results:
- [ ] Header shows correct username
- [ ] Header shows correct handle
- [ ] Profile picture matches conversation list
- [ ] No "Unknown User" displayed

### Notes:
- This was previously showing "Unknown User" and "@unknown"
- Fix ensures backend provides `participantUsername` and `participantProfilePic`

---

## TASK-014: Message Sending Functionality

### Test Case ID: TC-003
**Objective**: Verify users can successfully send messages to Instagram conversations

### Prerequisites:
- Conversation must be within Instagram's 24-hour response window
- Last message from customer must be within 24 hours
- **IMPORTANT: Test messages can only be sent to user ID `1092310252982105`**
  - This is a test/development environment restriction
  - Ensure you select the conversation with this specific user

### Steps:
1. Select a conversation with recent customer message (< 24 hours ago)
2. Type test message: "Test message - E2E verification"
3. Click Send button (blue arrow icon)
4. Wait for response

### Expected Results:
✅ Message sending:
- Input field clears after send
- Message appears in thread on right side (blue bubble)
- Message shows "sent" timestamp
- Message shows checkmark icon
- Success toast: "Message sent successfully"
- No console errors

### Actual Results:
- [ ] Message sent successfully
- [ ] Message appears in thread
- [ ] UI feedback correct
- [ ] No errors in console
- [ ] Network tab shows 200/201 response

### Error Scenarios:

**24-Hour Window Expired:**
- Error toast: "Cannot send message: 24-hour response window has expired..."
- HTTP 400 Bad Request

**Authentication Error:**
- Error toast: "Authentication error. Please reconnect your Instagram account."
- HTTP 401/403

### Console Logs to Check:
```
📤 Attempting to send message: {conversationId, participantUsername, text}
🌐 API: Sending message request: {conversationId, endpoint, data}
🌐 API: Message sent successfully: {conversationId, messageId}
✅ Message sent successfully: {messageId, conversationId, text}
```

### Notes:
- Fix involved changing access_token from request body to query parameter
- Instagram API: `POST /me/messages?access_token=XXX`
- Body: `{"recipient":{"id":"..."},"message":{"text":"..."}}`

---

## TASK-015: Reply Messages - Quoted Context

### Test Case ID: TC-004
**Objective**: Verify reply messages display quoted original message context

### Prerequisites:
- Conversation must have reply messages
- Run backfill endpoint if testing existing data:
  ```bash
  POST /api/messaging/messages/backfill-replies?conversationId={id}
  ```

### Steps:
1. Find a conversation with reply messages
   - Look for messages in network response with `repliedToMessage` field
   - Or test by having customer reply to a message in Instagram app
2. Observe reply message display in thread

### Expected Results:
✅ Reply message shows:
- QuotedMessage component above main message content
- Left border (gray, 2px)
- Reply arrow icon (↰)
- Original sender label ("You" or "Customer")
- Truncated original message content (max 100 chars)
- Hover effect (gray-100 background)

### Visual Structure:
```
┌─────────────────────────────┐
│ ↰ You                       │
│   "Original message text... │
├─────────────────────────────┤
│ Reply message content here  │
│ 10:30 AM ✓                  │
└─────────────────────────────┘
```

### Actual Results:
- [ ] QuotedMessage component renders
- [ ] Shows correct sender ("You"/"Customer")
- [ ] Shows original message content
- [ ] UI styling correct
- [ ] No errors in console

### Backend Validation:
Check message payload in network tab:
```json
{
  "id": "...",
  "content": "Reply text",
  "repliedToMessage": {
    "id": "...",
    "content": "Original message",
    "senderType": "user",
    "sentAt": "..."
  }
}
```

### Notes:
- Webhook handler now captures `reply_to.mid` from Instagram
- Maps platform message ID to internal message ID
- Frontend displays using QuotedMessage component

---

## TASK-016: Attachments - Clickable Modal

### Test Case ID: TC-005
**Objective**: Verify message attachments are clickable and open in modal

### Prerequisites:
- Conversation must have messages with attachments (images/videos)

### Steps:
1. Find a conversation with media attachments
2. Observe attachment thumbnails in messages
3. Click on an attachment thumbnail
4. Observe modal behavior

### Expected Results:
✅ Attachment display:
- Thumbnails visible in message bubbles
- Multiple attachments show in flex layout with gap
- Thumbnails are clickable (cursor: pointer)

✅ Modal behavior:
- Modal opens on attachment click
- Displays full-size media (image/video)
- Shows navigation arrows (if multiple attachments)
- Close button visible (X icon)
- Clicking outside modal closes it
- ESC key closes modal

### Actual Results:
- [ ] Thumbnails display correctly
- [ ] Click opens modal
- [ ] Full-size media loads
- [ ] Navigation works (if multiple)
- [ ] Modal closes properly
- [ ] No console errors

### Attachment Types:
- Images (.jpg, .png, .gif)
- Videos (.mp4)
- Audio files (if supported)

### Notes:
- Uses MediaAttachment component
- Uses AttachmentModal for full-size view
- Instagram CDN URLs (lookaside.fbsbx.com)
- Signed URLs with signatures

---

## Test Execution Checklist

### Pre-Deployment
- [ ] All backend changes merged to main
- [ ] All frontend changes merged to main
- [ ] Database migrations run (if any)
- [ ] Environment variables configured

### Post-Deployment
- [ ] TC-001: Conversation list test
- [ ] TC-002: Conversation header test
- [ ] TC-003: Message sending test
- [ ] TC-004: Reply messages test
- [ ] TC-005: Attachments test

### Data Migration (if needed)
- [ ] Run participant enrichment endpoint
- [ ] Run reply backfill endpoint
- [ ] Verify data updated in database

---

## Known Issues & Limitations

### Instagram API Constraints
1. **24-Hour Response Window**
   - Can only send messages within 24 hours of customer's last message
   - Error is properly handled and shown to user

2. **Rate Limiting**
   - Instagram enforces rate limits on API calls
   - Rate limiter implemented with exponential backoff

3. **Profile Picture Access**
   - Can only fetch profile pics through conversations endpoint
   - Cannot fetch arbitrary user profiles by IGID

### Browser Compatibility
- Tested on: Chrome, Firefox, Safari, Edge
- Mobile responsive design

---

## Regression Testing

After verifying all test cases pass, perform regression testing:

### Critical Paths
1. Login flow
2. Account selection
3. Conversation loading
4. Message receiving (via webhook)
5. Message sending
6. Navigation between conversations

### Edge Cases
1. Empty conversations (no messages)
2. Long messages (text wrapping)
3. Messages with only attachments (no text)
4. Messages with special characters/emojis
5. Very long usernames
6. Missing profile pictures

---

## Test Sign-Off

**Tested By:** _________________
**Date:** _________________
**Environment:** Production / Staging
**All Tests Passed:** Yes / No

**Issues Found:**
1. _________________
2. _________________
3. _________________

**Sign-Off:** _________________
