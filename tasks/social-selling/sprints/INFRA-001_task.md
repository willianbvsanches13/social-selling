# INFRA-001: VPS Provisioning and Initial Setup

**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 1
**Dependencies:** None
**Domain:** Infrastructure & DevOps

---

## Overview

Set up Hostinger KVM 2 VPS with Ubuntu 22.04, Docker, Docker Compose, and comprehensive security configuration. This is the foundation for the entire platform infrastructure.

---

## Data Models

### Server Configuration
```yaml
# Server Specifications
vps_provider: Hostinger
vps_plan: KVM 2
vcpu: 2
ram: 4GB
storage: 100GB SSD
os: Ubuntu 22.04 LTS
monthly_cost: $18-25

# Network Configuration
public_ip: 82.197.93.247
hostname: social-selling-prod
domain: app-socialselling.willianbvsanches.com

# Security Configuration
ssh_port: 22
allowed_ssh_keys: [id_rsa.pub, id_ed25519.pub]
password_auth: disabled
root_login: disabled
firewall_rules:
  - port: 22, protocol: tcp, source: any, description: "SSH"
  - port: 80, protocol: tcp, source: any, description: "HTTP"
  - port: 443, protocol: tcp, source: any, description: "HTTPS"
  - default: deny
```

---

## Implementation Approach

### Phase 1: VPS Acquisition (30 minutes)

```bash
# Manual Steps:
# 1. Navigate to Hostinger control panel
# 2. Purchase KVM 2 VPS (https://www.hostinger.com/vps-hosting)
# 3. Select Ubuntu 22.04 LTS as operating system
# 4. Configure SSH key during setup (upload id_rsa.pub)
# 5. Note down:
#    - Public IP address
#    - Root password (temporary)
#    - Server hostname
```

### Phase 2: Initial Server Access (15 minutes)

```bash
# Test SSH connection
ssh root@82.197.93.247

# Update system packages
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone America/Sao_Paulo

# Set hostname
hostnamectl set-hostname social-selling-prod

# Add hostname to /etc/hosts
echo "82.197.93.247 social-selling-prod" >> /etc/hosts
```

### Phase 3: Security Hardening (60 minutes)

```bash
#!/bin/bash
# File: /infrastructure/scripts/setup-server.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting server security setup...${NC}"

# 1. Create non-root user with sudo privileges
echo -e "${YELLOW}Creating deployment user...${NC}"
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy

# Set up SSH directory for deploy user
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# 2. Configure SSH security
echo -e "${YELLOW}Hardening SSH configuration...${NC}"
cat > /etc/ssh/sshd_config.d/99-security.conf << 'EOF'
# SSH Security Configuration
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
MaxAuthTries 3
MaxSessions 2
LoginGraceTime 30
EOF

# Restart SSH to apply changes
systemctl restart sshd

# 3. Configure UFW firewall
echo -e "${YELLOW}Configuring UFW firewall...${NC}"
apt install -y ufw

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall (non-interactive)
echo "y" | ufw enable

# Show firewall status
ufw status verbose

# 4. Install and configure fail2ban
echo -e "${YELLOW}Installing fail2ban...${NC}"
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = security@willianbvsanches.com
sendername = Fail2Ban-SocialSelling

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
EOF

systemctl enable fail2ban
systemctl start fail2ban

# 5. Configure automatic security updates
echo -e "${YELLOW}Enabling automatic security updates...${NC}"
apt install -y unattended-upgrades

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

# 6. Install essential utilities
echo -e "${YELLOW}Installing essential utilities...${NC}"
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    dnsutils \
    ca-certificates \
    gnupg \
    lsb-release

echo -e "${GREEN}Server security setup completed!${NC}"
echo -e "${YELLOW}IMPORTANT: Test SSH access with deploy user before logging out!${NC}"
```

### Phase 4: Docker Installation (45 minutes)

```bash
#!/bin/bash
# File: /infrastructure/scripts/install-docker.sh

set -e

echo "Installing Docker and Docker Compose..."

# 1. Remove old Docker versions (if any)
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Set up Docker's apt repository
apt update
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Add deploy user to docker group
usermod -aG docker deploy

# 5. Configure Docker daemon
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ]
}
EOF

# 6. Start and enable Docker
systemctl enable docker
systemctl start docker

# 7. Verify installation
docker --version
docker compose version

# 8. Test Docker with hello-world
docker run hello-world

echo "Docker installation completed successfully!"
echo "Deploy user added to docker group. Log out and back in for group changes to take effect."
```

### Phase 5: Verification (30 minutes)

```bash
#!/bin/bash
# File: /infrastructure/scripts/verify-setup.sh

set -e

echo "=== Server Setup Verification ==="
echo ""

# Check OS version
echo "1. Operating System:"
lsb_release -a
echo ""

# Check system resources
echo "2. System Resources:"
echo "CPU:"
lscpu | grep "Model name"
echo "Memory:"
free -h
echo "Disk:"
df -h /
echo ""

# Check Docker
echo "3. Docker Installation:"
docker --version
docker compose version
docker info | grep "Server Version"
echo ""

# Check UFW firewall
echo "4. Firewall Status:"
ufw status verbose
echo ""

# Check fail2ban
echo "5. Fail2ban Status:"
systemctl status fail2ban --no-pager
fail2ban-client status sshd
echo ""

# Check SSH configuration
echo "6. SSH Configuration:"
grep "PermitRootLogin" /etc/ssh/sshd_config.d/99-security.conf
grep "PasswordAuthentication" /etc/ssh/sshd_config.d/99-security.conf
echo ""

# Check automatic updates
echo "7. Automatic Updates:"
systemctl status unattended-upgrades --no-pager
echo ""

# Check users
echo "8. System Users:"
grep "deploy" /etc/passwd
groups deploy
echo ""

# Network configuration
echo "9. Network Configuration:"
ip addr show
echo ""

echo "=== Verification Complete ==="
```

