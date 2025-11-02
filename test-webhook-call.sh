#!/bin/bash

# Script to test webhook signature validation
# This simulates a webhook call from Instagram

echo "🧪 Testing Instagram Webhook Signature Validation"
echo "=================================================="
echo ""

# The exact payload from your error
PAYLOAD='{
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
}'

# The signatures from Meta
SHA1_SIG="sha1=eb165430f2d912e9ab79cd4372193cf7904d7f18"
SHA256_SIG="sha256=766e10942d149bfe42f2d18fad6c874c0073cde47a0d3387bb429928fa5d9db8"

echo "Payload:"
echo "$PAYLOAD" | jq '.'
echo ""
echo "Signatures from Meta:"
echo "  SHA-1:   $SHA1_SIG"
echo "  SHA-256: $SHA256_SIG"
echo ""
echo "Sending webhook to backend..."
echo ""

# Call the webhook endpoint
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST http://localhost:4000/api/instagram/webhooks \
  -H "Content-Type: application/json" \
  -H "x-hub-signature: $SHA1_SIG" \
  -H "x-hub-signature-256: $SHA256_SIG" \
  -d "$PAYLOAD")

# Parse response
HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "  HTTP Status: $HTTP_STATUS"
echo "  Body: $BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS! Webhook signature validated successfully"
  echo ""
  echo "Check the logs for detailed verification info:"
  echo "  docker logs social-selling-backend -f"
else
  echo "❌ FAILED! Webhook signature validation failed"
  echo ""
  echo "Check the logs to see what went wrong:"
  echo "  docker logs social-selling-backend --tail 50"
  echo ""
  echo "Common issues:"
  echo "  1. Wrong INSTAGRAM_APP_SECRET in .env file"
  echo "  2. App Secret doesn't match Meta Dashboard"
  echo "  3. Using App ID instead of App Secret"
fi
