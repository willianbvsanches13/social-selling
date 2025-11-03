# Backfill Deployment Guide
## Feature: Message Attachments Migration (mediaUrl → attachments)

**Feature ID**: FEAT-2025-20251103111429
**Migration**: 040-backfill-attachments-from-mediaurl.sql
**Created**: November 3, 2025

---

## ⚠️ CRITICAL: Deploy Order

**THIS BACKFILL MUST BE EXECUTED BEFORE DEPLOYING THE FRONTEND!**

```
Correct Order:
1. ✅ Deploy backend code (includes new attachments field support)
2. ✅ Run migration 039 (add columns)
3. ✅ Run backfill (migrate data) ← YOU ARE HERE
4. ✅ Deploy frontend code (uses attachments field)
5. ✅ Verify & monitor

Wrong Order (WILL CAUSE DATA LOSS):
❌ Deploy frontend first → Old mediaUrl data disappears
```

---

## 📋 Pre-Deployment Checklist

### 1. Backup Database
```bash
# Create backup before any migration
pg_dump -U social_selling_user -d social_selling -F c -f backup_before_attachments_backfill_$(date +%Y%m%d_%H%M%S).dump

# Verify backup was created
ls -lh backup_before_attachments_backfill_*.dump
```

### 2. Verify Migration 039 is Applied
```bash
# Check if migration 039 columns exist
psql -U social_selling_user -d social_selling -c "\d messages" | grep -E "replied_to_message_id|attachments"

# Expected output:
# replied_to_message_id | uuid
# attachments            | jsonb
```

### 3. Check Current State
```bash
# Count messages with media_url
psql -U social_selling_user -d social_selling -c "
SELECT
  COUNT(*) FILTER (WHERE media_url IS NOT NULL AND media_url != '') as with_media,
  COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb) as with_attachments,
  COUNT(*) as total
FROM messages;"
```

---

## 🚀 Execution Options

### Option A: Using SQL Migration File (Recommended for Production)

**Advantages**:
- ✅ Fast (single transaction)
- ✅ Atomic operation
- ✅ Includes verification
- ✅ Auto-rollback on error

```bash
# 1. Review the migration first
cat backend/migrations/040-backfill-attachments-from-mediaurl.sql

# 2. Execute migration
psql -U social_selling_user -d social_selling -f backend/migrations/040-backfill-attachments-from-mediaurl.sql

# 3. Check output for success messages
# Expected: "Migration completed successfully!"
# Expected: "Migration verification PASSED"
```

**Expected Output**:
```
========================================
Starting attachments backfill migration
========================================
NOTICE:  Total messages in database: 15234
NOTICE:  Messages with media_url: 8421
NOTICE:  Already migrated: 0
NOTICE:  Messages to migrate: 8421
NOTICE:  ----------------------------------------
NOTICE:  Starting migration of 8421 messages...
NOTICE:  ----------------------------------------
NOTICE:  Migration completed successfully!
NOTICE:  Messages migrated: 8421
NOTICE:  Duration: 00:00:02.145
NOTICE:  Average: 0.25 ms per message
NOTICE:  ========================================
NOTICE:  Post-migration verification:
NOTICE:    Messages with media_url: 8421
NOTICE:    Now with attachments: 8421
NOTICE:    Coverage: 100%
NOTICE:  ✓ Migration verification PASSED - 100% coverage
NOTICE:  ========================================
```

---

### Option B: Using TypeScript Script (Recommended for Dry Run)

**Advantages**:
- ✅ Dry-run mode available
- ✅ Progress tracking
- ✅ Detailed statistics
- ✅ Batch processing

#### Step 1: Dry Run (Preview Only)
```bash
# Preview what will be migrated (NO CHANGES)
npm run backfill:attachments -- --dry-run

# Or via Docker
docker exec social-selling-backend npm run backfill:attachments -- --dry-run
```

#### Step 2: Execute Migration
```bash
# Local execution
npm run backfill:attachments

# Via Docker (recommended)
docker exec social-selling-backend npm run backfill:attachments

# Production environment
npm run backfill:attachments:prod
```

#### Step 3: Verify Results
```bash
# Check migration coverage
psql -U social_selling_user -d social_selling -c "
SELECT
  COUNT(*) FILTER (WHERE media_url IS NOT NULL AND media_url != '') as with_media,
  COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb) as with_attachments,
  ROUND(
    COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE media_url IS NOT NULL AND media_url != ''), 0) * 100,
    2
  ) as coverage_percent
FROM messages;"
```

**Expected Output**:
```
 with_media | with_attachments | coverage_percent
------------+------------------+------------------
       8421 |             8421 |           100.00
```

---

## 🔍 Verification Steps

### 1. Check Migration Completed Successfully
```sql
-- Verify 100% coverage
SELECT
  COUNT(*) as total_with_media,
  COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb) as migrated,
  ROUND(
    COUNT(*) FILTER (WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as percent_migrated
FROM messages
WHERE media_url IS NOT NULL AND media_url != '';

-- Expected: 100.00% migrated
```

### 2. Spot Check Sample Data
```sql
-- Check a few random messages
SELECT
  id,
  media_url,
  attachments
FROM messages
WHERE media_url IS NOT NULL
  AND media_url != ''
LIMIT 5;
```

