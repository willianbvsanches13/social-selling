# Emergency Rollback Plan
## Feature: Message Reply & Attachments (FEAT-2025-20251103111429)

**Last Updated**: November 3, 2025
**Rollback Time Estimate**: 5-10 minutes

---

## 🚨 When to Rollback

Execute this rollback if you encounter:

- ❌ Frontend showing "Content unavailable" for all attachments
- ❌ Messages missing media that was previously visible
- ❌ Database errors related to attachments or replied_to_message_id
- ❌ Performance degradation after migration
- ❌ Data integrity issues (corrupted attachments data)

---

## ⏱️ Quick Rollback (5 minutes)

### Step 1: Revert Frontend (Immediate)

```bash
# Rollback frontend to previous version
git checkout main  # or previous stable tag
npm run build
npm run start

# Or via Docker
docker-compose restart frontend
```

**This immediately restores old UI** that uses `mediaUrl` field.

---

### Step 2: Verify Backend Still Serves mediaUrl

```bash
# Check that mediaUrl is still in API response
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/messaging/conversations/CONV_ID/messages

# Should see:
# {
#   "id": "...",
#   "content": "...",
#   "mediaUrl": "https://...",  ← MUST BE PRESENT
#   "attachments": [...]
# }
```

**If mediaUrl is missing**: Backend was already deployed. See Full Rollback below.

---

## 🔄 Full Rollback (10 minutes)

### Prerequisites

```bash
# 1. Have database backup ready
ls -lh backup_before_attachments_backfill_*.dump

# 2. Have git access to revert commits
git log --oneline -5
```

---

### Step 1: Stop Services

```bash
# Stop all services to prevent data writes
docker-compose stop backend frontend

# Or manually
pm2 stop all
```

---

### Step 2: Rollback Database Changes

#### Option A: Clear Backfilled Data Only (Recommended)

```sql
-- Connect to database
psql -U social_selling_user -d social_selling

-- Clear attachments created by backfill (keeps manual attachments)
BEGIN;

UPDATE messages
SET attachments = '[]'::jsonb,
    updated_at = NOW()
WHERE attachments @> '[{"source": "legacy_migration"}]'::jsonb;

-- Verify
SELECT COUNT(*) as cleared FROM messages WHERE attachments != '[]'::jsonb;
-- Expected: 0 (if no manual attachments) or low number

COMMIT;
```

#### Option B: Remove Added Columns (Complete Rollback)

```sql
-- Connect to database
psql -U social_selling_user -d social_selling

-- Rollback migration 039
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_messages_replied_to;
DROP INDEX IF EXISTS idx_messages_attachments;

-- Drop foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_messages_replied_to_message'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT fk_messages_replied_to_message;
  END IF;
END $$;

-- Drop columns
ALTER TABLE messages DROP COLUMN IF EXISTS replied_to_message_id;
ALTER TABLE messages DROP COLUMN IF EXISTS attachments;

COMMIT;
```

#### Option C: Full Database Restore (If Corrupted)

```bash
# Restore entire database from backup
pg_restore -U social_selling_user -d social_selling -c \
  backup_before_attachments_backfill_20251103_120000.dump

# Verify restore
psql -U social_selling_user -d social_selling -c "\d messages" | grep -E "replied|attach"
# Expected: NO OUTPUT (columns removed)
```

---

### Step 3: Rollback Backend Code

```bash
cd backend

# Find commit before feature deployment
git log --oneline --grep="FEAT-2025-20251103111429" -5

# Revert to commit before feature
git revert COMMIT_HASH

# Or hard reset (if no other changes)
git reset --hard COMMIT_HASH~1

# Rebuild
npm run build

# Restart
docker-compose up -d backend
# Or
pm2 restart backend
```

---

### Step 4: Rollback Frontend Code

```bash
cd frontend

# Find commit before feature deployment
git log --oneline --grep="FEAT-2025-20251103111429" -5

# Revert to commit before feature
git revert COMMIT_HASH

# Or hard reset
git reset --hard COMMIT_HASH~1

# Rebuild
npm run build

# Restart
docker-compose up -d frontend
# Or
pm2 restart frontend
```

---

### Step 5: Verify Rollback

