#!/bin/bash

# SSL Certificate Setup Script for Social Selling
# This script helps manage Let's Encrypt SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
EMAIL="contato@willianbvsanches.com"
DOMAINS=(
    "app-socialselling.willianbvsanches.com"
    "api.app-socialselling.willianbvsanches.com"
    "storage.app-socialselling.willianbvsanches.com"
    "grafana.app-socialselling.willianbvsanches.com"
    "prometheus.app-socialselling.willianbvsanches.com"
)

echo -e "${GREEN}Social Selling - SSL Certificate Management${NC}"
echo "=============================================="
echo ""

# Function to check if certbot container is running
check_certbot_container() {
    if ! docker ps | grep -q social-selling-certbot; then
        echo -e "${YELLOW}Starting certbot container...${NC}"
        docker compose up -d certbot
        sleep 3
    fi
}

# Function to obtain certificate for a domain
obtain_certificate() {
    local domain=$1
    echo -e "${GREEN}Obtaining certificate for ${domain}...${NC}"

    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "${domain}"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Certificate obtained successfully for ${domain}${NC}"
    else
        echo -e "${RED}✗ Failed to obtain certificate for ${domain}${NC}"
        return 1
    fi
}

# Function to renew all certificates
renew_certificates() {
    echo -e "${GREEN}Renewing all certificates...${NC}"
    docker compose run --rm certbot renew

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Certificates renewed successfully${NC}"
        echo -e "${YELLOW}Reloading nginx...${NC}"
        docker compose exec nginx nginx -s reload
    else
        echo -e "${RED}✗ Failed to renew certificates${NC}"
        return 1
    fi
}

# Function to list all certificates
list_certificates() {
    echo -e "${GREEN}Listing all certificates...${NC}"
    docker compose run --rm certbot certificates
}

# Function to setup all certificates
setup_all() {
    echo -e "${GREEN}Setting up SSL certificates for all domains...${NC}"
    echo ""

    check_certbot_container

    for domain in "${DOMAINS[@]}"; do
        echo ""
        echo -e "${YELLOW}Processing ${domain}...${NC}"
        obtain_certificate "${domain}"
        echo ""
    done

    echo ""
    echo -e "${GREEN}All certificates obtained!${NC}"
    echo -e "${YELLOW}Reloading nginx...${NC}"
    docker compose restart nginx
    echo -e "${GREEN}✓ Setup complete!${NC}"
}

# Function to add a new domain
add_domain() {
    local domain=$1
    if [ -z "$domain" ]; then
        echo -e "${RED}Error: Domain not specified${NC}"
        echo "Usage: $0 add example.com"
        exit 1
    fi

    echo -e "${GREEN}Adding certificate for ${domain}...${NC}"
    check_certbot_container
    obtain_certificate "${domain}"

    echo -e "${YELLOW}Reloading nginx...${NC}"
    docker compose exec nginx nginx -s reload
    echo -e "${GREEN}✓ Done!${NC}"
}

# Main menu
case "${1:-}" in
    setup)
        setup_all
        ;;
    renew)
        check_certbot_container
        renew_certificates
        ;;
    list)
        check_certbot_container
        list_certificates
        ;;
    add)
        add_domain "$2"
        ;;
    test)
        echo -e "${GREEN}Testing nginx configuration...${NC}"
        docker compose exec nginx nginx -t
        ;;
    *)
        echo "Usage: $0 {setup|renew|list|add|test}"
        echo ""
        echo "Commands:"
        echo "  setup    - Obtain certificates for all configured domains"
        echo "  renew    - Renew all existing certificates"
        echo "  list     - List all existing certificates"
        echo "  add      - Add certificate for a new domain"
        echo "  test     - Test nginx configuration"
        echo ""
        echo "Examples:"
        echo "  $0 setup                        # Setup all certificates"
        echo "  $0 add new.example.com          # Add certificate for new domain"
        echo "  $0 renew                        # Renew all certificates"
        exit 1
        ;;
esac
