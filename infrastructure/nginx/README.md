# Nginx Reverse Proxy Configuration

This directory contains the Nginx reverse proxy configuration for the Social Selling Platform.

## Overview

Nginx serves as the main entry point for all HTTP traffic, routing requests to the appropriate backend services:
- Frontend (Next.js) - `/` path
- Backend API (NestJS) - `/api` path
- WebSocket (Socket.io) - `/socket.io` path
- MinIO media storage - `/media` path

## Directory Structure

```
infrastructure/nginx/
├── nginx.conf           # Main Nginx configuration
├── conf.d/
│   └── default.conf    # Server and routing configuration
└── README.md           # This file
```

## Features

### 1. Reverse Proxy Routing
- **Frontend**: All requests to `/` are proxied to the Next.js frontend container
- **Backend API**: All requests to `/api/*` are proxied to the NestJS backend
- **WebSocket**: Socket.io connections at `/socket.io` with proper upgrade headers
- **Media Storage**: MinIO object storage accessible at `/media/*`
- **Health Check**: `/health` endpoint returns "healthy" status

### 2. Rate Limiting
- **API endpoints**: 10 requests/second with burst of 20
- **Auth endpoints**: 5 requests/minute (configured in zone)
- **Media endpoints**: 10 requests/second with burst of 30

### 3. Security Headers
All responses include the following security headers:
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS filtering
- `Referrer-Policy: no-referrer-when-downgrade` - Controls referrer information

### 4. Performance Optimizations
- **Gzip compression** enabled for text-based content types
- **Client body size limit**: 10MB for file uploads
- **Keepalive**: 65 seconds for persistent connections
- **Proxy timeouts**: 60 seconds for API, 7 days for WebSocket
- **TCP optimizations**: `sendfile`, `tcp_nopush`, `tcp_nodelay` enabled

### 5. Logging
- **Access logs**: `/var/log/nginx/access.log` with detailed request information
- **Error logs**: `/var/log/nginx/error.log` with warning level
- **Health check**: Logs disabled for `/health` endpoint

## Configuration Files

### nginx.conf
Main configuration file with:
- Worker process settings (auto-scaling based on CPU cores)
- Gzip compression settings
- Rate limiting zone definitions
- Global HTTP settings

### conf.d/default.conf
Server configuration with:
- Upstream service definitions (backend, frontend, minio)
- Location blocks for routing
- Proxy headers and settings
- Security headers

## Current Status

### Active Services
- ✅ Nginx container running on ports 80 and 443
- ✅ MinIO proxy working at `/media`
- ✅ Health check working at `/health`
- ✅ Security headers configured and active
- ✅ Rate limiting enabled

### Pending Services (commented out until deployed)
- ⏳ Backend API (NestJS) - `/api`
- ⏳ WebSocket (Socket.io) - `/socket.io`
- ⏳ Frontend (Next.js) - `/`

## Testing

### Test Nginx is running
```bash
docker-compose ps nginx
```

### Test root endpoint
```bash
curl http://localhost/
# Expected: "Social Selling Platform - Infrastructure Ready"
```

### Test health check
```bash
curl http://localhost/health
# Expected: "healthy"
```

### Test security headers
```bash
curl -I http://localhost/
# Look for X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
```

### Test MinIO proxy
```bash
curl -I http://localhost/media/
# Should return response from MinIO through Nginx
```

### Test rate limiting
```bash
for i in {1..30}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost/media/; done
# Should see 503 (Service Temporarily Unavailable) after exceeding rate limit
```

## Enabling Backend and Frontend

When backend and frontend services are deployed, uncomment the following in `conf.d/default.conf`:

1. Upstream definitions:
```nginx
upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}
```

2. Location blocks:
```nginx
location /api { ... }
location /socket.io { ... }
location / { ... }  # Replace placeholder with frontend proxy
```

3. Restart Nginx:
```bash
docker-compose restart nginx
```

## SSL/TLS Configuration (Future)

SSL certificates will be managed by Let's Encrypt using Certbot. Configuration will include:
- Automatic certificate renewal
- Redirect HTTP to HTTPS
- Strong cipher suites
- HSTS header

## Monitoring

Nginx logs are accessible via:
```bash
# Access logs
docker logs social-selling-nginx

# Real-time access logs
docker logs -f social-selling-nginx
```

## Troubleshooting

### Container keeps restarting
- Check logs: `docker logs social-selling-nginx`
- Common issue: Missing upstream services (backend/frontend not running)
- Solution: Ensure upstream services are running or comment out their location blocks

### Rate limiting too strict
- Adjust rate in `nginx.conf`:
  - `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;`
  - Change `10r/s` to desired rate
- Restart Nginx: `docker-compose restart nginx`

### Headers not appearing
- Verify configuration: `docker exec social-selling-nginx nginx -t`
- Check location block has `add_header` directives
- Headers are only added to successful responses (2xx, 3xx status codes)

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Nginx Security Headers](https://github.com/GetPageSpeed/ngx_security_headers)
