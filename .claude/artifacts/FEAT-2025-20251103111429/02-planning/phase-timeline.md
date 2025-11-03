# Phase Timeline & Dependencies

## Visual Dependency Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Database & Domain                    │
│                         (2 hours)                                │
│  - Migration: replied_to_message_id, attachments columns        │
│  - Message Entity: Update props, validation, methods            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                PHASE 2: Repository Infrastructure                │
│                         (3 hours)                                │
│  - IMessageRepository: Add findById interface                   │
│  - MessageRepository: Implement findById + mappers              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 3: Service & API Layer                    │
│                         (3.5 hours)                              │
│  - DTOs: RepliedMessageDto, AttachmentDto                       │
│  - MessageService: Fetch replied messages logic                 │
│  - API Response: Include nested data                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 4: Frontend Types                        │
│                         (1 hour)                                 │
│  - Attachment interface                                         │
│  - RepliedMessage interface                                     │
│  - Update Message interface                                     │
└─────────────┬─────────────┴─────────────┬─────────────────────┘
              │                           │
              ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  PHASE 5: QuotedMessage  │   │ PHASE 6: MediaAttachment     │
│      (2.5 hours)         │   │      (3 hours)               │
│  - Reply visual context  │   │ - Thumbnails with lazy load  │
│  - Sender indicator      │   │ - Error handling + fallback  │
│  - Truncated content     │   │ - Aspect ratio maintenance   │
└──────────────────────────┘   └──────────────┬───────────────┘
                                              │
                                              ▼
                            ┌─────────────────────────────────────┐
                            │  PHASE 7: AttachmentModal           │
                            │      (4 hours)                      │
                            │  - Radix Dialog integration         │
                            │  - Full-size media rendering        │
                            │  - Navigation controls              │
                            │  - Keyboard support + A11y          │
                            └─────────────────┬───────────────────┘
                                              │
              ┌───────────────────────────────┴─────────┐
              │                                         │
              ▼                                         │
┌──────────────────────────────────────────────────┐    │
│        PHASE 8: MessageThread Integration        │◄───┘
│                  (3 hours)                       │
│  - Integrate all components                     │
│  - Modal state management                       │
│  - Layout & composition                         │
└───────────────────────────┬──────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│             PHASE 9: Testing & Quality Assurance                │
│                         (4 hours)                                │
│  - Unit tests (backend + frontend)                              │
│  - Integration tests (API)                                      │
│  - E2E testing                                                  │
│  - Accessibility testing                                        │
│  - Performance testing                                          │
│  - Responsive testing                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│             PHASE 10: Documentation & Refinement                │
│                         (1.5 hours)                              │
│  - JSDoc comments                                               │
│  - API documentation                                            │
│  - Code review                                                  │
│  - Final verification                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Path Analysis

### Backend Track (Sequential)
1. **P1: Database & Domain** (2h) → Foundation for all backend work
2. **P2: Repository** (3h) → Depends on P1 entity changes
3. **P3: Service & API** (3.5h) → Depends on P2 repository methods

**Backend Total**: 8.5 hours (must be sequential)

### Frontend Track (Partial Parallel)
1. **P4: Types** (1h) → Foundation for all frontend components
2. **P5 & P6** (5.5h total) → Can be parallelized (2 developers)
   - P5: QuotedMessage (2.5h)
   - P6: MediaAttachment (3h)
3. **P7: AttachmentModal** (4h) → Depends on P6 for MediaAttachment integration
4. **P8: MessageThread** (3h) → Depends on P5, P6, P7 completion

**Frontend Total**: 13.5 hours (with parallel work: ~10 hours)

### Integration & Finalization
- **P9: Testing** (4h) → Depends on P8 (all components integrated)
- **P10: Documentation** (1.5h) → Depends on P9 (verified working)

**Total**: 6 hours (must be sequential)

## Parallel Execution Opportunity

If **2 developers** are available:

### Day 1 (8 hours)
- **Dev 1**: P1 (2h) → P2 (3h) → P3 start (3h)
- **Dev 2**: Wait for P3 → P4 (1h) → P5 (2.5h)

