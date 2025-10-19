#!/bin/bash

# Social Selling - Docker Compose Logs Script
# This script helps view logs from services

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

show_help() {
    echo "Usage: ./logs.sh [SERVICE] [OPTIONS]"
    echo ""
    echo "Services:"
    echo "  backend    - Backend API logs"
    echo "  worker     - Worker service logs (BullMQ processors)"
    echo "  frontend   - Frontend Next.js logs"
    echo "  postgres   - PostgreSQL database logs"
    echo "  redis      - Redis cache logs"
    echo "  minio      - MinIO object storage logs"
    echo "  nginx      - Nginx reverse proxy logs"
    echo "  all        - All services (default)"
    echo ""
    echo "Options:"
    echo "  -f, --follow   Follow log output (like tail -f)"
    echo "  --tail N       Show last N lines (default: all)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./logs.sh worker -f           # Follow worker logs"
    echo "  ./logs.sh backend --tail 100  # Show last 100 backend logs"
    echo "  ./logs.sh all -f              # Follow all service logs"
}

main() {
    SERVICE="all"
    FOLLOW=false
    TAIL=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            backend|worker|frontend|postgres|redis|minio|nginx|all)
                SERVICE=$1
                shift
                ;;
            -f|--follow)
                FOLLOW=true
                shift
                ;;
            --tail)
                TAIL="--tail $2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_header "📋 Viewing Logs"

    if [ "$SERVICE" = "all" ]; then
        print_info "Showing logs from all services"
        SERVICE=""
    else
        print_info "Showing logs from: $SERVICE"
    fi

    # Build command
    CMD="docker compose logs"

    if [ "$FOLLOW" = true ]; then
        CMD="$CMD -f"
    fi

    if [ -n "$TAIL" ]; then
        CMD="$CMD $TAIL"
    fi

    CMD="$CMD $SERVICE"

    # Execute
    eval $CMD
}

main "$@"
