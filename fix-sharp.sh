#!/bin/bash

# ============================================
# Fix Sharp Module Error in Alpine Linux
# ============================================

set -e

echo "🔧 Fixing Sharp module for Alpine Linux..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop containers
echo -e "${YELLOW}Step 1: Stopping containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Step 2: Remove backend and worker containers
echo -e "${YELLOW}Step 2: Removing old containers...${NC}"
docker-compose rm -f backend worker 2>/dev/null || true
echo -e "${GREEN}✓ Containers removed${NC}"
echo ""

# Step 3: Remove backend and worker images
echo -e "${YELLOW}Step 3: Removing old images...${NC}"
docker rmi social-selling-2-backend social-selling-2-worker 2>/dev/null || true
echo -e "${GREEN}✓ Images removed${NC}"
echo ""

# Step 4: Rebuild backend and worker
echo -e "${YELLOW}Step 4: Rebuilding backend and worker (this may take a few minutes)...${NC}"
docker-compose build --no-cache backend worker
echo -e "${GREEN}✓ Rebuild complete${NC}"
echo ""

# Step 5: Start services
echo -e "${YELLOW}Step 5: Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 6: Wait for services to be healthy
echo -e "${YELLOW}Step 6: Waiting for services to be healthy...${NC}"
sleep 5

# Step 7: Verify Sharp
echo -e "${YELLOW}Step 7: Verifying Sharp installation...${NC}"
if docker-compose exec -T backend node -e "const sharp = require('sharp'); console.log('✓ Sharp version:', sharp.versions.sharp)" 2>/dev/null; then
    echo -e "${GREEN}✓ Sharp is working correctly!${NC}"
else
    echo -e "${RED}✗ Sharp verification failed. Check logs:${NC}"
    echo -e "${YELLOW}docker-compose logs backend${NC}"
    exit 1
fi
echo ""

# Step 8: Show status
echo -e "${YELLOW}Step 8: Service status...${NC}"
docker-compose ps
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Fix completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📝 Next steps:"
echo "  • Check logs: docker-compose logs -f backend"
echo "  • Check worker: docker-compose logs -f worker"
echo "  • Check status: docker-compose ps"
echo ""
