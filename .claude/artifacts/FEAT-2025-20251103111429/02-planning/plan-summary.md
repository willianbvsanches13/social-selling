# Execution Plan Summary

**Feature ID**: FEAT-2025-20251103111429
**Plan ID**: PLAN-2025-20251103111429
**Feature**: Enhanced Message UI with Reply Context, Graceful Media Fallback, and Attachment Modal Preview

## Overview

This execution plan implements comprehensive messaging UX improvements including visual reply context, graceful media error handling, and a full-featured attachment modal viewer.

## Architecture Approach

**Pattern**: Layered Architecture with Domain-Driven Design

- **Backend**: Domain entities → Repository interfaces → Repository implementations → Services → Controllers → DTOs
- **Frontend**: Types → Components → UI composition
- **Database**: PostgreSQL with pg-promise ORM

## Key Technical Decisions

### 1. Replied Message Handling
- **Decision**: Fetch replied message on-demand during list messages operation
- **Why**: Simpler implementation, avoids recursive queries, cleaner data model
- **Tradeoff**: One additional query per message with reply (acceptable for typical usage)

### 2. Attachments Storage
- **Decision**: JSONB array in messages table
- **Why**: Flexible schema, easy to query, no need for separate table
- **Schema**: `attachments JSONB DEFAULT '[]'::jsonb`

### 3. Modal Implementation
- **Decision**: Radix UI Dialog component
- **Why**: Already installed, handles accessibility, production-ready
- **Features**: Keyboard navigation, focus trap, ARIA labels

### 4. Media Error Handling
- **Decision**: Client-side onError handlers with fallback UI
- **Why**: Fast feedback, no server round-trip needed
- **UX**: Show "Content unavailable" message with icon

### 5. Reply Depth Limitation
- **Decision**: 1 level deep (no nested replies)
- **Why**: Keeps UI simple, matches common chat patterns
- **Implementation**: Show only immediate parent message

## Implementation Phases

### Phase 1: Database Schema & Domain Entities (2h)
- Add `replied_to_message_id` column (UUID, FK to messages.id, nullable, indexed)
- Add `attachments` column (JSONB, nullable, default '[]')
- Update Message entity with new fields and validation

### Phase 2: Backend Repository & Infrastructure (3h)
- Add `findById` method to IMessageRepository
- Implement repository method with SQL query
- Update domain mappers (toDomain/toPersistence)

### Phase 3: Backend Service & API Layer (3.5h)
- Define RepliedMessageDto and AttachmentDto
- Update MessageResponseDto with new fields
- Enhance MessagingService to fetch and populate replied messages
- Add error handling for missing replied messages

### Phase 4: Frontend Types & Utilities (1h)
- Define Attachment and RepliedMessage interfaces
- Update Message interface
- Ensure type safety across components

### Phase 5: Frontend Components - QuotedMessage (2.5h)
- Create QuotedMessage component
- Visual design with reply icon and sender indicator
- Truncated content display (max 100 chars)
- Responsive styling with TailwindCSS

### Phase 6: Frontend Components - MediaAttachment (3h)
- Create MediaAttachment component with thumbnails
- Implement error handling with fallback UI
- Lazy loading and loading states
- Proper aspect ratio maintenance (150-200px)

### Phase 7: Frontend Components - AttachmentModal (4h)
- Full-screen modal using Radix Dialog
- Image and video rendering
- Navigation controls (prev/next arrows)
- Keyboard support (ESC, arrow keys)
- Accessibility (ARIA, focus trap)
- Progressive loading for large media

### Phase 8: Frontend Integration - MessageThread (3h)
- Integrate all new components
- Modal state management
- Proper component composition
- Layout adjustments for attachments
- Test various message combinations

### Phase 9: Testing & Quality Assurance (4h)
- Unit tests for backend (entity, repository, service)
- Component tests for all React components
- Integration tests for API endpoints
- E2E manual testing
- Accessibility testing (keyboard, screen reader)
- Performance testing
- Responsive testing (mobile, tablet, desktop)

