#!/bin/bash
# File: /infrastructure/scripts/setup-server.sh
# Description: Server security hardening and initial configuration
# Usage: chmod +x setup-server.sh && sudo ./setup-server.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting server security setup...${NC}"

# 1. Create non-root user with sudo privileges
echo -e "${YELLOW}Creating deployment user...${NC}"
if id "deploy" &>/dev/null; then
    echo -e "${GREEN}User 'deploy' already exists, skipping creation...${NC}"
else
    useradd -m -s /bin/bash deploy
    echo -e "${GREEN}User 'deploy' created successfully${NC}"
fi

# Ensure deploy user is in sudo group
usermod -aG sudo deploy

# Configure passwordless sudo for deploy user
echo -e "${YELLOW}Configuring passwordless sudo...${NC}"
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

# Set up SSH directory for deploy user
echo -e "${YELLOW}Configuring SSH access for deploy user...${NC}"
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chmod 600 /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    echo -e "${GREEN}SSH keys copied successfully${NC}"
else
    echo -e "${RED}Warning: /root/.ssh/authorized_keys not found!${NC}"
fi

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
echo -e "${YELLOW}Test command: ssh deploy@\$(hostname -I | awk '{print \$1}')${NC}"
