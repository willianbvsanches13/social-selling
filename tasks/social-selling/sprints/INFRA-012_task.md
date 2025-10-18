# INFRA-012: CI/CD Pipeline (GitHub Actions)

**Priority:** P1 (High)
**Effort:** 6 hours
**Day:** 12
**Dependencies:** INFRA-001, BE-001
**Domain:** Infrastructure & DevOps

---

## Overview

Set up GitHub Actions workflows for automated testing, building Docker images, and deploying to staging and production environments.

---

## Implementation

### PR Checks Workflow

```yaml
# File: /.github/workflows/pr-checks.yml

name: PR Checks

on:
  pull_request:
    branches: [main, staging]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Lint
        working-directory: ./backend
        run: npm run lint

      - name: Type check
        working-directory: ./backend
        run: npm run type-check

      - name: Unit tests
        working-directory: ./backend
        run: npm run test

      - name: Build
        working-directory: ./backend
        run: npm run build

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Lint
        working-directory: ./frontend
        run: npm run lint

      - name: Type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Build
        working-directory: ./frontend
        run: npm run build
```

### Production Deployment Workflow

```yaml
# File: /.github/workflows/deploy-production.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}

      - name: Deploy to VPS
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
        run: |
          ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'EOF'
            cd /app/social-selling-2
            git pull origin main
            docker compose pull
            docker compose up -d --build
            docker compose exec backend npm run migrate:up
          EOF

      - name: Health check
        run: |
          sleep 30
          curl -f https://app-socialselling.willianbvsanches.com/health || exit 1

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### Docker Build Workflow

```yaml
# File: /.github/workflows/docker-build.yml

name: Build Docker Images

on:
  push:
    branches: [main, staging]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/social-selling-backend:latest
            ${{ secrets.DOCKER_USERNAME }}/social-selling-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/social-selling-frontend:latest
            ${{ secrets.DOCKER_USERNAME }}/social-selling-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## GitHub Secrets Required

```
VPS_SSH_KEY           # Private SSH key for VPS access
VPS_HOST              # VPS IP address
VPS_USER              # VPS username (root or deploy user)
DOCKER_USERNAME       # Docker Hub username
DOCKER_PASSWORD       # Docker Hub access token
SLACK_WEBHOOK         # Slack webhook for notifications (optional)
```

---

## Acceptance Criteria

- [ ] PR checks run on pull requests
- [ ] Tests pass in CI
- [ ] Docker images build successfully
- [ ] Staging deployment works
- [ ] Production deployment works
- [ ] Health checks validate deployment
- [ ] Team notifications sent

---

## Testing

```bash
# Create test PR
git checkout -b test-ci
git commit --allow-empty -m "Test CI"
git push origin test-ci

# Check workflow runs
# https://github.com/<username>/social-selling-2/actions

# Test deployment
git checkout main
git merge test-ci
git push origin main

# Verify health
curl https://app-socialselling.willianbvsanches.com/health
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
