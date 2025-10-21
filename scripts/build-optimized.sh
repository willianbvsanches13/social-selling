#!/bin/bash

# ================================
# Optimized Build Script
# Builds backend code once and uses it for both backend and worker
# ================================

set -e

echo "🔨 Building Social Selling Backend (Optimized)"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get environment
NODE_ENV=${NODE_ENV:-production}

echo -e "${BLUE}📋 Environment: ${NODE_ENV}${NC}"
echo ""

# Build strategy:
# 1. Build the base image with compiled code
# 2. Use that base for both backend and worker

echo -e "${YELLOW}Step 1: Building shared base image...${NC}"

# Build the shared base image
docker buildx build \
  --target build \
  --tag social-selling-base:latest \
  --file backend/Dockerfile \
  --build-arg NODE_ENV=${NODE_ENV} \
  --cache-from type=local,src=/tmp/.buildx-cache \
  --cache-to type=local,dest=/tmp/.buildx-cache-new,mode=max \
  backend/

echo -e "${GREEN}✅ Base image built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 2: Building backend image (using cached build)...${NC}"

# Build backend using the cached build stage
docker buildx build \
  --target production \
  --tag social-selling-backend:latest \
  --file backend/Dockerfile \
  --build-arg NODE_ENV=${NODE_ENV} \
  --cache-from type=local,src=/tmp/.buildx-cache-new \
  backend/

echo -e "${GREEN}✅ Backend image built${NC}"
echo ""

echo -e "${YELLOW}Step 3: Building worker image (using cached build)...${NC}"

# Build worker using the same cached build stage
docker buildx build \
  --target production \
  --tag social-selling-worker:latest \
  --file backend/Dockerfile.worker \
  --build-arg NODE_ENV=${NODE_ENV} \
  --cache-from type=local,src=/tmp/.buildx-cache-new \
  backend/

echo -e "${GREEN}✅ Worker image built${NC}"
echo ""

# Rotate cache to prevent it from growing too large
rm -rf /tmp/.buildx-cache
mv /tmp/.buildx-cache-new /tmp/.buildx-cache

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo "Images created:"
echo "  • social-selling-backend:latest"
echo "  • social-selling-worker:latest"
echo ""
echo "Build cache location: /tmp/.buildx-cache"
echo ""
echo "To start the containers:"
echo "  docker compose up -d backend worker"
