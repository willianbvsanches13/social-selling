#!/bin/bash

# Development Deployment Script
# This script deploys the application in development mode (HTTP only, no SSL)

set -e

echo "🚀 Starting Development Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with development configuration."
    exit 1
fi

# Ensure NODE_ENV is set to development
if ! grep -q "NODE_ENV=development" .env; then
    echo "⚠️  Warning: NODE_ENV is not set to development in .env"
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build and start services with development configuration
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

echo "✅ Development deployment complete!"
echo ""
echo "🌐 Application URLs:"
echo "   - Main App: http://localhost"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:4000"
echo "   - Grafana: http://localhost:3001 or http://grafana.localhost"
echo "   - Prometheus: http://localhost:9090 or http://prometheus.localhost"
echo "   - MinIO Console: http://localhost:9001"
echo ""
echo "📊 Monitor logs with: docker compose logs -f [service]"
echo "🔧 Available services: frontend, backend, worker, postgres, redis, minio, nginx, grafana, prometheus"
