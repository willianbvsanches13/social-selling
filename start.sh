#!/bin/bash

# Social Selling - Docker Compose Startup Script
# This script handles the complete setup and startup of all services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Check if Docker is running
check_docker() {
    print_info "Checking if Docker is running..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env file exists
check_env_file() {
    print_info "Checking for .env file..."
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        if [ -f ".env.example" ]; then
            print_info "Creating .env from .env.example..."
            cp .env.example .env
            print_success "Created .env file"
            print_warning "Please update .env with your configuration before starting"
            read -p "Press Enter to continue or Ctrl+C to exit and configure .env..."
        else
            print_warning "No .env.example found. Continuing without .env file..."
        fi
    else
        print_success ".env file exists"
    fi
}

# Set Docker environment variables
set_docker_env() {
    print_info "Setting Docker environment variables..."
    export DOCKER_BUILDKIT=0
    export COMPOSE_DOCKER_CLI_BUILD=0
    print_success "Docker environment variables set"
}

# Clean up old containers and volumes (optional)
cleanup() {
    print_warning "Cleaning up old containers and volumes..."
    docker compose down -v 2>/dev/null || true
    print_success "Cleanup complete"
}

# Build Docker images
build_images() {
    print_header "Building Docker Images"
    print_info "This may take several minutes on first run..."

    if docker compose build; then
        print_success "All images built successfully"
    else
        print_error "Build failed. Please check the errors above."
        exit 1
    fi
}

# Start services
start_services() {
    print_header "Starting Services"

    # Check if user wants to run in detached mode
    if [ "$1" = "-d" ] || [ "$1" = "--detach" ]; then
        print_info "Starting services in detached mode..."
        docker compose up -d
        print_success "Services started in background"
        print_info "Use 'docker compose logs -f' to view logs"
        print_info "Use 'docker compose ps' to see running services"
        print_info "Use './stop.sh' to stop all services"
    else
        print_info "Starting services in foreground mode..."
        print_warning "Press Ctrl+C to stop all services"
        docker compose up
    fi
}

# Show service URLs
show_urls() {
    print_header "Service URLs"
    echo -e "${GREEN}📱 Frontend:${NC}              http://localhost:3000"
    echo -e "${GREEN}🚀 Backend API:${NC}           http://localhost:4000/api"
    echo -e "${GREEN}📚 API Documentation:${NC}     http://localhost:4000/api/docs"
    echo -e "${GREEN}💚 Health Check:${NC}          http://localhost:4000/health"
    echo -e "${GREEN}📊 MinIO Console:${NC}         http://localhost:9001"
    echo -e "${GREEN}📈 Grafana:${NC}               http://localhost:3001"
    echo -e "${GREEN}📉 Prometheus:${NC}            http://localhost:9090"
    echo ""
    echo -e "${BLUE}Worker Service:${NC}          Running in background (no UI)"
    echo -e "${BLUE}  - Instagram Publishing${NC}"
    echo -e "${BLUE}  - Webhook Processing${NC}"
    echo -e "${BLUE}  - Email Notifications${NC}"
    echo ""
}

# Main execution
main() {
    print_header "🚀 Social Selling - Startup Script"

    # Parse command line arguments
    CLEAN=false
    DETACH=false
    BUILD_ONLY=false

    for arg in "$@"; do
        case $arg in
            --clean)
                CLEAN=true
                shift
                ;;
            -d|--detach)
                DETACH=true
                shift
                ;;
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            -h|--help)
                echo "Usage: ./start.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --clean        Clean up old containers and volumes before starting"
                echo "  -d, --detach   Run services in background (detached mode)"
                echo "  --build-only   Only build images, don't start services"
                echo "  -h, --help     Show this help message"
                echo ""
                exit 0
                ;;
        esac
    done

    # Run checks and setup
    check_docker
    check_env_file
    set_docker_env

    # Optional cleanup
    if [ "$CLEAN" = true ]; then
        cleanup
    fi

    # Build images
    build_images

    # Exit if build-only
    if [ "$BUILD_ONLY" = true ]; then
        print_success "Build complete! Run './start.sh' to start services."
        exit 0
    fi

    # Show URLs before starting
    show_urls

    # Start services
    if [ "$DETACH" = true ]; then
        start_services -d

        # Show running services
        echo ""
        print_info "Checking service status..."
        sleep 3
        docker compose ps

        echo ""
        print_success "All services started successfully!"
        print_info "Run 'docker compose logs -f [service-name]' to view logs"
        print_info "Example: docker compose logs -f worker"
    else
        start_services
    fi
}

# Run main function
main "$@"
