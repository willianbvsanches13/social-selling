# Remaining Tasks Checklist - FEAT-2025-20251103191624

## Feature: Complete User Settings & Data Deletion System

**Progress**: 6/32 tasks complete (18.75%)

---

## Phase P4: Complete UserService Deletion Logic (4 hours)

**Status**: PENDING
**Priority**: CRITICAL
**Dependencies**: P2 (COMPLETE)

- [ ] **TASK-007**: Map all tables requiring cascade deletion
  - **Estimated**: 0.5 hours
  - **Description**: Document all tables with user_id foreign key
  - **Deliverable**: Comprehensive table mapping document

- [ ] **TASK-008**: Implement cascade deletion in UserService
  - **Estimated**: 2.5 hours
  - **Description**: Enhance deleteAccount method with complete deletion logic
  - **Deliverable**: Updated `user.service.ts` with cascade deletion

- [ ] **TASK-009**: Create integration tests for deletion
  - **Estimated**: 1 hour
  - **Description**: Test complete deletion flow with test database
  - **Deliverable**: Integration tests in `/test/integration/modules/user/`

**Acceptance Criteria**:
- [ ] All user-related data deleted across all modules
- [ ] Deletion is atomic (all or nothing via transactions)
- [ ] Instagram access tokens revoked via API
- [ ] All sessions invalidated in Redis
- [ ] Deletion request tracked with audit trail
- [ ] Integration tests verify complete deletion

---

## Phase P5: Meta Callback Module (Backend) (4 hours)

**Status**: PENDING
**Priority**: CRITICAL
**Dependencies**: P2, P3, P4

- [ ] **TASK-010**: Create MetaCallbackModule and register in AppModule
  - **Estimated**: 0.5 hours
  - **Description**: Create NestJS module and import in AppModule
  - **Deliverable**: `meta-callback.module.ts`

- [ ] **TASK-011**: Create DTOs for Meta callbacks
  - **Estimated**: 0.5 hours
  - **Description**: DTOs with validation for signed_request field
  - **Deliverable**: `data-deletion-request.dto.ts`, `data-deletion-status.dto.ts`

- [ ] **TASK-012**: Implement MetaCallbackController
  - **Estimated**: 1 hour
  - **Description**: Controller with POST /meta/data-deletion-callback and GET /meta/data-deletion-status/:confirmationCode
  - **Deliverable**: `meta-callback.controller.ts`

- [ ] **TASK-013**: Implement MetaCallbackService
  - **Estimated**: 1.5 hours
  - **Description**: Service with signature validation, deletion coordination, status tracking
  - **Deliverable**: `meta-callback.service.ts`

- [ ] **TASK-014**: Create unit tests for MetaCallbackService
  - **Estimated**: 0.5 hours
  - **Description**: Test signature validation, idempotency, status tracking
  - **Deliverable**: Unit tests in `/test/unit/modules/meta/`

**Acceptance Criteria**:
- [ ] POST /meta/data-deletion-callback validates signed requests
- [ ] Invalid signatures rejected with 401 Unauthorized
- [ ] Valid deletion requests trigger UserService.deleteAccount
- [ ] Duplicate requests handled idempotently
- [ ] GET /meta/data-deletion-status returns correct status
- [ ] All unit tests pass

---

## Phase P6: Backend Integration Tests & API Documentation (2 hours)

**Status**: PENDING
**Priority**: HIGH
**Dependencies**: P5

- [ ] **TASK-015**: Create integration tests for Meta callbacks
  - **Estimated**: 1.5 hours
  - **Description**: Test endpoints with valid/invalid signatures, duplicate requests
  - **Deliverable**: Integration tests in `/test/integration/modules/meta/`

- [ ] **TASK-016**: Verify OpenAPI documentation completeness
  - **Estimated**: 0.5 hours
  - **Description**: Ensure all endpoints have proper @ApiOperation, @ApiResponse
  - **Deliverable**: Updated Swagger documentation

**Acceptance Criteria**:
- [ ] Integration tests cover main and alternate flows
- [ ] Tests verify signature validation and idempotency
- [ ] All tests pass with test database
- [ ] OpenAPI docs complete and accurate

---

## Phase P7: Frontend User Service & API Integration (2 hours)

**Status**: PENDING
**Priority**: HIGH
**Dependencies**: None (can start after P4)