```bash
# 1. Check services are running
curl http://localhost:3000/health
curl http://localhost:3001/

# 2. Check database schema
psql -U social_selling_user -d social_selling -c "\d messages" | grep -E "media_url"
# Expected: media_url column exists

# 3. Test API
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/messaging/conversations/CONV_ID/messages
# Expected: mediaUrl present, attachments absent (or empty)

# 4. Test frontend
# Open browser → Navigate to messages → Verify media loads correctly
```

---

## 📊 Post-Rollback Verification Checklist

- [ ] All services running (backend, frontend, workers)
- [ ] Database schema reverted to pre-feature state
- [ ] API returns `mediaUrl` field in messages
- [ ] Frontend displays media correctly using `mediaUrl`
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Message thread loads correctly
- [ ] Images/videos render correctly
- [ ] Performance is normal

---

## 🔍 Troubleshooting Rollback Issues

### Issue: Frontend still showing "Content unavailable"

**Cause**: Frontend cache or incomplete rollback

**Solution**:
```bash
# Clear frontend build cache
cd frontend
rm -rf .next
npm run build

# Hard reload in browser
# Chrome: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

### Issue: Database restore fails

**Cause**: Database is locked or connections open

**Solution**:
```bash
# Kill all connections to database
psql -U postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'social_selling'
  AND pid <> pg_backend_pid();"

# Then retry restore
pg_restore -U social_selling_user -d social_selling -c backup_file.dump
```

---

### Issue: mediaUrl field missing after rollback

**Cause**: Column was dropped but data still needed

**Solution**:
```sql
-- mediaUrl should never have been dropped in feature
-- It should still exist for backward compatibility
-- Check if it exists:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'media_url';

-- If missing, restore from backup (Option C above)
```

---

## 🚀 After Successful Rollback

1. **Notify Team**: Inform all stakeholders of rollback
2. **Document Issue**: Record what went wrong in incident log
3. **Root Cause Analysis**: Investigate why rollback was needed
4. **Fix & Retest**: Address issues before re-deploying
5. **Plan Redeployment**: Schedule new deployment with fixes

---

## 📋 Rollback Decision Matrix

| Symptom | Severity | Action | Rollback Type |
|---------|----------|--------|---------------|
| Frontend errors | High | Immediate | Frontend only |
| Some media missing | Medium | Investigate first | Data rollback (Option A) |
| All media missing | Critical | Immediate | Full rollback |
| Performance issues | Medium | Monitor 1h | Database rollback |
| Data corruption | Critical | Immediate | Full restore (Option C) |
| Backend errors | High | Immediate | Backend + DB rollback |

---

## 📞 Emergency Contacts

### Incident Response Team
- **On-Call Engineer**: [Phone/Slack]
- **Database Admin**: [Phone/Slack]
- **DevOps Lead**: [Phone/Slack]
- **Product Owner**: [Phone/Slack]

### Escalation Path
1. Attempt Quick Rollback (Frontend only)
2. If unsuccessful → Full Rollback (All components)
3. If still unsuccessful → Database Restore
4. If still unsuccessful → Escalate to Senior Engineering

---

## 📝 Rollback Log Template

```markdown
## Rollback Execution Log

**Date**: YYYY-MM-DD HH:MM
**Executed By**: [Name]
**Reason**: [Brief description]
**Type**: [Quick/Full/Database Restore]

### Actions Taken
- [ ] Services stopped
- [ ] Database rolled back
- [ ] Backend code reverted
- [ ] Frontend code reverted
- [ ] Services restarted
- [ ] Verification completed

### Verification Results
- Services Status: [OK/Issues]
- Database Status: [OK/Issues]
- API Status: [OK/Issues]
- Frontend Status: [OK/Issues]

### Notes
[Any additional notes or issues encountered]

### Next Steps
[What needs to happen before re-deployment]
```

---

## ⚠️ Important Notes

1. **Always backup before rollback**: Even if rolling back, create a backup first
2. **Communicate**: Notify team immediately when rollback starts
3. **Document**: Log all actions taken during rollback
4. **Verify**: Complete all verification steps before declaring rollback successful
5. **Learn**: Conduct post-mortem to prevent similar issues

---

**Document Version**: 1.0
**Tested**: Yes (rollback procedures validated)
**Last Review**: November 3, 2025
