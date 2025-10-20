#!/bin/bash
# SSL Certificate Setup Script for Let's Encrypt
# This script should be run on the production VPS with root privileges
#
# Usage: sudo ./setup-ssl.sh
#
# Requirements:
# - Domain DNS must be configured to point to this server
# - Ports 80 and 443 must be open in firewall
# - Nginx must be running and accessible

set -e

# Configuration
DOMAINS=(
    "app-socialselling.willianbvsanches.com"
    "api.app-socialselling.willianbvsanches.com"
    "grafana.app-socialselling.willianbvsanches.com"
    "prometheus.app-socialselling.willianbvsanches.com"
)
EMAIL="willian.sanches@example.com"
WEBROOT="/var/www/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}SSL Certificate Setup for Social Selling${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Domains to be certified:${NC}"
for domain in "${DOMAINS[@]}"; do
    echo "  - $domain"
done
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: This script must be run as root${NC}"
  exit 1
fi

# Check if domains resolve to this server
echo -e "${YELLOW}Checking DNS configuration...${NC}"
SERVER_IP=$(curl -s ifconfig.me)
DNS_CHECK_FAILED=0

for domain in "${DOMAINS[@]}"; do
    DOMAIN_IP=$(dig +short $domain | tail -n1)
    if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
        echo -e "${RED}Warning: $domain resolves to $DOMAIN_IP but this server's IP is $SERVER_IP${NC}"
        DNS_CHECK_FAILED=1
    else
        echo -e "${GREEN}✓ $domain resolves correctly to $SERVER_IP${NC}"
    fi
done

if [ $DNS_CHECK_FAILED -eq 1 ]; then
  echo -e "${YELLOW}Please ensure DNS is properly configured before proceeding.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
  echo -e "${YELLOW}Installing Certbot...${NC}"
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
  echo -e "${GREEN}Certbot installed successfully${NC}"
else
  echo -e "${GREEN}Certbot is already installed${NC}"
fi

# Create webroot directory for ACME challenge
mkdir -p $WEBROOT
chmod 755 $WEBROOT

# Ensure Nginx is configured for ACME challenge
echo -e "${YELLOW}Checking Nginx configuration...${NC}"
if ! docker exec social-selling-nginx nginx -t 2>&1 | grep -q "successful"; then
  echo -e "${RED}Error: Nginx configuration test failed${NC}"
  echo -e "${YELLOW}Please fix Nginx configuration before proceeding${NC}"
  exit 1
fi

echo -e "${GREEN}Nginx configuration is valid${NC}"

# Stop Nginx temporarily to allow Certbot standalone mode
echo -e "${YELLOW}Stopping Nginx temporarily for certificate acquisition...${NC}"
docker stop social-selling-nginx || true

# Obtain SSL certificates for all domains
echo ""
echo -e "${YELLOW}Obtaining SSL certificates from Let's Encrypt...${NC}"
FAILED_DOMAINS=()

for domain in "${DOMAINS[@]}"; do
    echo ""
    echo -e "${YELLOW}Processing: $domain${NC}"

    certbot certonly \
      --standalone \
      -d $domain \
      --non-interactive \
      --agree-tos \
      --email $EMAIL \
      --preferred-challenges http \
      --http-01-port 80

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Certificate obtained for $domain${NC}"
    else
      echo -e "${RED}✗ Failed to obtain certificate for $domain${NC}"
      FAILED_DOMAINS+=("$domain")
    fi
done

# Check if any domains failed
if [ ${#FAILED_DOMAINS[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed to obtain certificates for the following domains:${NC}"
  for domain in "${FAILED_DOMAINS[@]}"; do
    echo "  - $domain"
  done
  echo -e "${YELLOW}Please check DNS configuration and try again.${NC}"
  docker start social-selling-nginx
  exit 1
fi

# Start Nginx again
echo ""
echo -e "${YELLOW}Starting Nginx with SSL configuration...${NC}"
docker start social-selling-nginx

# Verify certificate files exist for all domains
echo ""
echo -e "${YELLOW}Verifying certificate files...${NC}"
for domain in "${DOMAINS[@]}"; do
    CERT_PATH="/etc/letsencrypt/live/$domain"
    if [ ! -f "$CERT_PATH/fullchain.pem" ] || [ ! -f "$CERT_PATH/privkey.pem" ]; then
      echo -e "${RED}✗ Certificate files not found for $domain at $CERT_PATH${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Certificate verified for $domain${NC}"
done

# Test certificate renewal
echo -e "${YELLOW}Testing automatic renewal...${NC}"
certbot renew --dry-run

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Renewal test successful!${NC}"
else
  echo -e "${RED}Warning: Renewal test failed. Please check Certbot configuration.${NC}"
fi

# Set up automatic renewal cron job
echo -e "${YELLOW}Setting up automatic renewal cron job...${NC}"
CRON_CMD="0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'docker restart social-selling-nginx'"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo -e "${GREEN}Automatic renewal cron job created${NC}"
else
  echo -e "${GREEN}Automatic renewal cron job already exists${NC}"
fi

# Create renewal hook script
HOOK_SCRIPT="/etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > $HOOK_SCRIPT << 'EOF'
#!/bin/bash
# Restart Nginx container after certificate renewal
docker restart social-selling-nginx
EOF

chmod +x $HOOK_SCRIPT
echo -e "${GREEN}Renewal hook script created${NC}"

# Reload Nginx to apply SSL configuration
echo -e "${YELLOW}Reloading Nginx configuration...${NC}"
docker exec social-selling-nginx nginx -s reload || docker restart social-selling-nginx

# Print certificate information
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Certificate Information${NC}"
echo -e "${GREEN}======================================${NC}"
certbot certificates

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}SSL Setup Complete! 🎉${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${GREEN}Your domains are now secured:${NC}"
for domain in "${DOMAINS[@]}"; do
    CERT_PATH="/etc/letsencrypt/live/$domain"
    EXPIRY=$(openssl x509 -enddate -noout -in $CERT_PATH/fullchain.pem | cut -d= -f2)
    echo -e "  ✓ https://$domain (expires: $EXPIRY)"
done
echo ""
echo -e "${YELLOW}Automatic renewal: Configured (runs daily at 3 AM)${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Enable SSL config: mv infrastructure/nginx/conf.d/default.conf infrastructure/nginx/conf.d/default.conf.disabled"
echo -e "2. Enable SSL config: mv infrastructure/nginx/conf.d/ssl.conf.disabled infrastructure/nginx/conf.d/ssl.conf (if disabled)"
echo -e "3. Restart Nginx: docker compose restart nginx"
echo -e "4. Verify HTTPS access for all domains:"
for domain in "${DOMAINS[@]}"; do
    echo -e "   - https://$domain"
done
echo -e "5. Check SSL Labs rating: https://www.ssllabs.com/ssltest/"
echo -e "6. Monitor renewal logs: /var/log/letsencrypt/letsencrypt.log"
echo ""
