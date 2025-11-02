# Webhook Signature Issue - Resolution Steps

## Summary

Your Instagram webhook is failing signature validation. I've added comprehensive debugging to help identify the root cause.

## What I Changed

### 1. Enhanced Logging in Webhook Controller
Location: `backend/src/modules/instagram/controllers/instagram-webhooks.controller.ts`

Now logs:
- Both SHA-1 and SHA-256 signatures
- Raw body length vs Content-Length header
- First 100 characters of the raw body
- All headers when raw body is missing

### 2. Enhanced Logging in Webhook Service
Location: `backend/src/modules/instagram/services/instagram-webhooks.service.ts`

Now logs:
- Full received signature (not truncated)
- Full calculated signature
- App secret preview
- Payload preview
- Detailed mismatch analysis with possible causes

## Next Steps to Debug

### Option 1: Check Logs When Webhook Arrives

```bash
# Watch backend logs in real-time
docker logs social-selling-backend -f
```

When a webhook arrives, you'll see output like:

```
📨 Webhook received:
  - Has SHA-256 signature: true
  - Has SHA-1 signature: true
  - Raw body length: 442 bytes
  - Content-Length header: 442
  - SHA-256: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8

🔐 Webhook signature verification:
  - Received signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Expected signature: c682ba0d1b0672f44d9402d22a3fc33aadce9c04d3a7a9b2e23bb3456bda846a
  - App secret preview: 8dce0a9b...
```

**If the signatures don't match**, it means one of these:

1. **Wrong App Secret** (most likely)
   - The `INSTAGRAM_APP_SECRET` in `.env` doesn't match Meta's App Secret
   - Go to: https://developers.facebook.com/apps/ → Your App → Settings → Basic
   - Compare the "App Secret" with your `.env` value

2. **Body Modification**
   - Nginx or another proxy is changing the request body
   - The Content-Length shows 442 bytes but JSON.stringify produces 427 bytes
   - This 15-byte difference suggests whitespace changes

### Option 2: Verify App Secret

The test results showed that with `INSTAGRAM_APP_SECRET=8dce0a9be202a564061968aa1a58dcfa`:

```
Received SHA-256: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
Calculated SHA-256: c682ba0d1b0672f44d9402d22a3fc33aadce9c04d3a7a9b2e23bb3456bda846a
Result: ❌ MISMATCH
```

**This strongly suggests the App Secret is incorrect.**

#### To verify:

1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your Instagram app
3. Go to **Settings** → **Basic**
4. Click "Show" next to **App Secret**
5. Compare with your `.env` file:

```bash
cat .env | grep INSTAGRAM_APP_SECRET
```

### Option 3: Test with Different Secrets

If you have multiple possible app secrets (dev, staging, prod), test them:

```bash
# Test with first secret
INSTAGRAM_APP_SECRET="secret1" node test-signature.js

# Test with second secret
INSTAGRAM_APP_SECRET="secret2" node test-signature.js
```

One of them should show:

```
SHA-256 Match: ✅ YES
```

## Common Causes

### 1. Using Wrong Environment's Secret

- You might have multiple Meta apps (dev, staging, production)
- Each has its own App Secret
- Make sure you're using the secret from the app that's sending webhooks

### 2. Using App ID Instead of App Secret

- App ID: Usually visible, numeric
- App Secret: Hidden by default, alphanumeric string
- Make sure you copied the **App Secret**, not the App ID

### 3. Extra Whitespace

- The secret in `.env` might have leading/trailing spaces
- Check: `cat -A .env | grep INSTAGRAM_APP_SECRET`
- Should be: `INSTAGRAM_APP_SECRET=your_secret` (no spaces)

### 4. Nginx Modifying Body

If the secret is correct but still fails:

```bash
# Check nginx config
cat /etc/nginx/sites-available/default | grep -A10 "instagram/webhooks"
```

Look for directives that might modify the body:
- `proxy_set_body`
- `sub_filter`
- Gzip/compression that changes content

## Files Created for Debugging

1. **test-signature.js** - Standalone test script to verify signatures
2. **WEBHOOK_SIGNATURE_DEBUG.md** - Comprehensive debug guide
3. **debug-webhook-signature.ts** - Helper functions for signature debugging
4. **SIGNATURE_RESOLUTION.md** (this file) - Quick resolution steps

## Quick Fix Checklist

- [ ] Get the correct App Secret from Meta Dashboard
- [ ] Update `.env` file with correct secret
- [ ] Restart backend: `docker-compose restart backend`
- [ ] Trigger a test webhook from Instagram
- [ ] Check logs: `docker logs social-selling-backend -f`
- [ ] Verify signatures now match

## Still Not Working?

If you've verified the App Secret and it still doesn't work:

1. Check for multiple App Secrets in Meta Dashboard (different modes/environments)
2. Verify the webhook is configured for the correct Instagram Business Account
3. Check if you need to use a different Instagram App
4. Contact Meta support if the signature validation is definitely correct but still failing

## Security Note

**Never commit secrets to git!**

Make sure `.env` is in `.gitignore` and never share the actual App Secret publicly.
