# Instagram Webhook Signature Validation Debug Guide

## Problem

Your Instagram webhook is receiving the "Invalid webhook signature" error. This happens when the HMAC SHA-256 signature calculated by your server doesn't match the signature sent by Meta/Instagram.

## Root Cause Analysis

Based on the test results, the signature mismatch is caused by one of these issues:

### 1. Wrong App Secret (Most Likely)

The INSTAGRAM_APP_SECRET in your `.env` file might not match the actual App Secret in your Meta App Dashboard.

**Current App Secret in .env:** `8dce0a9be202a564061968aa1a58dcfa`

**How to verify:**
1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your app
3. Go to **Settings** → **Basic**
4. Check the **App Secret** field
5. Compare it with your `.env` file

### 2. Body Modification by Proxy

Your nginx configuration might be modifying the request body before it reaches your Node.js application.

**Evidence:**
- Content-Length header: 442 bytes
- Actual JSON.stringify length: 427 bytes
- **15 bytes difference** suggests whitespace is being added/removed

## Enhanced Debugging

I've added comprehensive logging to help identify the issue:

### What's Now Logged

1. **Webhook Controller** (`instagram-webhooks.controller.ts`):
   - All headers received
   - Both SHA-1 and SHA-256 signatures
   - Raw body length vs Content-Length header
   - Raw body preview

2. **Webhook Service** (`instagram-webhooks.service.ts`):
   - Full received signature
   - Full calculated signature
   - App secret preview
   - Payload preview
   - Detailed mismatch analysis

### How to View Logs

```bash
# View backend logs in real-time
docker-compose logs -f backend

# Or check specific container logs
docker logs social-selling-backend -f
```

## Steps to Fix

### Step 1: Verify App Secret

```bash
# 1. Get your App Secret from Meta Dashboard
# 2. Update your .env file
nano .env

# 3. Find and update this line:
INSTAGRAM_APP_SECRET=YOUR_ACTUAL_APP_SECRET_HERE

# 4. Restart backend
docker-compose restart backend
```

### Step 2: Test with the signature tester

```bash
# Run the signature test script
INSTAGRAM_APP_SECRET=your_actual_secret node test-signature.js
```

This will test different payload variations and tell you if the secret is correct.

### Step 3: Check Nginx Configuration

If the App Secret is correct but signatures still don't match, check your nginx config:

```bash
# Check nginx configuration for the webhook endpoint
grep -A 20 "/api/instagram/webhooks" /etc/nginx/sites-available/*
```

Look for:
- `proxy_set_body` - This would modify the body
- `sub_filter` - This could alter content
- Compression settings that might change the body

### Step 4: Temporary Workaround (NOT RECOMMENDED FOR PRODUCTION)

**SECURITY WARNING:** Only use this for debugging, never in production!

You can temporarily disable signature verification to confirm the rest of your webhook logic works:

```typescript
// In instagram-webhooks.controller.ts
// TEMPORARILY comment out signature verification:
/*
const isValid = this.webhooksService.verifySignature(
  signature,
  rawBodyString,
);
if (!isValid) {
  this.logger.error('❌ Webhook signature validation failed');
  throw new Error('Invalid webhook signature');
}
*/

// Add temporary bypass:
this.logger.warn('⚠️ SIGNATURE VERIFICATION DISABLED - FOR DEBUGGING ONLY');
```

## Test Payload

Here's the exact payload that failed:

```json
{
  "entry": [
    {
      "id": "17841400538867190",
      "time": 1762010783728,
      "messaging": [
        {
          "sender": {
            "id": "17841400538867190"
          },
          "message": {
            "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzM2MTczNzg4MTI5NDExMzU3NjQ4OTczNTY4NDA5NgZDZD",
            "text": "Olá, testando amor 🥰",
            "is_echo": true
          },
          "recipient": {
            "id": "1129842642640637"
          },
          "timestamp": 1762010770464
        }
      ]
    }
  ],
  "object": "instagram"
}
```

Signatures received:
- **SHA-1**: `eb165430f2d912e9ab79cd4372193cf7904d7f18`
- **SHA-256**: `766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8`

## Next Steps

1. ✅ Enhanced logging is now active
2. ⏳ Verify your App Secret in Meta Dashboard
3. ⏳ Update `.env` with correct secret
4. ⏳ Restart backend
5. ⏳ Trigger a new webhook from Instagram
6. ⏳ Check logs to see detailed signature verification info

## Expected Log Output (When Working)

```
[InstagramWebhooksController] 📨 Webhook received:
  - Has SHA-256 signature: true
  - Has SHA-1 signature: true
  - Has rawBody: true
  - Body type: object
  - Raw body length: 442 bytes
  - Content-Length header: 442
  - SHA-256: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - SHA-1: eb165430f2d912e9ab79cd4372193cf7904d7f18

[InstagramWebhooksService] 🔐 Webhook signature verification:
  - Received signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Expected signature: 766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8
  - Payload length: 442 bytes

[InstagramWebhooksService] ✅ Webhook signature is VALID!
```

## References

- [Meta Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Instagram Messaging Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Webhook Security](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)