### Day 2 (8 hours)
- **Dev 1**: P3 finish (0.5h) → P7 (4h) → P8 start (3.5h)
- **Dev 2**: P6 (3h) → Help with P8 (finish 0.5h) → P9 start (4h)

### Day 3 (8 hours)
- **Dev 1**: P9 finish (1h) → P10 (1.5h) → **Done**
- **Dev 2**: Support testing → **Done**

**Optimized Timeline**: ~2.5 days with 2 developers

### Single Developer
- **Day 1**: P1, P2, P3 (8.5h)
- **Day 2**: P4, P5, P6 (9.5h - overtime OR split to 2 days)
- **Day 3**: P7, P8 start (7h)
- **Day 4**: P8 finish, P9, P10 (6.5h)

**Sequential Timeline**: ~3.5-4 days with 1 developer

## Phase Risk Indicators

| Phase | Risk Level | Complexity | Testing Effort |
|-------|------------|------------|----------------|
| P1    | 🟢 Low     | Low        | High           |
| P2    | 🟢 Low     | Medium     | Medium         |
| P3    | 🟡 Medium  | Medium     | High           |
| P4    | 🟢 Low     | Low        | Low            |
| P5    | 🟢 Low     | Low        | Medium         |
| P6    | 🟡 Medium  | Medium     | High           |
| P7    | 🟠 High    | High       | High           |
| P8    | 🟡 Medium  | Medium     | High           |
| P9    | 🟢 Low     | Medium     | N/A            |
| P10   | 🟢 Low     | Low        | N/A            |

### High Risk Areas

**Phase 7 (AttachmentModal)** - Highest complexity
- Requires accessibility expertise
- Keyboard navigation edge cases
- Cross-browser modal behavior
- Focus management complexity
- **Mitigation**: Use Radix UI (handles most complexity)

**Phase 6 (MediaAttachment)** - Error handling critical
- Media loading failures unpredictable
- Different error states per media type
- Aspect ratio calculations
- **Mitigation**: Comprehensive error handlers, fallback UI

**Phase 3 (Service Layer)** - Business logic complexity
- Nested data fetching
- Error handling for missing replies
- Performance with many messages
- **Mitigation**: Soft fail strategy, logging, caching consideration

## Checkpoints

### Checkpoint 1: After P3 (Backend Complete)
**Deliverable**: API returns messages with nested replied message data
**Verification**:
- Postman test showing repliedToMessage in response
- Database has new columns populated
- Repository tests passing

### Checkpoint 2: After P6 (Core Components Ready)
**Deliverable**: QuotedMessage and MediaAttachment components functional
**Verification**:
- Storybook stories showing all states
- Component tests passing
- Visual regression snapshots

### Checkpoint 3: After P8 (Integration Complete)
**Deliverable**: Full feature working end-to-end
**Verification**:
- Manual E2E test successful
- All components integrated
- No console errors

### Checkpoint 4: After P9 (Quality Assured)
**Deliverable**: Feature tested and stable
**Verification**:
- All automated tests passing
- Accessibility audit green
- Performance metrics acceptable

## Rollback Plan

### If issues found in P9 (Testing)

**Backend Rollback**:
```sql
-- Rollback migration
ALTER TABLE messages
  DROP COLUMN replied_to_message_id,
  DROP COLUMN attachments;
DROP INDEX IF EXISTS idx_messages_replied_to;
```

**Frontend Rollback**:
- Remove new components
- Revert MessageThread to previous version
- Revert Message type interface

**API Rollback**:
- Feature flag to disable replied message fetching
- Return old response format

## Success Metrics

After deployment, measure:
1. **Adoption**: % of messages using reply feature
2. **Performance**: P95 API response time for messages
3. **Errors**: Media loading error rate
4. **Accessibility**: Screen reader usage success rate
5. **UX**: Modal interaction completion rate

---

**Timeline Confidence**: High (85%)
- Well-defined scope
- Existing patterns to follow
- No new dependencies
- Clear acceptance criteria
