# Quick Fix Guide - Instagram Webhook Signature Error

## The Problem
Your webhook is failing with: **"Invalid webhook signature"**

## The Solution (3 Steps)

### Step 1: Get Your App Secret from Meta
1. Open: https://developers.facebook.com/apps/
2. Click your Instagram app
3. Go to: **Settings** → **Basic**
4. Click **Show** next to "App Secret"
5. Copy the secret (it looks like: `abc123def456...`)

### Step 2: Update .env File
```bash
# Edit the .env file in /root/social-selling/backend
nano .env

# Find this line:
INSTAGRAM_APP_SECRET=8dce0a9be202a564061968aa1a58dcfa

# Replace with YOUR ACTUAL secret from Step 1:
INSTAGRAM_APP_SECRET=paste_your_actual_secret_here

# Save: Ctrl+O, Enter, Ctrl+X
```

### Step 3: Restart Backend
```bash
docker-compose restart backend
```

## That's It!

The next webhook from Instagram should work. To verify:

```bash
# Watch the logs
docker logs social-selling-backend -f

# You should see:
# ✅ Webhook signature is VALID!
```

## Still Not Working?

### Test the Signature Manually

```bash
# Replace "your_secret" with what you put in .env
INSTAGRAM_APP_SECRET="your_secret" node test-signature.js

# This will tell you if the secret is correct
# Look for: "✅ YES" next to "SHA-256 Match"
```

### What the Test Results Mean

**If you see "✅ YES":**
- The secret is CORRECT
- The issue might be with nginx or the request body
- Check the detailed guide: `WEBHOOK_SIGNATURE_DEBUG.md`

**If you see "❌ NO":**
- The secret is WRONG
- Double-check the secret in Meta Dashboard
- Make sure you copied it correctly (no extra spaces)
- Try again from Step 1

## Common Mistakes

1. **Using the App ID instead of App Secret**
   - App ID: `123456789` (visible number)
   - App Secret: `abc123def456...` (hidden by default)
   - Make sure you use the SECRET, not the ID

2. **Extra spaces in .env**
   ```bash
   # WRONG:
   INSTAGRAM_APP_SECRET= abc123...
   INSTAGRAM_APP_SECRET=abc123...

   # CORRECT:
   INSTAGRAM_APP_SECRET=abc123...
   ```

3. **Using the wrong app's secret**
   - If you have multiple Meta apps (dev, staging, prod)
   - Make sure you're using the secret from the correct app
   - Check which app is configured in your Instagram Business Settings

## Need More Help?

See these detailed guides:
- `WEBHOOK_FIX_SUMMARY.md` - Complete overview of the fix
- `WEBHOOK_SIGNATURE_DEBUG.md` - Detailed debugging steps
- `SIGNATURE_RESOLUTION.md` - Resolution checklist

## What We Fixed

✅ Added detailed logging to show exactly what's happening
✅ Fixed MaxListeners warnings in the logger
✅ Created testing tools to verify signatures
✅ Enhanced error messages with possible causes

The backend is ready - just update the App Secret and restart!
