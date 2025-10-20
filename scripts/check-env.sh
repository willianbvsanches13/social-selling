#!/bin/bash

# Check if all required environment variables are set
# Run this before deploying to production

set -e

echo "🔍 Checking Environment Variables"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create a .env file from .env.example"
    exit 1
fi

# List of required variables
REQUIRED_VARS=(
    "NODE_ENV"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "SESSION_SECRET"
    "OAUTH_ENCRYPTION_KEY"
    "MINIO_ROOT_USER"
    "MINIO_ROOT_PASSWORD"
    "MINIO_ACCESS_KEY"
    "MINIO_SECRET_KEY"
    "GRAFANA_ADMIN_PASSWORD"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "SMTP_FROM_EMAIL"
)

# List of variables that should not have default values
NO_DEFAULT_VARS=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "SESSION_SECRET"
    "OAUTH_ENCRYPTION_KEY"
    "MINIO_ROOT_PASSWORD"
    "MINIO_SECRET_KEY"
    "GRAFANA_ADMIN_PASSWORD"
    "SMTP_PASSWORD"
)

MISSING_VARS=()
DEFAULT_VARS=()

echo "Checking required variables..."
echo ""

for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${VAR}=" .env; then
        MISSING_VARS+=("$VAR")
        echo "❌ $VAR - MISSING"
    else
        VALUE=$(grep "^${VAR}=" .env | cut -d '=' -f2-)

        # Check if it's a variable that shouldn't have default value
        if [[ " ${NO_DEFAULT_VARS[@]} " =~ " ${VAR} " ]]; then
            if [[ "$VALUE" == *"CHANGE_ME"* ]] || [[ "$VALUE" == *"GENERATE_WITH"* ]] || [ -z "$VALUE" ]; then
                DEFAULT_VARS+=("$VAR")
                echo "⚠️  $VAR - HAS DEFAULT VALUE (needs to be changed)"
            else
                echo "✅ $VAR - OK"
            fi
        else
            echo "✅ $VAR - OK"
        fi
    fi
done

echo ""
echo "=================================="

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing required variables:"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "   - $VAR"
    done
fi

if [ ${#DEFAULT_VARS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Variables with default values (must be changed):"
    for VAR in "${DEFAULT_VARS[@]}"; do
        echo "   - $VAR"
    done
    echo ""
    echo "💡 Run ./scripts/generate-keys.sh to generate secure keys"
fi

if [ ${#MISSING_VARS[@]} -eq 0 ] && [ ${#DEFAULT_VARS[@]} -eq 0 ]; then
    echo ""
    echo "✅ All required environment variables are properly set!"
    exit 0
else
    echo ""
    echo "❌ Environment check failed. Please fix the issues above."
    exit 1
fi
