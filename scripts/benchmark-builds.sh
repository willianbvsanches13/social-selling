#!/bin/bash

# ================================
# Build Benchmark Script
# Compare build times between different Dockerfile strategies
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Docker Build Performance Benchmark                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Clear all Docker build cache to ensure fair comparison
echo -e "${YELLOW}🧹 Clearing Docker build cache...${NC}"
docker builder prune -af > /dev/null 2>&1
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Benchmark 1: Original Dockerfiles (Separate builds)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Benchmark 1: Original Dockerfiles (Separate)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

START1=$(date +%s)
docker compose build --no-cache backend worker \
  --build-arg NODE_ENV=production \
  > /tmp/build1.log 2>&1
END1=$(date +%s)
DURATION1=$((END1 - START1))

echo -e "${GREEN}✅ Completed in ${DURATION1}s${NC}"
echo -e "   Backend+Worker built separately"
echo ""

# Clear cache again
echo -e "${YELLOW}🧹 Clearing cache for next test...${NC}"
docker builder prune -af > /dev/null 2>&1
echo ""

# Benchmark 2: Unified Dockerfile
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Benchmark 2: Unified Dockerfile${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Temporarily modify docker-compose to use unified Dockerfile
cat > /tmp/docker-compose.test.yml <<EOF
version: '3.9'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.unified
      target: production
      args:
        SERVICE_TYPE: backend
    image: social-selling-backend-test
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.unified
      target: production
      args:
        SERVICE_TYPE: worker
    image: social-selling-worker-test
EOF

START2=$(date +%s)
docker compose -f /tmp/docker-compose.test.yml build --no-cache \
  --build-arg NODE_ENV=production \
  > /tmp/build2.log 2>&1
END2=$(date +%s)
DURATION2=$((END2 - START2))

echo -e "${GREEN}✅ Completed in ${DURATION2}s${NC}"
echo -e "   Backend+Worker built with shared base"
echo ""

# Calculate improvement
IMPROVEMENT=$((100 - (DURATION2 * 100 / DURATION1)))
SAVED=$((DURATION1 - DURATION2))

# Results
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                      RESULTS                                   ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 Build Times:${NC}"
echo -e "   Original (Separate):  ${DURATION1}s"
echo -e "   Unified:              ${DURATION2}s"
echo ""
echo -e "${CYAN}💡 Performance:${NC}"
echo -e "   Time Saved:           ${SAVED}s"
echo -e "   Improvement:          ${IMPROVEMENT}%"
echo ""

if [ $IMPROVEMENT -gt 30 ]; then
    echo -e "${GREEN}🎉 Significant improvement! Unified Dockerfile is ${IMPROVEMENT}% faster!${NC}"
elif [ $IMPROVEMENT -gt 15 ]; then
    echo -e "${YELLOW}👍 Good improvement! Unified Dockerfile is ${IMPROVEMENT}% faster!${NC}"
else
    echo -e "${YELLOW}⚠️  Modest improvement: ${IMPROVEMENT}% faster${NC}"
fi

echo ""
echo -e "${CYAN}📝 Logs saved to:${NC}"
echo -e "   Original:  /tmp/build1.log"
echo -e "   Unified:   /tmp/build2.log"
echo ""

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up test images...${NC}"
docker rmi social-selling-backend-test social-selling-worker-test > /dev/null 2>&1 || true
rm /tmp/docker-compose.test.yml
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Recommendation: Use Dockerfile.unified for ${IMPROVEMENT}% faster builds!  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
