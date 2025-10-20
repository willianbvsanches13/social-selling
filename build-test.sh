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

main() {
    print_header "📊 Social Selling - Service Status"

    # Check Docker services
    echo -e "${BLUE}Docker Services:${NC}"
    print_header "📊 Entrando na pasta backend"
    cd backend/
    print_header "📊 Executando build na pasta backend"
    npm run build
    print_header "📊 Voltando para a pasta principal"
    cd ..
    
    print_header "📊 Docker compose down"
    
    docker compose down
    
    print_header "📊 Docker compose build"

    docker compose build --no-cache

    print_header "📊 Docker compose up"

    docker compose up -d

    source ./logs.sh -f
    
    echo ""
}

main "$@"
