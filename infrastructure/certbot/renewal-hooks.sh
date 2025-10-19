#!/bin/bash
# Let's Encrypt Certificate Renewal Hook
# This script is executed after successful certificate renewal
#
# Purpose: Reload Nginx configuration to use the new certificate
#
# This script is called by Certbot's --deploy-hook parameter

set -e

echo "=== Certificate Renewal Hook ==="
echo "Timestamp: $(date)"
echo "Renewed domain: $RENEWED_DOMAINS"
echo "Certificate lineage: $RENEWED_LINEAGE"

# Restart Nginx container to load new certificates
if docker ps | grep -q social-selling-nginx; then
  echo "Restarting Nginx container..."
  docker restart social-selling-nginx

  if [ $? -eq 0 ]; then
    echo "Nginx container restarted successfully"
  else
    echo "Error: Failed to restart Nginx container"
    exit 1
  fi
else
  echo "Warning: Nginx container not running"
fi

# Optional: Send notification (email, Slack, etc.)
# Uncomment and configure as needed
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"SSL certificate renewed for $RENEWED_DOMAINS\"}"

echo "=== Renewal Hook Complete ==="