**Expected Result**:
```
id                                   | media_url                          | attachments
-------------------------------------+------------------------------------+-------------
abc-123...                           | https://example.com/image.jpg      | [{"url": "https://example.com/image.jpg", "type": "image", ...}]
def-456...                           | https://example.com/video.mp4      | [{"url": "https://example.com/video.mp4", "type": "video", ...}]
```

### 3. Check Attachment Types Distribution
```sql
-- See distribution of attachment types
SELECT
  att->>'type' as attachment_type,
  COUNT(*) as count
FROM messages,
     jsonb_array_elements(attachments) as att
WHERE attachments IS NOT NULL
  AND attachments != '[]'::jsonb
GROUP BY att->>'type'
ORDER BY count DESC;
```

**Expected Output**:
```
 attachment_type | count
-----------------+-------
 image           |  7234
 video           |  1187
```

---

## 🔄 Rollback Plan

### Scenario 1: Migration Failed Mid-Execution

If the migration fails, it will auto-rollback (it's transactional).

```bash
# Check if any messages were partially migrated
psql -U social_selling_user -d social_selling -c "
SELECT COUNT(*)
FROM messages
WHERE attachments @> '[{\"source\": \"legacy_migration\"}]'::jsonb;"
```

### Scenario 2: Need to Undo Migration

```sql
-- Clear attachments that were created by backfill
UPDATE messages
SET attachments = '[]'::jsonb,
    updated_at = NOW()
WHERE attachments @> '[{"source": "legacy_migration"}]'::jsonb;

-- Verify rollback
SELECT COUNT(*) FROM messages WHERE attachments != '[]'::jsonb;
-- Expected: 0 (if no manual attachments were added)
```

### Scenario 3: Complete Database Restore

```bash
# Restore from backup created in pre-deployment checklist
pg_restore -U social_selling_user -d social_selling -c backup_before_attachments_backfill_YYYYMMDD_HHMMSS.dump
```

---

## ⏱️ Expected Execution Time

| Messages | Expected Time | Notes |
|----------|---------------|-------|
| 1,000 | ~0.3 seconds | Very fast |
| 10,000 | ~2-3 seconds | Fast |
| 100,000 | ~20-30 seconds | Moderate |
| 1,000,000 | ~3-5 minutes | May want to use batch mode |

**Calculation**: ~0.25ms per message average

---

## 🚨 Troubleshooting

### Issue: Migration says "Already migrated"

**Cause**: Migration already ran or was partially run.

**Solution**:
```bash
# Check current state
npm run backfill:attachments -- --dry-run

# If you need to re-migrate (overwrites existing):
npm run backfill:attachments -- --force
```

### Issue: Some messages not migrated

**Cause**: Messages might have invalid `media_url` or special characters.

**Solution**:
```sql
-- Find messages that weren't migrated
SELECT id, media_url, attachments
FROM messages
WHERE media_url IS NOT NULL
  AND media_url != ''
  AND (attachments IS NULL OR attachments = '[]'::jsonb)
LIMIT 10;

-- Manually fix if needed
```

### Issue: "Permission denied" error

**Cause**: Database user doesn't have UPDATE permission.

**Solution**:
```sql
-- Grant necessary permissions
GRANT UPDATE ON messages TO social_selling_user;
```

---

## 📊 Post-Deployment Monitoring

### Metrics to Watch

```sql
-- 1. Check coverage every hour for first 24h
SELECT
  NOW() as check_time,
  COUNT(*) FILTER (WHERE media_url IS NOT NULL) as with_media,
  COUNT(*) FILTER (WHERE attachments != '[]'::jsonb) as with_attachments,
  ROUND(
    COUNT(*) FILTER (WHERE attachments != '[]'::jsonb)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE media_url IS NOT NULL), 0) * 100,
    2
  ) as coverage
FROM messages;

-- 2. Monitor new messages created after migration
SELECT
  COUNT(*) as new_messages,
  COUNT(*) FILTER (WHERE attachments IS NOT NULL) as with_attachments
FROM messages
WHERE created_at > '2025-11-03 12:00:00'; -- Replace with migration time
```

---

## ✅ Success Criteria

Migration is considered successful when:

- [x] **100% Coverage**: All messages with `media_url` now have `attachments`
- [x] **Data Integrity**: All attachment objects have required fields (url, type, name, mimeType)
- [x] **Zero Errors**: No errors in migration output
- [x] **Verification Passed**: Post-migration verification shows 100%
- [x] **Performance**: Average migration time < 1ms per message
- [x] **No Data Loss**: All original `media_url` values preserved and migrated

---

## 🚀 Next Steps After Successful Backfill

1. ✅ **Verify Coverage**: Ensure 100% migration
2. ✅ **Deploy Frontend**: Now safe to deploy frontend with new components
3. ✅ **Monitor**: Watch for any rendering issues
4. 🔄 **Future**: Plan deprecation of `media_url` column (in 3-6 months)

---

## 📞 Support

### If Migration Fails

1. **Check Logs**: Review console output for specific errors
2. **Verify Pre-conditions**: Ensure migration 039 is applied
3. **Check Permissions**: Verify database user has UPDATE rights
4. **Rollback**: Use rollback plan above
5. **Restore Backup**: Use database backup if needed

### Contact

- **Feature Owner**: Feature Delivery Pipeline Team
- **Database Admin**: [Your DBA Team]
- **DevOps**: [Your DevOps Team]

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Feature ID**: FEAT-2025-20251103111429
