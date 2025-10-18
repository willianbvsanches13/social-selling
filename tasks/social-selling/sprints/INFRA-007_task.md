# INFRA-007: SSL Certificate Setup (Let's Encrypt)

**Priority:** P2 (Medium)
**Effort:** 3 hours
**Day:** 13
**Dependencies:** INFRA-006, INFRA-012
**Domain:** Infrastructure & DevOps

---

## Overview

Configure Let's Encrypt SSL certificates with automatic renewal via Certbot for HTTPS access to the production application.

---

## Implementation

### SSL Setup Script

```bash
#!/bin/bash
# File: /infrastructure/scripts/setup-ssl.sh

set -e

DOMAIN="app-socialselling.willianbvsanches.com"
EMAIL="willian@example.com"

# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d $DOMAIN \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  --redirect

# Test renewal
certbot renew --dry-run

# Setup auto-renewal cron
echo "0 3 * * * /usr/bin/certbot renew --quiet" | crontab -

echo "SSL setup completed successfully"
```

### Nginx SSL Configuration

```nginx
# File: /infrastructure/nginx/conf.d/ssl.conf

server {
    listen 443 ssl http2;
    server_name app-socialselling.willianbvsanches.com;

    ssl_certificate /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Other locations...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name app-socialselling.willianbvsanches.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Acceptance Criteria

- [ ] SSL certificates obtained
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] Auto-renewal configured
- [ ] A+ SSL Labs rating

---

## Testing

```bash
# Test HTTPS
curl -I https://app-socialselling.willianbvsanches.com

# Test HTTP redirect
curl -I http://app-socialselling.willianbvsanches.com

# Test auto-renewal
certbot renew --dry-run

# Check SSL Labs
# https://www.ssllabs.com/ssltest/
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
