# Quick Reference Guide

**Feature**: Enhanced Message UI with Reply Context, Graceful Media Fallback, and Attachment Modal Preview
**FEAT-ID**: FEAT-2025-20251103111429

## 📋 At a Glance

| Metric | Value |
|--------|-------|
| **Total Hours** | 27.5 hours |
| **Phases** | 10 sequential phases |
| **Components** | 11 (6 backend, 5 frontend) |
| **Acceptance Criteria** | 12 testable criteria |
| **Risk Level** | Low-Medium |
| **Timeline** | 3.5-4 days (single dev) |
| **New Dependencies** | 0 (all existing) |

## 🎯 What We're Building

### Three Main Features

1. **Reply Context Display**
   - Show quoted message when replying
   - Visual indicator with sender and content
   - Limit to 1 level deep

2. **Graceful Media Fallback**
   - Replace browser errors with friendly UI
   - "Content unavailable" message
   - Maintain layout integrity

3. **Attachment Modal Viewer**
   - Thumbnails in thread (150-200px)
   - Click to expand full-size
   - Navigation between multiple attachments
   - Keyboard support + accessibility

## 🏗️ Architecture Quick Facts

### Backend Pattern
```
Domain Entity → Repository Interface → Repository (pg-promise) → Service → Controller → DTO
```

### Frontend Pattern
```
Types → Components → UI Composition
```

### Database Changes
```sql
-- Add to messages table
ALTER TABLE messages
  ADD COLUMN replied_to_message_id UUID REFERENCES messages(id),
  ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
```

### Key Files to Modify

**Backend (6 files)**:
1. `/backend/src/domain/entities/message.entity.ts`
2. `/backend/src/domain/repositories/message.repository.interface.ts`
3. `/backend/src/infrastructure/database/repositories/message.repository.ts`
4. `/backend/src/infrastructure/database/migrations/YYYYMMDDHHMMSS-add-message-reply-and-attachments.sql`
5. `/backend/src/modules/messaging/dto/message-response.dto.ts`
6. `/backend/src/modules/messaging/services/message.service.ts`

**Frontend (5 files - 3 new)**:
1. `/frontend/src/types/message.ts`
2. `/frontend/src/components/messages/QuotedMessage.tsx` ⭐ NEW
3. `/frontend/src/components/messages/MediaAttachment.tsx` ⭐ NEW
4. `/frontend/src/components/messages/AttachmentModal.tsx` ⭐ NEW
5. `/frontend/src/components/messages/MessageThread.tsx`

## 📦 New Data Structures

### Backend DTO
```typescript
interface RepliedMessageDto {
  id: string;
  content?: string;
  senderType: SenderType;
  mediaUrl?: string;
  sentAt: Date;
}

interface AttachmentDto {
  url: string;
  type: 'image' | 'video';
  metadata: {
    width?: number;
    height?: number;
    size?: number;
  };
}

interface MessageResponseDto {
  // ... existing fields
  repliedToMessage?: RepliedMessageDto;  // NEW
  attachments?: AttachmentDto[];         // NEW
}
```

### Frontend Types
```typescript
interface Attachment {
  url: string;
  type: 'image' | 'video';
  metadata: Record<string, any>;
}

interface RepliedMessage {
  id: string;
  content?: string;
  senderType: SenderType;
  mediaUrl?: string;
  sentAt: string;
}

interface Message {
  // ... existing fields
  repliedToMessage?: RepliedMessage;  // NEW
  attachments?: Attachment[];         // NEW
}
```

## ⚡ Phase Execution Order

```
P1 (2h)   → Database + Entity
P2 (3h)   → Repository
P3 (3.5h) → Service + API
P4 (1h)   → Frontend Types
P5 (2.5h) → QuotedMessage Component
P6 (3h)   → MediaAttachment Component
P7 (4h)   → AttachmentModal Component
P8 (3h)   → MessageThread Integration
P9 (4h)   → Testing
P10 (1.5h) → Documentation
```

## 🔑 Critical Success Factors

### Must Have
- ✅ Database migration reversible
- ✅ Backward compatible API (additive only)
- ✅ Error handling for missing replies
- ✅ Graceful media fallback (no broken UI)
- ✅ Keyboard accessible modal
- ✅ Mobile responsive

### Performance Targets
- ⏱️ API response time: <200ms (including replied message fetch)
- ⏱️ Modal animation: <100ms
- ⏱️ Thumbnail lazy loading: enabled
- ⏱️ Large image loading: progressive

### Accessibility Requirements
- ♿ Keyboard navigation (ESC, arrows)
- ♿ ARIA labels on modal
- ♿ Focus trap in modal
- ♿ Screen reader friendly

## 🧪 Testing Checklist

### Unit Tests
- [ ] Message entity with new fields
- [ ] Repository findById method
- [ ] Service replied message logic
- [ ] QuotedMessage component
- [ ] MediaAttachment component
- [ ] AttachmentModal component

### Integration Tests
- [ ] API returns nested replied message
- [ ] Database migration succeeds
- [ ] MessageThread renders all components

### E2E Tests
- [ ] View message with reply
- [ ] Click thumbnail opens modal
- [ ] Navigate between attachments
- [ ] Close modal with ESC
- [ ] Broken media shows fallback

### Manual Tests
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on iOS mobile
- [ ] Test on Android mobile
- [ ] Test with keyboard only
- [ ] Test with screen reader

## 🚨 Common Pitfalls to Avoid

1. **Don't**: Fetch all replied messages recursively
   - **Do**: Limit to 1 level, fetch on-demand

2. **Don't**: Throw error if replied message deleted
   - **Do**: Soft fail, show "unavailable" message

3. **Don't**: Block render on media load errors
   - **Do**: Use onError handler with fallback

4. **Don't**: Build custom modal from scratch
   - **Do**: Use Radix Dialog for accessibility

5. **Don't**: Store attachments in separate table
   - **Do**: Use JSONB array for flexibility

6. **Don't**: Make API breaking changes
   - **Do**: Add new fields as optional/nullable

## 📊 Monitoring After Deployment

Track these metrics:
- Reply feature usage rate
- Media load error rate
- Modal interaction completion
- API response time P95
- Database query performance

## 🔧 Useful Commands

### Run migration
```bash
cd backend
npm run migration:run
```

### Run tests
```bash
# Backend
cd backend
npm run test
npm run test:e2e

# Frontend
cd frontend
npm run test
npm run test:coverage
```

### Start dev servers
```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm run dev
```

## 📚 Reference Documents

- **Full Plan**: `execution-plan.json` (526 lines)
- **Summary**: `plan-summary.md` (268 lines)
- **Timeline**: `phase-timeline.md` (246 lines)
- **Analysis**: `../01-analysis/feature-analysis.json`

## 🆘 Need Help?

### Architecture Questions
- Check existing `conversation.entity.ts` for domain pattern
- Check existing `conversation.repository.ts` for repository pattern
- Check existing `MessageThread.tsx` for component pattern

### Code Standards
- See `.claude/rules/code-standards.md`
- See `.claude/rules/react.md`
- See `.claude/rules/tests.md`

### Technical Decisions
- All decisions documented in `execution-plan.json` → `technicalDecisions`
- Rationale and tradeoffs included

---

**Ready to Start?** Begin with Phase 1: Database Schema & Domain Entities