### Phase 10: Documentation & Refinement (1.5h)
- JSDoc comments for all methods
- Update Swagger API documentation
- Migration documentation
- Code review for standards compliance
- Final QA verification

## Components Summary

### Backend (6 components)
1. Message Entity Extension (modify)
2. Message Repository Interface (modify)
3. Message Repository Implementation (modify)
4. Database Migration (create)
5. Message Response DTO (modify)
6. Message Service (modify)

### Frontend (5 components)
1. Message Type Extension (modify)
2. QuotedMessage Component (create)
3. MediaAttachment Component (create)
4. AttachmentModal Component (create)
5. MessageThread Enhancement (modify)

## Database Changes

### Messages Table
```sql
ALTER TABLE messages
  ADD COLUMN replied_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_messages_replied_to ON messages(replied_to_message_id);
```

### Data Structure
```json
{
  "attachments": [
    {
      "url": "https://...",
      "type": "image|video",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "size": 2048576
      }
    }
  ]
}
```

## API Changes

### GET /api/messaging/conversations/:conversationId/messages

**Before**:
```json
{
  "id": "uuid",
  "content": "Hello",
  "mediaUrl": "https://...",
  ...
}
```

**After** (non-breaking, additive):
```json
{
  "id": "uuid",
  "content": "Hello",
  "mediaUrl": "https://...",
  "repliedToMessage": {
    "id": "uuid",
    "content": "Hi there",
    "senderType": "customer",
    "mediaUrl": null,
    "sentAt": "2025-11-03T10:00:00Z"
  },
  "attachments": [
    {
      "url": "https://...",
      "type": "image",
      "metadata": {}
    }
  ],
  ...
}
```

## Acceptance Criteria (12 total)

### Functional (8)
- AC-001: QuotedMessage displays when reply exists
- AC-002: Graceful fallback for broken media
- AC-003: Thumbnails render at 150-200px
- AC-004: Click opens full-size modal
- AC-005: Modal closes with button or ESC
- AC-006: Navigation works for multiple attachments
- AC-007: API returns nested replied message data
- AC-008: Migration succeeds without data loss

### Performance (3)
- AC-009: Lazy loading for thumbnails
- AC-010: Smooth modal animations (<100ms)
- AC-012: Progressive loading for large media

### Accessibility (1)
- AC-011: Full keyboard and screen reader support

## Risk Mitigation

### Large Media Performance (Medium Risk)
- **Mitigation**: Progressive loading, blur placeholders, lazy loading
- **Future**: Consider image optimization service

### Deleted Replied Messages (Medium Risk)
- **Mitigation**: Soft fail with fallback UI "Original message unavailable"
- **Implementation**: Try-catch in service, log warning, return null

### Modal Responsiveness (Low Risk)
- **Mitigation**: Radix UI handles responsive behavior
- **Testing**: Comprehensive device testing

### Database Migration (Low Risk)
- **Mitigation**: Nullable columns, default values, test on copy first
- **Rollback**: Migration is reversible

## Timeline Estimate

**Total**: 27.5 hours (~3.5 working days)

- Backend: 8.5 hours
- Frontend: 13 hours
- Testing: 4 hours
- Documentation: 1.5 hours
- Buffer: 0.5 hours

## Dependencies

### Existing (No New Dependencies)
- @radix-ui/react-dialog (v1.0.5) ✅
- lucide-react (v0.344.0) ✅
- TailwindCSS ✅
- pg-promise ✅

### Architecture Compliance
- ✅ Follows DDD pattern
- ✅ Uses existing repository pattern
- ✅ Matches component structure
- ✅ Consistent with coding standards
- ✅ Type-safe TypeScript throughout

## Next Steps

After plan approval:
1. Begin Phase 1: Database migration and entity updates
2. Sequential execution of phases 2-10
3. Continuous testing throughout implementation
4. Final QA and documentation review

---

**Ready for Task Creation**: This plan is complete and ready for the Task Creator Agent to generate actionable implementation tasks.