---

## API Endpoints

N/A - This is an infrastructure task

---

## Files to Create

```
/infrastructure/
├── terraform/
│   ├── providers.tf
│   └── modules/
│       └── vps/
│           └── main.tf
├── scripts/
│   ├── setup-server.sh          # Main security setup script
│   ├── install-docker.sh         # Docker installation script
│   ├── verify-setup.sh           # Verification script
│   └── README.md                 # Script documentation
└── docs/
    └── server-setup.md           # Detailed setup documentation
```

### /infrastructure/terraform/providers.tf
```hcl
# Terraform configuration for infrastructure management
terraform {
  required_version = ">= 1.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

# Provider configuration
provider "local" {}
```

### /infrastructure/terraform/modules/vps/main.tf
```hcl
# VPS Configuration as Code
# Note: Hostinger doesn't have Terraform provider, this is for documentation

variable "vps_config" {
  description = "VPS configuration parameters"
  type = object({
    provider     = string
    plan         = string
    vcpu         = number
    ram          = string
    storage      = string
    os           = string
    region       = string
    monthly_cost = string
  })

  default = {
    provider     = "Hostinger"
    plan         = "KVM 2"
    vcpu         = 2
    ram          = "4GB"
    storage      = "100GB SSD"
    os           = "Ubuntu 22.04 LTS"
    region       = "USA"
    monthly_cost = "$18-25"
  }
}

output "vps_specifications" {
  value = var.vps_config
}
```

### /infrastructure/scripts/README.md
```markdown
# Infrastructure Setup Scripts

## Overview
This directory contains scripts for setting up and maintaining the Social Selling Platform infrastructure.

## Scripts

### setup-server.sh
Initial server security hardening and configuration.

**Usage:**
```bash
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**What it does:**
- Creates non-root deploy user
- Configures SSH security
- Sets up UFW firewall
- Installs and configures fail2ban
- Enables automatic security updates
- Installs essential utilities

### install-docker.sh
Installs Docker and Docker Compose.

**Usage:**
```bash
chmod +x install-docker.sh
sudo ./install-docker.sh
```

### verify-setup.sh
Verifies server configuration.

**Usage:**
```bash
chmod +x verify-setup.sh
./verify-setup.sh
```

## Execution Order

1. setup-server.sh (as root)
2. install-docker.sh (as root)
3. verify-setup.sh (as deploy user)

## Important Notes

- Always test SSH access with deploy user before logging out of root
- Keep a backup of your SSH private key
- Document the server's public IP address
- Change default passwords immediately
```

---

## Dependencies

**Prerequisites:**
- Hostinger account with payment method
- SSH key pair generated locally (`ssh-keygen -t ed25519`)
- Domain registered (app-socialselling.willianbvsanches.com)

**Blocks:**
- INFRA-002 (Docker Compose Stack Setup)
- All subsequent infrastructure tasks

---

## Acceptance Criteria

- [x] VPS accessible via SSH key only (no password authentication)
- [x] Docker Engine version >= 24.0 installed and running
- [x] Docker Compose v2 installed (plugin mode)
- [x] UFW firewall active with rules:
  - [x] Port 22 (SSH) open
  - [x] Port 80 (HTTP) open
  - [x] Port 443 (HTTPS) open
  - [x] All other ports blocked
- [x] fail2ban installed and monitoring SSH (maxretry=3, bantime=7200s)
- [x] Automatic security updates enabled with daily checks
- [x] Deploy user created with sudo privileges and docker group membership
- [x] Root login disabled via SSH
- [x] Password authentication disabled via SSH
- [x] Can execute `docker ps` without sudo as deploy user
- [x] Server hostname set to `social-selling-prod`
- [x] System timezone configured correctly
- [x] All verification checks pass (`verify-setup.sh`)

---

## Testing Procedure

```bash
# 1. Test SSH access with deploy user
ssh deploy@<VPS_PUBLIC_IP>

# 2. Test sudo access
sudo whoami  # Should output: root

# 3. Test Docker access
docker ps
docker compose version

# 4. Test firewall
sudo ufw status verbose

# 5. Test fail2ban
sudo fail2ban-client status sshd

# 6. Attempt root login (should fail)
ssh root@<VPS_PUBLIC_IP>  # Should be denied

# 7. Run verification script
./infrastructure/scripts/verify-setup.sh
```

---

## Rollback Plan

If setup fails:

```bash
# 1. Access via Hostinger control panel (VNC console)
# 2. Re-enable password authentication temporarily
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 3. Re-enable root login
sudo sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 4. Debug issues
# 5. Re-run setup scripts after fixing
```

---

## Security Notes

1. **SSH Keys**: Keep private keys secure, never commit to git
2. **fail2ban**: Monitor ban logs at `/var/log/fail2ban.log`
3. **Firewall**: Test rules before enabling to avoid lockout
4. **Updates**: Automatic updates configured to reboot at 3 AM if needed
5. **Backup**: Keep VPS snapshot in Hostinger panel after successful setup

---

## Cost Estimate

- **VPS (Hostinger KVM 2):** $18-25/month
- **Domain (already registered):** $0
- **Time Investment:** 4 hours
- **Total Monthly Cost:** $18-25

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Next Task: INFRA-002 (Docker Compose Stack Setup)

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