- [ ] **TASK-017**: Create frontend user service
  - **Estimated**: 1 hour
  - **Description**: Service with methods: getProfile, updateProfile, changePassword, deleteAccount, exportData
  - **Deliverable**: `frontend/src/lib/services/user.service.ts`

- [ ] **TASK-018**: Update API endpoints configuration
  - **Estimated**: 0.5 hours
  - **Description**: Add USER_PROFILE, USER_UPDATE_PROFILE, USER_CHANGE_PASSWORD, USER_DELETE, USER_EXPORT_DATA
  - **Deliverable**: Updated `frontend/src/lib/api/endpoints.ts`

- [ ] **TASK-019**: Add error handling and toast notifications
  - **Estimated**: 0.5 hours
  - **Description**: Implement error handling with user-friendly messages
  - **Deliverable**: Toast integration in user service

**Acceptance Criteria**:
- [ ] User service can call all backend endpoints
- [ ] JWT tokens properly included in requests
- [ ] Errors handled gracefully with user-friendly messages
- [ ] Toast notifications show success/error feedback

---

## Phase P8: Settings Page Components (Frontend) (6 hours)

**Status**: PENDING
**Priority**: HIGH
**Dependencies**: P7

- [ ] **TASK-020**: Create main Settings page layout
  - **Estimated**: 1 hour
  - **Description**: Settings page at /settings with 5 sections layout
  - **Deliverable**: `frontend/src/app/(dashboard)/settings/page.tsx`

- [ ] **TASK-021**: Create ProfileSettings component
  - **Estimated**: 1.5 hours
  - **Description**: Form for name, timezone, language with validation
  - **Deliverable**: `frontend/src/components/settings/ProfileSettings.tsx`

- [ ] **TASK-022**: Create PasswordSettings component
  - **Estimated**: 1.5 hours
  - **Description**: Password change form with strength indicator and confirmation
  - **Deliverable**: `frontend/src/components/settings/PasswordSettings.tsx`

- [ ] **TASK-023**: Create PrivacySettings component
  - **Estimated**: 0.5 hours
  - **Description**: Links to Privacy Policy, Data Deletion instructions, optional Export Data
  - **Deliverable**: `frontend/src/components/settings/PrivacySettings.tsx`

- [ ] **TASK-024**: Create DangerZone component with deletion modal
  - **Estimated**: 1.5 hours
  - **Description**: Deletion button with modal, checklist, text confirmation
  - **Deliverable**: `frontend/src/components/settings/DangerZone.tsx`

**Acceptance Criteria**:
- [ ] Settings page renders at /settings with all 5 sections
- [ ] Profile update form successfully updates user data
- [ ] Password change form validates and updates password
- [ ] Deletion modal shows checklist and text confirmation
- [ ] Account deletion triggers backend API and logs out user
- [ ] All forms show loading states during API calls
- [ ] Toast notifications show success/error feedback
- [ ] Page is responsive on mobile and desktop

---

## Phase P9: Update Compliance Pages (Frontend) (1.5 hours)

**Status**: PENDING
**Priority**: MEDIUM
**Dependencies**: P8 (can be done in parallel)

- [ ] **TASK-025**: Update Privacy Policy page
  - **Estimated**: 0.75 hours
  - **Description**: Update to reflect data collection, Instagram handling, user rights
  - **Deliverable**: Updated `frontend/src/app/privacy-policy/page.tsx`

- [ ] **TASK-026**: Update Data Deletion page
  - **Estimated**: 0.75 hours
  - **Description**: Provide clear instructions for deletion via app and Meta
  - **Deliverable**: Updated `frontend/src/app/data-deletion/page.tsx`

**Acceptance Criteria**:
- [ ] Privacy Policy accurately reflects implemented functionality
- [ ] Data Deletion page provides clear, actionable instructions
- [ ] All compliance requirements addressed (GDPR, CCPA, LGPD, Meta)
- [ ] Pages are accessible and mobile-responsive

---

## Phase P10: End-to-End Testing & QA (3 hours)

**Status**: PENDING
**Priority**: HIGH
**Dependencies**: P6, P9

- [ ] **TASK-027**: Create E2E tests for settings page
  - **Estimated**: 1.5 hours
  - **Description**: Playwright tests for navigation, profile update, password change, deletion
  - **Deliverable**: `/test/e2e/settings.spec.ts`

