#!/bin/bash

# Production Build Script
# This script rebuilds all images for production deployment

set -e

echo "🏗️  Building Production Images..."
echo ""

# Check if NODE_ENV is set to production
if ! grep -q "NODE_ENV=production" .env; then
    echo "⚠️  Warning: NODE_ENV is not set to production in .env"
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build images without cache to ensure fresh build
echo "📦 Building backend..."
docker compose build --no-cache backend

echo ""
echo "📦 Building frontend..."
docker compose build --no-cache frontend

echo ""
echo "📦 Building worker..."
docker compose build --no-cache worker

echo ""
echo "✅ All images built successfully!"
echo ""
echo "🚀 To start the services:"
echo "   docker compose up -d"
echo ""
echo "📊 To view logs:"
echo "   docker compose logs -f"
