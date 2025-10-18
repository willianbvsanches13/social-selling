# INFRA-006: Nginx Reverse Proxy Configuration

**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 3
**Dependencies:** INFRA-002
**Domain:** Infrastructure & DevOps

---

## Overview

Configure Nginx as reverse proxy to route traffic to frontend (Next.js), backend API (NestJS), WebSocket connections (Socket.io), and MinIO media storage, with rate limiting and security headers.

---

## Implementation

### Nginx Configuration

```nginx
# File: /infrastructure/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    include /etc/nginx/conf.d/*.conf;
}
```

```nginx
# File: /infrastructure/nginx/conf.d/default.conf

upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}

upstream minio {
    server minio:9000;
}

server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Backend API
    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket connections
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # MinIO media storage
    location /media {
        limit_req zone=api_limit burst=30 nodelay;

        rewrite ^/media/(.*) /$1 break;
        proxy_pass http://minio;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache static media
        proxy_cache_valid 200 30d;
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## Files to Create

```
/infrastructure/nginx/
├── nginx.conf
└── conf.d/
    ├── default.conf
    └── rate-limit.conf
```

---

## Acceptance Criteria

- [ ] Nginx container running
- [ ] Frontend accessible at http://localhost
- [ ] Backend API at http://localhost/api
- [ ] WebSocket at http://localhost/socket.io
- [ ] MinIO media at http://localhost/media
- [ ] Rate limiting working
- [ ] Security headers present
- [ ] Gzip compression enabled

---

## Testing Procedure

```bash
# Test frontend
curl -I http://localhost/

# Test API
curl http://localhost/api/health

# Test rate limiting
for i in {1..30}; do curl http://localhost/api/health; done
# Expected: 429 Too Many Requests after limit

# Test headers
curl -I http://localhost/ | grep X-Frame-Options
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