- [ ] **TASK-028**: Create E2E tests for Meta callback integration
  - **Estimated**: 1 hour
  - **Description**: Simulate Meta webhook with valid signature, verify status endpoint
  - **Deliverable**: `/test/e2e/meta-callback.spec.ts`

- [ ] **TASK-029**: Manual QA testing
  - **Estimated**: 0.5 hours
  - **Description**: Manual testing on mobile/desktop, verify data deletion in database
  - **Deliverable**: QA report with any bugs found

**Acceptance Criteria**:
- [ ] All E2E tests pass consistently
- [ ] Manual QA confirms complete deletion
- [ ] No critical bugs found
- [ ] Performance is acceptable (<30s for deletion)
- [ ] Mobile and desktop UX is smooth

---

## Phase P11: Documentation & Deployment Preparation (2 hours)

**Status**: PENDING
**Priority**: MEDIUM
**Dependencies**: P10 (can be done in parallel)

- [ ] **TASK-030**: Create technical documentation
  - **Estimated**: 1 hour
  - **Description**: Architecture overview, API specs, schema changes, troubleshooting
  - **Deliverable**: `/docs/features/user-settings-deletion.md`

- [ ] **TASK-031**: Create deployment checklist
  - **Estimated**: 0.5 hours
  - **Description**: Deployment steps, migration, Meta configuration, monitoring
  - **Deliverable**: `/docs/deployment/feat-user-deletion.md`

- [ ] **TASK-032**: Create Meta App Dashboard configuration guide
  - **Estimated**: 0.5 hours
  - **Description**: Step-by-step guide with screenshots for Meta configuration
  - **Deliverable**: Meta configuration guide

**Acceptance Criteria**:
- [ ] Technical documentation is complete and accurate
- [ ] Deployment checklist covers all steps
- [ ] Meta configuration guide is clear with screenshots
- [ ] Documentation is reviewed by team

---

## Progress Summary

### Completed Phases: 3/11 (27.3%)
- [x] **P1**: Database Schema & Domain Entities (3 tasks)
- [x] **P2**: Repository & Infrastructure Layer (2 tasks)
- [x] **P3**: Meta Signed Request Validation Utility (1 task)

### Remaining Phases: 8/11 (72.7%)
- [ ] **P4**: Complete UserService Deletion Logic (3 tasks)
- [ ] **P5**: Meta Callback Module (5 tasks)
- [ ] **P6**: Backend Integration Tests (2 tasks)
- [ ] **P7**: Frontend User Service (3 tasks)
- [ ] **P8**: Settings Page Components (5 tasks)
- [ ] **P9**: Update Compliance Pages (2 tasks)
- [ ] **P10**: End-to-End Testing & QA (3 tasks)
- [ ] **P11**: Documentation & Deployment (3 tasks)

### Task Progress: 6/32 (18.75%)
- **Completed**: 6 tasks
- **Remaining**: 26 tasks
- **Estimated Remaining Time**: 24.5 hours (3-4 days)

### Critical Path
1. [ ] P4 - UserService deletion logic (MUST complete next)
2. [ ] P5 - Meta callback module (CRITICAL)
3. [ ] P8 - Settings page UI (CRITICAL)
4. [ ] P10 - E2E tests (CRITICAL)

---

## Estimated Timeline

**Week 1 (Current)**:
- [x] P1, P2, P3 Complete (6 tasks) - DONE

**Week 2 (Next)**:
- [ ] P4 Complete (3 tasks) - 4 hours
- [ ] P5 Complete (5 tasks) - 4 hours
- [ ] P6 Complete (2 tasks) - 2 hours
- **Milestone**: Backend 100% complete

**Week 3**:
- [ ] P7 Complete (3 tasks) - 2 hours
- [ ] P8 Complete (5 tasks) - 6 hours
- [ ] P9 Complete (2 tasks) - 1.5 hours
- **Milestone**: Frontend 100% complete

**Week 4**:
- [ ] P10 Complete (3 tasks) - 3 hours
- [ ] P11 Complete (3 tasks) - 2 hours
- **Milestone**: Feature 100% complete, ready for production

---

**Last Updated**: 2025-11-03T21:35:00Z
**Next Task**: TASK-007 (Map all tables requiring cascade deletion)
