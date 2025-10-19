# SSL Certificate Setup Guide

## Overview

This guide covers the setup of Let's Encrypt SSL certificates for the Social Selling Platform using Certbot. The configuration provides:

- **Free SSL certificates** from Let's Encrypt
- **Automatic renewal** every 90 days
- **A+ SSL Labs rating** security configuration
- **HTTPS enforcement** with HTTP redirects
- **Modern TLS protocols** (TLS 1.2 and 1.3)
- **Security headers** (HSTS, CSP, etc.)

---

## Prerequisites

### Before You Begin

1. **Production VPS Access**
   - Root or sudo access to Hostinger VPS
   - SSH key-based authentication configured

2. **Domain Configuration**
   - Domain DNS must be configured to point to your VPS IP
   - Both A and AAAA records (if using IPv6) should be set
   - DNS propagation complete (verify with `dig` or `nslookup`)

3. **Ports Configuration**
   - Port 80 (HTTP) must be open for ACME challenge
   - Port 443 (HTTPS) must be open for SSL traffic
   - UFW firewall rules allow these ports

4. **Docker Setup**
   - Docker and Docker Compose installed
   - All containers running (`docker ps`)
   - Nginx container accessible

---

## Quick Start

### Step 1: Verify DNS Configuration

Before running the SSL setup, verify that your domain resolves to your VPS:

```bash
# Check server IP
curl ifconfig.me

# Check domain resolution
dig +short app-socialselling.willianbvsanches.com

# Both should return the same IP address
```

### Step 2: Run SSL Setup Script

On your production VPS, run the automated setup script:

```bash
# Navigate to project directory
cd /path/to/social-selling-2

# Run SSL setup script as root
sudo ./infrastructure/scripts/setup-ssl.sh
```

The script will:
1. ✅ Check DNS configuration
2. ✅ Install Certbot (if not already installed)
3. ✅ Stop Nginx temporarily
4. ✅ Obtain SSL certificate from Let's Encrypt
5. ✅ Configure automatic renewal
6. ✅ Restart Nginx with SSL enabled
7. ✅ Test certificate renewal

### Step 3: Enable SSL Configuration

After obtaining certificates, update the Nginx configuration:

```bash
# Edit docker-compose.yml
# Uncomment SSL volume mounts in nginx service:
# - /etc/letsencrypt:/etc/letsencrypt:ro
# - /var/www/certbot:/var/www/certbot:ro

# Edit infrastructure/nginx/conf.d/ssl.conf
# Uncomment all server blocks and SSL configuration

# Restart Nginx
docker-compose restart nginx
```

### Step 4: Verify SSL Configuration

```bash
# Test HTTPS access
curl -I https://app-socialselling.willianbvsanches.com

# Test HTTP redirect
curl -I http://app-socialselling.willianbvsanches.com

# Expected: 301 redirect to HTTPS
```

### Step 5: Test SSL Rating

