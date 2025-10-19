#!/bin/bash

# Social Selling - Docker Compose Stop Script
# This script stops all running services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Main execution
main() {
    print_header "🛑 Social Selling - Stop Script"

    # Parse command line arguments
    REMOVE_VOLUMES=false

    for arg in "$@"; do
        case $arg in
            -v|--volumes)
                REMOVE_VOLUMES=true
                shift
                ;;
            -h|--help)
                echo "Usage: ./stop.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -v, --volumes  Also remove volumes (database data will be lost!)"
                echo "  -h, --help     Show this help message"
                echo ""
                exit 0
                ;;
        esac
    done

    print_info "Stopping all services..."

    if [ "$REMOVE_VOLUMES" = true ]; then
        print_warning "Stopping services and removing volumes..."
        print_warning "This will delete all database data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose down -v
            print_success "Services stopped and volumes removed"
        else
            print_info "Cancelled"
            exit 0
        fi
    else
        docker compose down
        print_success "All services stopped"
    fi

    print_info "To start services again, run: ./start.sh"
}

main "$@"
