# INFRA-008: Cloudflare DNS and CDN Setup

**Priority:** P2 (Medium)
**Effort:** 2 hours
**Day:** 13
**Dependencies:** INFRA-007
**Domain:** Infrastructure & DevOps

---

## Overview

Configure Cloudflare for DNS management, CDN caching, and DDoS protection for the production domain.

---

## Implementation Steps

### 1. Add Domain to Cloudflare
- Navigate to Cloudflare dashboard
- Add site: `willianbvsanches.com`
- Update nameservers at domain registrar

### 2. DNS Records

```
Type    Name                                    Content             Proxy
A       app-socialselling                       <VPS_IP>            Proxied (orange cloud)
A       @                                       <VPS_IP>            DNS only (gray cloud)
CNAME   www                                     willianbvsanches.com  Proxied
TXT     _acme-challenge.app-socialselling       <Let's Encrypt>     DNS only
```

### 3. SSL/TLS Settings
- SSL/TLS mode: **Full (Strict)**
- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**
- TLS 1.3: **On**
- Automatic HTTPS Rewrites: **On**

### 4. Page Rules

```
1. Rule: *app-socialselling.willianbvsanches.com/media/*
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

2. Rule: *app-socialselling.willianbvsanches.com/api/*
   Settings:
   - Cache Level: Bypass

3. Rule: *app-socialselling.willianbvsanches.com/_next/static/*
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
```

### 5. Security Settings
- Security Level: **Medium**
- Bot Fight Mode: **On**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **On**

---

## Acceptance Criteria

- [ ] Domain resolves through Cloudflare
- [ ] CDN caching working
- [ ] SSL Full Strict mode active
- [ ] Page rules configured
- [ ] DDoS protection enabled

---

## Testing

```bash
# Check DNS propagation
dig app-socialselling.willianbvsanches.com

# Check Cloudflare proxy
curl -I https://app-socialselling.willianbvsanches.com

# Verify CF headers
curl -I https://app-socialselling.willianbvsanches.com | grep cf-
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
