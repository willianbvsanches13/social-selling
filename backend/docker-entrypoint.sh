#!/bin/sh
set -e

echo "🚀 Starting backend deployment..."

# Run migrations
echo "📦 Running database migrations..."
if npm run migrate up; then
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migration warning: Some migrations may have already been applied"
fi

# Start the application
echo "🎯 Starting application..."
exec "$@"
