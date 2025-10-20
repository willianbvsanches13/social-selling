#!/bin/bash

# Production Deployment Script
# This script deploys the application in production mode with SSL enabled

set -e

echo "🚀 Starting Production Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with production configuration."
    exit 1
fi

# Ensure NODE_ENV is set to production
if ! grep -q "NODE_ENV=production" .env; then
    echo "⚠️  Warning: NODE_ENV is not set to production in .env"
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker compose down

# Remove docker-compose.override.yml if it exists (for development only)
if [ -f docker-compose.override.yml ]; then
    echo "⚠️  Found docker-compose.override.yml (development file)"
    echo "   Renaming to .override.yml.backup for production deployment"
    mv docker-compose.override.yml docker-compose.override.yml.backup
fi

# Pull latest images if they exist
echo "📦 Pulling latest images..."
docker compose pull || true

# Build and start services with production configuration (no override file)
echo "🏗️  Building and starting services..."
docker compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker compose ps

# Show logs
echo "📋 Recent logs:"
docker compose logs --tail=50

echo "✅ Production deployment complete!"
echo ""
echo "🌐 Application URLs:"
echo "   - Main App: https://app-socialselling.willianbvsanches.com"
echo "   - API: https://api.app-socialselling.willianbvsanches.com"
echo "   - Grafana: https://grafana.app-socialselling.willianbvsanches.com"
echo "   - Prometheus: https://prometheus.app-socialselling.willianbvsanches.com"
echo ""
echo "📊 Monitor logs with: docker compose logs -f"
