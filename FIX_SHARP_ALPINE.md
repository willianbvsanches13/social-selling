# Fix Sharp Module Error in Alpine Linux

## Problem

Sharp module fails to load in Alpine Linux Docker containers with error:
```
Error: Could not load the "sharp" module using the linuxmusl-x64 runtime
```

## Root Cause

Sharp is a native Node.js module that requires platform-specific binaries. When you:
1. Install dependencies on macOS/Windows (using `npm install`)
2. Volume mount the project into Alpine Linux container
3. The macOS/Windows Sharp binaries conflict with Alpine's musl libc

## Solution

### Option 1: Rebuild Sharp Inside Container (Recommended for Development)

The Dockerfile has been updated to rebuild Sharp for Alpine during the build process.

**Steps:**

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove the backend and worker containers and images
docker-compose rm -f backend worker
docker rmi social-selling-2-backend social-selling-2-worker

# 3. Rebuild the containers
docker-compose build --no-cache backend worker

# 4. Start the services
docker-compose up -d

# 5. Verify it's working
docker-compose logs -f backend
```

### Option 2: Clean Local node_modules (Alternative)

If you want to ensure no conflicts from local installations:

```bash
# 1. Stop containers
docker-compose down

# 2. Remove local node_modules
cd backend
rm -rf node_modules
cd ..

# 3. Rebuild and start
docker-compose build --no-cache backend worker
docker-compose up -d
```

### Option 3: Install Sharp Platform-Specific (For Local Development)

If you want to develop locally (outside Docker):

```bash
cd backend

# Uninstall sharp
npm uninstall sharp

# Install sharp with platform-specific option
npm install --os=linux --libc=musl --cpu=x64 sharp

# Or install with all platforms
npm install --include=optional sharp
```

## What Was Changed

### Dockerfile.unified

Added Alpine-specific dependencies and Sharp rebuild to the **development** stage:

```dockerfile
# Development Stage
FROM node:22-alpine AS development

WORKDIR /app

# Install build dependencies for native modules in development too
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    fftw-dev

# Install dependencies
COPY package.json ./
RUN npm install

# Rebuild sharp specifically for Alpine Linux
RUN npm rebuild sharp --verbose

# Copy source code
COPY . .

CMD ["npm", "run", "start:dev"]
```

## Verification

After rebuilding, verify Sharp is working:

```bash
# Check backend logs
docker-compose logs backend | grep -i sharp

# Should see something like:
# sharp: Detected globally-installed libvips v8.x.x
# sharp: Using existing installation of libvips

# Test inside container
docker-compose exec backend node -e "const sharp = require('sharp'); console.log('Sharp version:', sharp.versions)"
```

## Why This Happens

1. **Different libc**: Alpine uses `musl` libc, while most other Linux distros use `glibc`
2. **Native Modules**: Sharp uses native C++ bindings compiled for specific platforms
3. **Volume Mounts**: Development volume mounts (`./backend:/app`) can override container-built modules
4. **Anonymous Volumes**: Docker Compose uses `/app/node_modules` to prevent host modules from overriding container modules

## Best Practices

### For Development
- Always rebuild Sharp inside the Alpine container
- Use anonymous volumes for `node_modules` in docker-compose.override.yml
- Don't commit `node_modules` to git

### For Production
- Production stage already rebuilds Sharp correctly
- Production doesn't use volume mounts, so no conflicts

### For New Dependencies
After adding dependencies with native modules (sharp, bcrypt, etc.):

```bash
# Rebuild the container
docker-compose build --no-cache backend worker
docker-compose up -d
```

## Related Issues

- [Sharp Cross-Platform Installation](https://sharp.pixelplumbing.com/install#cross-platform)
- [Alpine Linux Requirements](https://sharp.pixelplumbing.com/install#alpine-linux)

## Quick Reference

```bash
# Full clean rebuild
docker-compose down
docker-compose rm -f backend worker
docker rmi $(docker images -q social-selling-2-backend social-selling-2-worker)
docker-compose build --no-cache backend worker
docker-compose up -d

# Check Sharp version
docker-compose exec backend npm list sharp

# Debug Sharp
docker-compose exec backend node -p "require('sharp').versions"
```

## Troubleshooting

### Error: "Cannot find module 'sharp'"
```bash
docker-compose exec backend npm install
```

### Error: "ERR_DLOPEN_FAILED"
```bash
# Sharp wasn't rebuilt for Alpine
docker-compose build --no-cache backend
```

### Error persists after rebuild
```bash
# Clear everything and start fresh
docker-compose down -v
rm -rf backend/node_modules backend/dist
docker-compose build --no-cache
docker-compose up -d
```

---

**Last Updated:** 2025-10-21
**Status:** Fixed in Dockerfile.unified
