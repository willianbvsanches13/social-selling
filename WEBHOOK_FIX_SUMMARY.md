# Instagram Webhook Signature Fix - Summary

## Issues Identified

### 1. Invalid Webhook Signature ❌
**Error**: "Invalid webhook signature"

**Root Cause**: The HMAC SHA-256 signature doesn't match.

**Test Results**:
```
With INSTAGRAM_APP_SECRET=8dce0a9be202a564061968aa1a58dcfa
Expected (from Meta): 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
Calculated (by us): c682ba0d1b0672f44d9402d22a3fc33aadce9c04d3a7a9b2e23bb3456bda846a
Result: MISMATCH ❌
```

**Probable Cause**: Wrong App Secret being used (the one in your `.env` doesn't match Meta's)

**Secondary Issue**: Content-Length is 442 bytes but JSON is 427 bytes (15-byte difference suggests body modification)

### 2. MaxListenersExceededWarning ⚠️
**Warning**: Multiple "MaxListenersExceededWarning" for DailyRotateFile

**Cause**: Winston DailyRotateFile transports had default limit of 10 listeners, but multiple NestJS modules were attaching listeners

**Status**: ✅ FIXED

## Changes Made

### 1. Enhanced Webhook Debugging ✅

#### File: `backend/src/modules/instagram/controllers/instagram-webhooks.controller.ts`
```typescript
// Now logs:
- Both SHA-1 and SHA-256 signatures received
- Raw body length vs Content-Length header
- Raw body preview (first 100 chars)
- All headers when debugging
```

#### File: `backend/src/modules/instagram/services/instagram-webhooks.service.ts`
```typescript
// Now logs:
- Full received signature (not truncated)
- Full calculated signature
- App secret preview
- Detailed mismatch analysis with possible causes
```

### 2. Fixed Logger Warnings ✅

#### File: `backend/src/common/logging/logger.config.ts`
```typescript
// Added setMaxListeners(0) to all DailyRotateFile transports:
errorTransport.setMaxListeners(0);
combinedTransport.setMaxListeners(0);
accessTransport.setMaxListeners(0);
```

### 3. Created Debug Tools ✅

1. **test-signature.js** - Standalone signature verification script
2. **WEBHOOK_SIGNATURE_DEBUG.md** - Comprehensive debugging guide
3. **SIGNATURE_RESOLUTION.md** - Quick resolution steps
4. **debug-webhook-signature.ts** - TypeScript helper functions

## How to Fix the Webhook Issue

### Step 1: Get the Correct App Secret

1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your Instagram app
3. Navigate to: **Settings** → **Basic**
4. Click **Show** next to "App Secret"
5. Copy the secret

### Step 2: Update Your .env File

```bash
# Edit .env
nano .env

# Find this line:
INSTAGRAM_APP_SECRET=8dce0a9be202a564061968aa1a58dcfa

# Replace with the ACTUAL App Secret from Meta Dashboard:
INSTAGRAM_APP_SECRET=your_actual_app_secret_here

# Save and exit
```

### Step 3: Restart Backend

```bash
docker-compose restart backend
```

### Step 4: Test the Signature

```bash
# Option A: Test locally with the signature script
INSTAGRAM_APP_SECRET="your_actual_secret" node test-signature.js

# Option B: Trigger a webhook and watch the logs
docker logs social-selling-backend -f
```

### Step 5: Verify in Logs

When a webhook arrives, you should see:

```
✅ SUCCESS:
📨 Webhook received:
  - SHA-256: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8

🔐 Webhook signature verification:
  - Received signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Expected signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Payload length: 442 bytes

✅ Webhook signature is VALID!
```

```
❌ FAILURE:
🔐 Webhook signature verification:
  - Received signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Expected signature: c682ba0d1b0672f44d9402d22a3fc33aadce9c04d3a7a9b2e23bb3456bda846a

❌ Webhook signature mismatch!
MISMATCH DETAILS:
  - Possible causes:
    1. Wrong App Secret (check INSTAGRAM_APP_SECRET in .env)
    2. Request body was modified by nginx/proxy
    3. Character encoding issue
```

## Common Issues & Solutions

### Issue 1: Multiple Meta Apps
**Problem**: You have dev, staging, and production apps with different secrets

**Solution**: Make sure you're using the secret from the app that's configured in Instagram Business Settings

### Issue 2: App ID vs App Secret
**Problem**: Using App ID instead of App Secret

**Solution**:
- App ID: Visible number (e.g., `123456789`)
- App Secret: Hidden alphanumeric string (e.g., `8dce0a9be202a564061968aa1a58dcfa`)
- Use the **App Secret**, not the App ID

### Issue 3: Whitespace in .env
**Problem**: Extra spaces in the secret

**Solution**:
```bash
# Check for hidden characters
cat -A .env | grep INSTAGRAM_APP_SECRET

# Should be:
INSTAGRAM_APP_SECRET=your_secret$

# NOT:
INSTAGRAM_APP_SECRET=your_secret $
INSTAGRAM_APP_SECRET= your_secret$
```

### Issue 4: Nginx Modifying Body
**Problem**: Even with correct secret, signature fails

**Solution**: Check nginx config:
```bash
grep -A20 "instagram/webhooks" /etc/nginx/sites-available/*
```

Look for:
- `proxy_set_body` - Modifies body
- `sub_filter` - Alters content
- Gzip/compression settings

## Testing Tools

### Manual Test with curl

```bash
# Get your actual signature from Meta webhook logs
# Then test locally:

curl -X POST http://localhost:4000/api/instagram/webhooks \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=YOUR_SIGNATURE_HERE" \
  -d @webhook-payload.json
```

### Automated Test

```bash
# Run the signature verification script
INSTAGRAM_APP_SECRET="your_secret" node test-signature.js
```

This will test multiple payload formats and show which one matches.

## Files Modified

1. ✅ `backend/src/modules/instagram/controllers/instagram-webhooks.controller.ts` - Enhanced logging
2. ✅ `backend/src/modules/instagram/services/instagram-webhooks.service.ts` - Enhanced logging
3. ✅ `backend/src/common/logging/logger.config.ts` - Fixed MaxListeners warning

## Files Created

1. ✅ `test-signature.js` - Signature testing tool
2. ✅ `WEBHOOK_SIGNATURE_DEBUG.md` - Comprehensive debug guide
3. ✅ `SIGNATURE_RESOLUTION.md` - Quick resolution checklist
4. ✅ `debug-webhook-signature.ts` - Helper functions
5. ✅ `WEBHOOK_FIX_SUMMARY.md` - This file

## Next Steps

1. ⏳ Verify App Secret in Meta Dashboard
2. ⏳ Update `.env` with correct secret
3. ⏳ Restart backend
4. ⏳ Trigger a test webhook
5. ⏳ Verify in logs that signature is valid
6. ⏳ Confirm webhook processing works end-to-end

## Need Help?

If you're still having issues after verifying the App Secret:

1. Check the detailed logs with: `docker logs social-selling-backend -f`
2. Review the debug guides: `WEBHOOK_SIGNATURE_DEBUG.md` and `SIGNATURE_RESOLUTION.md`
3. Test locally with: `node test-signature.js`
4. Check nginx logs: `docker logs social-selling-nginx -f`

The backend is now running with comprehensive logging that will show you exactly what's happening with webhook signature verification!
