#!/bin/bash

# Script to configure MinIO bucket as public

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Configuring MinIO bucket as public...${NC}"
echo ""

# Install mc (MinIO Client) in the MinIO container if not present
docker compose exec minio sh -c "
  # Configure mc alias
  mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD

  # Set bucket policy to public read
  mc anonymous set download local/social-selling-media

  echo 'Bucket policy set to public read'

  # Verify policy
  mc anonymous get local/social-selling-media
"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ MinIO bucket configured successfully!${NC}"
    echo -e "${YELLOW}The bucket 'social-selling-media' is now publicly readable${NC}"
else
    echo ""
    echo -e "${RED}✗ Failed to configure MinIO bucket${NC}"
    exit 1
fi
