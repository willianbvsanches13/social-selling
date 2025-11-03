# Deployment Checklist - Instagram Inbox Fixes

**Version:** 1.0.0
**Date:** 2025-01-03
**Target:** Instagram inbox messaging system fixes

---

## Quick Reference

**Files Modified:**
- Backend: 6 files
- Frontend: 4 files
- New Endpoints: 2
- Database: No migrations needed

**Deployment Time:** ~30 minutes
**Expected Downtime:** None (rolling deployment)

---

## Pre-Deployment ✅

### Code Review
- [ ] All changes reviewed
- [ ] No merge conflicts
- [ ] TypeScript/ESLint clean
- [ ] All tests passing

### Documentation
- [ ] IMPLEMENTATION_SUMMARY.md reviewed
- [ ] E2E_TEST_PLAN.md reviewed
- [ ] Team notified

### Backup
- [ ] Database backup created
- [ ] Application backup created
- [ ] Backup location: `~/backups/$(date +%Y%m%d)/`

---

## Deployment Steps ⚙️

### 1. Backend
- [ ] Stop service
- [ ] Pull latest code (`git pull origin main`)
- [ ] Install dependencies (`npm install`)
- [ ] Build (`npm run build`)
- [ ] Start service
- [ ] Health check: `curl -I https://api.app-socialselling.willianbvsanches.com/health`

### 2. Frontend
- [ ] Pull latest code
- [ ] Install dependencies (`npm install`)
- [ ] Build (`npm run build`)
- [ ] Deploy/restart
- [ ] Health check: `curl -I https://app-socialselling.willianbvsanches.com`

---

## Smoke Tests 🔥

### Test 1: Login (1 min)
- [ ] Navigate to https://app-socialselling.willianbvsanches.com
- [ ] Login: `kalyanemartins@unochapeco.edu.br`
- [ ] Success

### Test 2: Conversation List (2 min)
- [ ] Go to Inbox
- [ ] Select `@kalyanemartinsbeauty` account
- [ ] Usernames visible (not "Loading...")
- [ ] Profile pictures visible

### Test 3: Conversation Header (1 min)
- [ ] Click any conversation
- [ ] Username displayed (not "Unknown User")
- [ ] Handle shows "@username"

### Test 4: Message Sending (3 min)
- [ ] Select conversation with user `1092310252982105`
- [ ] Type: "Test - deployment verification"
- [ ] Send message
- [ ] Message appears in thread
- [ ] Success toast shown
- [ ] No console errors

### Test 5: Network Check (2 min)
- [ ] Open DevTools → Network
- [ ] Send message
- [ ] POST `/api/messaging/conversations/{id}/messages`
- [ ] Status: 200/201
- [ ] Response includes message object

---

## Data Migration (Optional) 📊

Run after smoke tests pass:

### Get Client Account ID
```bash
curl -X GET https://api.app-socialselling.willianbvsanches.com/api/instagram/accounts \
  -H "Authorization: Bearer {TOKEN}"
```

### Enrich Profiles
```bash
curl -X POST "https://api.app-socialselling.willianbvsanches.com/api/messaging/conversations/enrich?clientAccountId={ID}" \
  -H "Authorization: Bearer {TOKEN}"
```

Expected: `{"total": X, "enriched": Y, "failed": 0, "skipped": Z}`

### Backfill Replies
```bash
curl -X POST https://api.app-socialselling.willianbvsanches.com/api/messaging/messages/backfill-replies \
  -H "Authorization: Bearer {TOKEN}"
```

Expected: `{"total": X, "updated": Y, "failed": 0, "skipped": Z}`

---

## E2E Tests (Optional) 🧪

Full test plan in `E2E_TEST_PLAN.md` (~25 minutes):

- [ ] TC-001: Conversation list
- [ ] TC-002: Conversation header
- [ ] TC-003: Message sending
- [ ] TC-004: Reply messages
- [ ] TC-005: Attachments

---

## Monitoring 📈

### First Hour
- [ ] Monitor logs for errors
- [ ] Check error tracking dashboard
- [ ] Verify webhook processing

### First 24 Hours
- [ ] Review performance metrics
- [ ] Check user feedback
- [ ] Monitor error rates

---

## Rollback Plan 🔄

If critical issues occur:

### Backend
```bash
pm2 stop backend
tar -xzf ~/backups/$(date +%Y%m%d)/backend_backup.tar.gz
pm2 start backend
```

### Frontend
```bash
tar -xzf ~/backups/$(date +%Y%m%d)/frontend_backup.tar.gz
pm2 restart frontend
```

---

## Success Criteria ✅

- [ ] All smoke tests pass
- [ ] No critical errors in logs
- [ ] Message sending works
- [ ] Usernames display correctly
- [ ] No user-reported issues

---

## Sign-Off 📝

**Deployed By:** _________________
**Date:** _________________
**Time:** _________________

**Status:**
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Smoke tests passed
- [ ] Monitoring enabled
- [ ] No critical issues

**Approved By:** _________________

---

## Troubleshooting 🔧

### Issue: 500 on message send
**Check:** Backend logs → `pm2 logs backend | grep "Failed to send message"`
**Common cause:** Access token placement
**Verify:** Instagram API request format

### Issue: Empty usernames
**Check:** Run enrichment endpoint
**Verify:** Instagram API returns participant data with nested fields

### Issue: Replies not showing
**Check:** Run backfill endpoint
**Verify:** Database has `repliedToMessageId` populated

---

## Emergency Contacts 📞

**On-Call:** _________________
**Team Lead:** _________________
**DevOps:** _________________

---

**Full Documentation:**
- Implementation: `IMPLEMENTATION_SUMMARY.md`
- Testing: `E2E_TEST_PLAN.md`
- General Deployment: `DEPLOYMENT.md`
