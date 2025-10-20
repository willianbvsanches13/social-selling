#!/bin/bash

# Generate Secure Keys for Environment Variables
# Run this script to generate random secure keys for your .env file

set -e

echo "🔐 Generating Secure Keys for Environment Variables"
echo "=================================================="
echo ""

echo "📝 Copy these values to your .env file:"
echo ""

echo "# JWT Secret (64 bytes)"
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""

echo "# JWT Refresh Secret (64 bytes)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""

echo "# Session Secret (32 bytes)"
echo "SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')"
echo ""

echo "# OAuth Encryption Key (32 bytes) - REQUIRED"
echo "OAUTH_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')"
echo ""

echo "# Instagram Webhook Verify Token"
echo "INSTAGRAM_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 32)"
echo ""

echo "=================================================="
echo "✅ Keys generated successfully!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Copy the OAUTH_ENCRYPTION_KEY to your .env file"
echo "   2. Never commit these keys to git"
echo "   3. Use different keys for production and development"
echo ""
