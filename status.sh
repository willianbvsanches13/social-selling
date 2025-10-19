#!/bin/bash

# Social Selling - Status Script
# Check the status of all services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

check_health() {
    local service=$1
    local url=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service${NC} - Running"
    else
        echo -e "${RED}❌ $service${NC} - Not responding"
    fi
}

main() {
    print_header "📊 Social Selling - Service Status"

    # Check Docker services
    echo -e "${BLUE}Docker Services:${NC}"
    docker compose ps

    echo ""
    print_header "🔍 Health Checks"

    # Check service health
    check_health "Backend API" "http://localhost:4000/health"
    check_health "Frontend" "http://localhost:3000"
    check_health "MinIO" "http://localhost:9000/minio/health/live"

    echo ""
    print_header "📋 Service URLs"
    echo -e "${GREEN}📱 Frontend:${NC}              http://localhost:3000"
    echo -e "${GREEN}🚀 Backend API:${NC}           http://localhost:4000/api"
    echo -e "${GREEN}📚 API Documentation:${NC}     http://localhost:4000/api/docs"
    echo -e "${GREEN}💚 Health Check:${NC}          http://localhost:4000/health"
    echo -e "${GREEN}📊 MinIO Console:${NC}         http://localhost:9001"
    echo -e "${GREEN}📈 Grafana:${NC}               http://localhost:3001"
    echo -e "${GREEN}📉 Prometheus:${NC}            http://localhost:9090"

    echo ""
    print_header "🔧 Worker Queues"
    echo -e "${BLUE}To check worker logs:${NC} ./logs.sh worker -f"
    echo ""
}

main "$@"