Visit [SSL Labs](https://www.ssllabs.com/ssltest/) and test your domain:

```
https://www.ssllabs.com/ssltest/analyze.html?d=app-socialselling.willianbvsanches.com
```

**Expected Result:** A+ rating

---

## Manual Setup (Alternative)

If you prefer manual setup or need to troubleshoot:

### Install Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Stop Nginx Container

```bash
docker stop social-selling-nginx
```

### Obtain Certificate

```bash
sudo certbot certonly \
  --standalone \
  -d app-socialselling.willianbvsanches.com \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com \
  --preferred-challenges http
```

### Start Nginx Container

```bash
docker start social-selling-nginx
```

### Configure Auto-Renewal

```bash
# Add cron job for automatic renewal
echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'docker restart social-selling-nginx'" | sudo crontab -
```

### Test Renewal

```bash
sudo certbot renew --dry-run
```

---

## Certificate Management

### Check Certificate Status

```bash
# View all certificates
sudo certbot certificates

# Check expiry date
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/fullchain.pem
```

### Manual Renewal

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name app-socialselling.willianbvsanches.com
```

### Revoke Certificate

```bash
# If you need to revoke a certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/fullchain.pem
```

---

## Automatic Renewal

### Cron Configuration

The setup script configures a cron job that runs daily at 3 AM:

```cron
0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'docker restart social-selling-nginx'
```

### Renewal Hook

The renewal hook (`infrastructure/certbot/renewal-hooks.sh`) is executed after successful renewal and:

1. Restarts the Nginx Docker container
2. Logs renewal information
3. (Optional) Sends notifications

### Monitor Renewals

Check renewal logs:

```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## SSL Configuration Details

### TLS Protocols

- **Supported:** TLS 1.2, TLS 1.3
- **Disabled:** SSL 2.0, SSL 3.0, TLS 1.0, TLS 1.1 (insecure)

### Cipher Suites

Modern cipher suites for security and performance:

```nginx
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
```

### Security Headers

```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';
```

### OCSP Stapling

Enabled for improved SSL/TLS handshake performance:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 valid=300s;
```

---

## Troubleshooting

### Certificate Not Obtained

**Issue:** Certbot fails to obtain certificate

**Solutions:**
1. Check DNS configuration: `dig +short app-socialselling.willianbvsanches.com`
2. Ensure port 80 is open: `sudo ufw status`
3. Verify Nginx is stopped during acquisition: `docker ps`
4. Check Certbot logs: `sudo cat /var/log/letsencrypt/letsencrypt.log`

### Certificate Expired

**Issue:** Certificate expired and not renewed

**Solutions:**
1. Check cron job exists: `sudo crontab -l`
2. Test renewal manually: `sudo certbot renew --dry-run`
3. Check for renewal errors: `sudo cat /var/log/letsencrypt/letsencrypt.log`
4. Manually renew: `sudo certbot renew --force-renewal`

### HTTPS Not Working

**Issue:** HTTPS URL not accessible

**Solutions:**
1. Verify certificates exist: `sudo ls -la /etc/letsencrypt/live/app-socialselling.willianbvsanches.com/`
2. Check Nginx configuration: `docker exec social-selling-nginx nginx -t`
3. Verify SSL volumes mounted: `docker inspect social-selling-nginx`
4. Check Nginx logs: `docker logs social-selling-nginx`
5. Restart Nginx: `docker restart social-selling-nginx`

### HTTP Not Redirecting to HTTPS

**Issue:** HTTP requests not redirecting to HTTPS

**Solutions:**
1. Verify ssl.conf is uncommented
2. Check Nginx configuration: `docker exec social-selling-nginx cat /etc/nginx/conf.d/ssl.conf`
3. Reload Nginx: `docker exec social-selling-nginx nginx -s reload`

### Mixed Content Warnings

**Issue:** Browser shows mixed content warnings

**Solutions:**
1. Ensure all resources loaded via HTTPS
2. Update API URLs to use HTTPS
3. Check Content-Security-Policy header
4. Use relative URLs where possible

---

## Security Best Practices

### Certificate Security

1. **Restrict Access**
   ```bash
   sudo chmod 600 /etc/letsencrypt/live/*/privkey.pem
   ```

2. **Backup Certificates**
   ```bash
   sudo tar -czf letsencrypt-backup.tar.gz /etc/letsencrypt
   ```

3. **Monitor Expiry**
   - Set up alerts 30 days before expiry
   - Monitor renewal logs daily

### Nginx Security

1. **Hide Nginx Version**
   ```nginx
   server_tokens off;
   ```

2. **Limit Request Size**
   ```nginx
   client_max_body_size 10M;
   ```

3. **Enable Rate Limiting**
   - Already configured in `nginx.conf`
   - Adjust limits as needed

---

## Cost & Renewal

### Certificate Cost

- **Free** - Let's Encrypt certificates are completely free
- No hidden costs or premium features

### Renewal Frequency

- Certificates valid for **90 days**
- Auto-renewal attempts **30 days before expiry**
- Renewal runs **daily at 3 AM** (only renews if < 30 days remaining)

### Rate Limits

Let's Encrypt has rate limits to prevent abuse:

- **50 certificates per registered domain per week**
- **5 duplicate certificates per week**
- **300 new authorizations per account per 3 hours**

*For production use, these limits are very generous and unlikely to be hit.*

---

## Additional Resources

### Official Documentation

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

### Testing Tools

- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)
- [Certificate Decoder](https://www.sslshopper.com/certificate-decoder.html)

### Support

- [Certbot Community](https://community.letsencrypt.org/)
- [Nginx Forum](https://forum.nginx.org/)

---

## Next Steps

After SSL is configured:

1. ✅ **Verify HTTPS Access** - Test all endpoints
2. ✅ **Update Application URLs** - Change API_URL to HTTPS
3. ✅ **Configure Cloudflare** - Setup CDN and additional security (INFRA-008)
4. ✅ **Test Automatic Renewal** - Wait 24 hours and check logs
5. ✅ **Monitor Certificate Expiry** - Setup alerts
6. ✅ **Document for Team** - Share SSL setup process

---

**Task:** INFRA-007 - SSL Certificate Setup (Let's Encrypt)
**Status:** ✅ Complete
**Last Updated:** 2025-10-19
