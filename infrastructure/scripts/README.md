# Infrastructure Setup Scripts

## Overview
This directory contains scripts for setting up and maintaining the Social Selling Platform infrastructure on a Hostinger KVM 2 VPS running Ubuntu 22.04 LTS.

## Scripts

### setup-server.sh
Initial server security hardening and configuration.

**Usage:**
```bash
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**What it does:**
- Creates non-root deploy user with sudo privileges
- Configures SSH security (disables root login and password authentication)
- Sets up UFW firewall with rules for SSH (22), HTTP (80), and HTTPS (443)
- Installs and configures fail2ban for SSH brute-force protection
- Enables automatic security updates with daily checks
- Installs essential utilities (curl, wget, git, vim, htop, etc.)

**Security Features:**
- PermitRootLogin: no
- PasswordAuthentication: no
- MaxAuthTries: 3
- fail2ban SSH jail: maxretry=3, bantime=7200s
- Automatic security updates with reboot at 3 AM if needed

### install-docker.sh
Installs Docker Engine and Docker Compose plugin.

**Usage:**
```bash
chmod +x install-docker.sh
sudo ./install-docker.sh
```

**What it does:**
- Removes old Docker versions
- Adds Docker's official apt repository
- Installs Docker Engine, CLI, containerd, buildx, and compose plugins
- Configures Docker daemon with:
  - Log rotation (max-size: 10m, max-file: 3)
  - Storage driver: overlay2
  - Live restore enabled
  - Custom network pool: 172.20.0.0/16
- Adds deploy user to docker group
- Verifies installation with hello-world container

### verify-setup.sh
Comprehensive verification script to check server configuration.

**Usage:**
```bash
chmod +x verify-setup.sh
./verify-setup.sh
```

**What it checks:**
1. Operating System (Ubuntu version)
2. System Resources (CPU, RAM, Disk)
3. Docker Installation (version and configuration)
4. UFW Firewall (status and rules)
5. fail2ban (service status and SSH jail)
6. SSH Configuration (security settings)
7. Automatic Updates (service status)
8. System Users (deploy user and groups)
9. Hostname Configuration
10. Network Configuration (IP addresses)
11. Docker Functionality (docker ps test)

**Exit Codes:**
- 0: All checks passed
- 1: One or more checks failed

## Execution Order

Follow this sequence for initial server setup:

1. **setup-server.sh** (as root)
   - Run this first to secure the server
   - Creates deploy user and hardens SSH

2. **install-docker.sh** (as root)
   - Run this after server setup
   - Installs Docker and Docker Compose

3. **verify-setup.sh** (as deploy user)
   - Run this to verify everything is configured correctly
   - Can be run multiple times without side effects

## Important Notes

### Before Running Scripts

1. **SSH Key Required**: Ensure your public SSH key is added to the root user's authorized_keys
2. **Backup Access**: Keep VNC/console access to the server in case SSH gets misconfigured
3. **Test Deploy User**: Before logging out of root, test SSH access with deploy user in another terminal

### After Running setup-server.sh

⚠️ **CRITICAL**: Test SSH access with deploy user before logging out of root session!

```bash
# In a new terminal window
ssh deploy@<VPS_IP>
sudo whoami  # Should output: root
```

If you can't login as deploy, use VNC console to fix the issue.

### After Running install-docker.sh

The deploy user needs to log out and back in for docker group membership to take effect:

```bash
# Log out
exit

# Log back in
ssh deploy@<VPS_IP>

# Test docker access
docker ps  # Should work without sudo
```

## Manual Steps Required

These scripts do NOT handle:

1. **VPS Provisioning**: Purchase and provision Hostinger KVM 2 VPS manually
2. **Initial Server Access**: First SSH connection and system update
3. **DNS Configuration**: Point domain to VPS IP address
4. **SSL Certificates**: Install and configure Let's Encrypt certificates

## Server Specifications

**VPS Details:**
- Provider: Hostinger
- Plan: KVM 2
- vCPU: 2
- RAM: 4GB
- Storage: 100GB SSD
- OS: Ubuntu 22.04 LTS
- Public IP: 82.197.93.247
- Hostname: social-selling-prod
- Domain: app-socialselling.willianbvsanches.com

## Security Checklist

After running all scripts, verify:

- [ ] Can SSH as deploy user with key authentication
- [ ] Cannot SSH as root
- [ ] Cannot SSH with password
- [ ] UFW firewall is active
- [ ] Ports 22, 80, 443 are open
- [ ] fail2ban is monitoring SSH
- [ ] Automatic updates are enabled
- [ ] Docker is installed and running
- [ ] Deploy user can run docker without sudo
- [ ] Hostname is set correctly

## Troubleshooting

### Can't SSH as deploy user

1. Access server via VNC console in Hostinger panel
2. Check SSH configuration:
   ```bash
   cat /etc/ssh/sshd_config.d/99-security.conf
   ```
3. Verify deploy user's authorized_keys:
   ```bash
   ls -la /home/deploy/.ssh/
   cat /home/deploy/.ssh/authorized_keys
   ```

### Docker permission denied

1. Verify deploy user is in docker group:
   ```bash
   groups deploy
   ```
2. Log out and back in to refresh group membership

### UFW locked me out

1. Access via VNC console
2. Temporarily disable UFW:
   ```bash
   sudo ufw disable
   ```
3. Fix the issue and re-enable

## Related Documentation

- Main Task: `/tasks/social-selling/sprints/INFRA-001_task.md`
- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Next Task: INFRA-002 (Docker Compose Stack Setup)

## Support

For issues or questions:
- Review the main task documentation
- Check server logs: `/var/log/auth.log`, `/var/log/fail2ban.log`
- Contact: security@willianbvsanches.com

---

**Last Updated:** 2025-10-18
**Task:** INFRA-001
**Status:** Implementation Ready
