# Server Setup Documentation
# Social Selling Platform - VPS Provisioning and Configuration

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: VPS Acquisition](#phase-1-vps-acquisition)
4. [Phase 2: Initial Server Access](#phase-2-initial-server-access)
5. [Phase 3: Security Hardening](#phase-3-security-hardening)
6. [Phase 4: Docker Installation](#phase-4-docker-installation)
7. [Phase 5: Verification](#phase-5-verification)
8. [Post-Setup Tasks](#post-setup-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

## Overview

This document provides step-by-step instructions for provisioning and configuring a Hostinger KVM 2 VPS for the Social Selling Platform. The setup includes Ubuntu 22.04 LTS, Docker, Docker Compose, and comprehensive security hardening.

**Estimated Time:** 4 hours

**Server Specifications:**
- Provider: Hostinger
- Plan: KVM 2
- vCPU: 2 cores
- RAM: 4GB
- Storage: 100GB SSD
- OS: Ubuntu 22.04 LTS
- Public IP: 82.197.93.247
- Hostname: social-selling-prod
- Domain: app-socialselling.willianbvsanches.com
- Monthly Cost: $18-25

## Prerequisites

Before starting, ensure you have:

1. **SSH Key Pair**
   ```bash
   # Generate SSH key if you don't have one
   ssh-keygen -t ed25519 -C "your_email@example.com"

   # View your public key
   cat ~/.ssh/id_ed25519.pub
   ```

2. **Hostinger Account**
   - Active account with payment method
   - Access to control panel

3. **Domain Configuration**
   - Domain registered: app-socialselling.willianbvsanches.com
   - Access to DNS settings

4. **Local Tools**
   - SSH client installed
   - Terminal access
   - Git installed (for cloning scripts)

## Phase 1: VPS Acquisition

**Estimated Time:** 30 minutes

### Step 1.1: Purchase VPS

1. Navigate to [Hostinger VPS Hosting](https://www.hostinger.com/vps-hosting)
2. Select **KVM 2** plan
3. Complete purchase process

### Step 1.2: Configure VPS

1. Access Hostinger control panel
2. Navigate to VPS section
3. Select **Create New VPS**
4. Configure:
   - OS: Ubuntu 22.04 LTS
   - Location: USA (or nearest data center)
   - Upload SSH public key (id_ed25519.pub)

### Step 1.3: Note Server Details

Record the following information:
- Public IP address: `82.197.93.247`
- Root password (temporary)
- Server hostname
- VNC console access URL (for emergency access)

## Phase 2: Initial Server Access

**Estimated Time:** 15 minutes

### Step 2.1: First SSH Connection

```bash
# Connect to server as root
ssh root@82.197.93.247

# Accept host key fingerprint (first time only)
# Verify fingerprint matches the one shown in Hostinger panel
```

### Step 2.2: Initial System Update

```bash
# Update package lists
apt update

# Upgrade all packages (this may take several minutes)
apt upgrade -y

# Reboot if kernel was updated
# reboot
```

### Step 2.3: Basic Configuration

```bash
# Set timezone to São Paulo
timedatectl set-timezone America/Sao_Paulo

# Verify timezone
timedatectl

# Set hostname
hostnamectl set-hostname social-selling-prod

# Add hostname to /etc/hosts
echo "82.197.93.247 social-selling-prod" >> /etc/hosts

# Verify hostname
hostname
hostname -f
```

## Phase 3: Security Hardening

**Estimated Time:** 60 minutes

### Step 3.1: Download Setup Scripts

```bash
# Clone repository or download scripts
mkdir -p /root/infrastructure/scripts
cd /root/infrastructure/scripts

# If you have git access, clone the repo
# git clone <repository-url>

# Or manually create the scripts from the files in:
# /infrastructure/scripts/setup-server.sh
```

### Step 3.2: Run Security Setup Script

```bash
# Make script executable
chmod +x setup-server.sh

# Run security setup (as root)
./setup-server.sh
```

**What this script does:**
- Creates `deploy` user with sudo privileges
- Copies SSH keys to deploy user
- Hardens SSH configuration:
  - Disables root login
  - Disables password authentication
  - Enables public key authentication only
  - Sets MaxAuthTries to 3
- Configures UFW firewall:
  - Default deny incoming
  - Allow SSH (22), HTTP (80), HTTPS (443)
- Installs and configures fail2ban:
  - SSH jail with maxretry=3
  - Ban time: 7200 seconds (2 hours)
- Enables automatic security updates
- Installs essential utilities

### Step 3.3: Test Deploy User Access

⚠️ **CRITICAL**: Before logging out of root, test deploy user access in a new terminal!

```bash
# In a NEW terminal window (keep root session open)
ssh deploy@82.197.93.247

# Test sudo access
sudo whoami
# Should output: root

# If this works, you can safely continue
# If not, use the root session to debug
```

## Phase 4: Docker Installation

**Estimated Time:** 45 minutes

### Step 4.1: Run Docker Installation Script

```bash
# Still as root, or switch to deploy with sudo
cd /root/infrastructure/scripts

# Make script executable
chmod +x install-docker.sh

# Run Docker installation
sudo ./install-docker.sh
```

**What this script does:**
- Removes old Docker versions
- Adds Docker's official APT repository
- Installs Docker Engine and Docker Compose plugin
- Configures Docker daemon:
  - Log rotation (10MB max, 3 files)
  - Storage driver: overlay2
  - Live restore enabled
  - Custom network pool: 172.20.0.0/16
- Adds deploy user to docker group
- Tests installation with hello-world

### Step 4.2: Activate Docker Group Membership

```bash
# Log out from current session
exit

# Log back in
ssh deploy@82.197.93.247

# Verify docker group membership
groups
# Should include: deploy sudo docker

# Test Docker access (without sudo)
docker ps
# Should work without permission error
```

## Phase 5: Verification

**Estimated Time:** 30 minutes

### Step 5.1: Run Verification Script

```bash
# As deploy user
cd /root/infrastructure/scripts

# Copy script to deploy user's home
sudo cp verify-setup.sh /home/deploy/
cd ~

# Make executable
chmod +x verify-setup.sh

# Run verification
./verify-setup.sh
```

### Step 5.2: Manual Verification Checks

#### Check 1: SSH Security

```bash
# Verify root login is disabled
sudo grep "PermitRootLogin" /etc/ssh/sshd_config.d/99-security.conf
# Should output: PermitRootLogin no

# Verify password auth is disabled
sudo grep "PasswordAuthentication" /etc/ssh/sshd_config.d/99-security.conf
# Should output: PasswordAuthentication no

# Test root login (should fail)
# In another terminal:
ssh root@82.197.93.247
# Should be denied
```

#### Check 2: Firewall

```bash
# Check UFW status
sudo ufw status verbose

# Should show:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

#### Check 3: fail2ban

```bash
# Check fail2ban status
sudo systemctl status fail2ban

# Check SSH jail
sudo fail2ban-client status sshd

# Should show SSH jail is active
```

#### Check 4: Docker

```bash
# Check Docker version
docker --version
# Should be >= 24.0

# Check Docker Compose
docker compose version
# Should be v2.x

# Test Docker functionality
docker run hello-world
# Should download and run successfully

# Check Docker daemon
docker info
# Verify settings match configuration
```

#### Check 5: Automatic Updates

```bash
# Check unattended-upgrades status
sudo systemctl status unattended-upgrades

# Verify configuration
cat /etc/apt/apt.conf.d/20auto-upgrades
```

## Post-Setup Tasks

### Configure DNS

Point your domain to the server:

1. Access your domain registrar's DNS settings
2. Add/Update A record:
   - Host: `app-socialselling` (or @)
   - Type: A
   - Value: `82.197.93.247`
   - TTL: 3600

3. Verify DNS propagation:
   ```bash
   dig app-socialselling.willianbvsanches.com
   nslookup app-socialselling.willianbvsanches.com
   ```

### Create Server Backup

1. Access Hostinger control panel
2. Navigate to VPS section
3. Create snapshot: "Initial Setup - [DATE]"
4. Keep this snapshot for disaster recovery

### Document Server Access

Create a secure document with:
- Server IP address
- SSH key location
- Deploy user credentials
- VNC console access URL
- Important configuration locations

Store securely (password manager, encrypted vault).

## Troubleshooting

### Cannot SSH as Deploy User

**Symptom:** `Permission denied (publickey)` error

**Solution:**
1. Access server via VNC console in Hostinger panel
2. Check SSH keys:
   ```bash
   ls -la /home/deploy/.ssh/
   cat /home/deploy/.ssh/authorized_keys
   ```
3. Verify permissions:
   ```bash
   chmod 700 /home/deploy/.ssh
   chmod 600 /home/deploy/.ssh/authorized_keys
   chown -R deploy:deploy /home/deploy/.ssh
   ```

### Locked Out of Server

**Symptom:** Cannot SSH to server at all

**Solution:**
1. Access via VNC console in Hostinger panel
2. Temporarily re-enable password auth:
   ```bash
   sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
   systemctl restart sshd
   ```
3. Set temporary password for deploy user:
   ```bash
   passwd deploy
   ```
4. SSH with password, fix issues
5. Re-disable password auth

### Docker Permission Denied

**Symptom:** `permission denied while trying to connect to Docker daemon`

**Solution:**
```bash
# Verify deploy user is in docker group
groups

# If not in docker group, add it:
sudo usermod -aG docker deploy

# Log out and back in
exit
ssh deploy@82.197.93.247

# Test again
docker ps
```

### UFW Blocked Required Port

**Symptom:** Cannot access service on specific port

**Solution:**
```bash
# Allow the port
sudo ufw allow <PORT>/tcp

# Check status
sudo ufw status

# Example: Allow port 8080
sudo ufw allow 8080/tcp comment 'Custom Service'
```

### fail2ban Not Starting

**Symptom:** `fail2ban.service failed to start`

**Solution:**
```bash
# Check logs
sudo journalctl -xeu fail2ban

# Test configuration
sudo fail2ban-client -t

# Restart service
sudo systemctl restart fail2ban
```

## Security Best Practices

### 1. SSH Key Management

- **Never share private keys**
- Keep backup of private key in secure location
- Use different keys for different servers
- Consider using SSH key passphrase
- Rotate keys periodically (every 6-12 months)

### 2. Regular Monitoring

```bash
# Check fail2ban bans
sudo fail2ban-client status sshd

# Review auth logs
sudo tail -f /var/log/auth.log

# Check for unauthorized access attempts
sudo lastb

# Review successful logins
sudo last
```

### 3. Maintenance Schedule

**Daily (Automated):**
- Security updates check and install
- Log rotation

**Weekly:**
- Review fail2ban logs
- Check disk space: `df -h`
- Review Docker container logs

**Monthly:**
- Full system update and reboot
- Review and update firewall rules
- Backup verification
- Security audit

**Quarterly:**
- SSH key rotation
- Password policy review
- Access audit
- Disaster recovery test

### 4. Emergency Contacts

Keep this information accessible:
- Hostinger support: https://www.hostinger.com/contact
- VNC console access URL
- Backup restoration procedure
- Emergency shutdown procedure

### 5. Backup Strategy

**What to backup:**
- `/etc` directory (configuration files)
- Docker volumes
- Application data
- SSL certificates
- Deployment keys

**Where to backup:**
- Hostinger snapshots (weekly)
- External backup service (daily)
- Local backup (before major changes)

## Next Steps

After completing this setup:

1. ✅ Verify all acceptance criteria in INFRA-001 task
2. 📝 Update task status to "Completed"
3. 🚀 Proceed to INFRA-002: Docker Compose Stack Setup
4. 📊 Document any deviations or issues encountered
5. 🔒 Store server credentials securely

## Related Documentation

- Task Specification: `/tasks/social-selling/sprints/INFRA-001_task.md`
- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Scripts README: `/infrastructure/scripts/README.md`
- Next Task: INFRA-002 (Docker Compose Stack Setup)

## Support

For questions or issues:
- Review this documentation
- Check `/infrastructure/scripts/README.md`
- Review server logs
- Contact: security@willianbvsanches.com

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Task:** INFRA-001
**Status:** Implementation Ready
**Prepared By:** Agent Executor
