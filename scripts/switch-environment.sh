#!/bin/bash

# Environment Switcher Script
# This script helps switch between development and production environments

set -e

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./scripts/switch-environment.sh [development|production]"
    exit 1
fi

if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "❌ Error: Invalid environment. Use 'development' or 'production'"
    exit 1
fi

echo "🔄 Switching to $ENVIRONMENT environment..."

# Update .env file
if [ "$ENVIRONMENT" = "production" ]; then
    sed -i.bak 's/NODE_ENV=development/NODE_ENV=production/g' .env
    echo "✅ Updated NODE_ENV to production"
elif [ "$ENVIRONMENT" = "development" ]; then
    sed -i.bak 's/NODE_ENV=production/NODE_ENV=development/g' .env
    echo "✅ Updated NODE_ENV to development"
fi

# Remove backup file
rm -f .env.bak

echo ""
echo "📝 Current environment configuration:"
grep "NODE_ENV" .env

echo ""
echo "🚀 To deploy, run:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "   ./scripts/deploy-production.sh"
else
    echo "   ./scripts/deploy-development.sh"
fi
