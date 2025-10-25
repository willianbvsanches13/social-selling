# ================================
# Backend API Dockerfile
# Extends the shared base build
# ================================

# Import shared stages
ARG NODE_ENV=production
FROM node:22-alpine AS development

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Start development server
CMD ["npm", "run", "start:dev"]

# ================================
# Build Stage (Import from base)
# ================================
FROM node:22-alpine AS build

WORKDIR /app

# Install build dependencies for native modules (sharp, bcrypt, etc.)
# vips-dev is required for sharp to work on Alpine
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    fftw-dev

# Copy package files
COPY package.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install --include=optional

# Rebuild sharp for Alpine Linux (musl libc) with platform-specific flags
RUN npm rebuild sharp --platform=linuxmusl --arch=x64 --verbose

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ================================
# Production Stage (Backend Specific)
# ================================
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies for sharp (vips)
RUN apk add --no-cache vips

# Copy built application and production dependencies FIRST
# This is needed before we can reinstall sharp
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Reinstall sharp with correct binaries for runtime
RUN npm install --include=optional sharp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

# Fix ownership of already copied files
RUN chown -R nestjs:nodejs /app/node_modules /app/package.json

# Create backend-specific directories with correct permissions
RUN mkdir -p /tmp/app /app/logs && \
    chown -R nestjs:nodejs /tmp/app /app/logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start production server (main.js)
CMD ["node", "dist/main.js"]
