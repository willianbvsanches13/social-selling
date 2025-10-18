#!/bin/bash
# File: /infrastructure/scripts/verify-setup.sh
# Description: Verify server configuration and setup
# Usage: chmod +x verify-setup.sh && ./verify-setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Server Setup Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check OS version
echo -e "${GREEN}1. Operating System:${NC}"
lsb_release -a
echo ""

# Check system resources
echo -e "${GREEN}2. System Resources:${NC}"
echo -e "${YELLOW}CPU:${NC}"
lscpu | grep "Model name"
lscpu | grep "CPU(s):"
echo ""
echo -e "${YELLOW}Memory:${NC}"
free -h
echo ""
echo -e "${YELLOW}Disk:${NC}"
df -h /
echo ""

# Check Docker
echo -e "${GREEN}3. Docker Installation:${NC}"
docker --version
docker compose version
docker info | grep "Server Version"
docker info | grep "Storage Driver"
echo ""

# Check UFW firewall
echo -e "${GREEN}4. Firewall Status:${NC}"
sudo ufw status verbose
echo ""

# Check fail2ban
echo -e "${GREEN}5. Fail2ban Status:${NC}"
sudo systemctl status fail2ban --no-pager | head -n 10
echo ""
echo -e "${YELLOW}SSH Jail Status:${NC}"
sudo fail2ban-client status sshd
echo ""

# Check SSH configuration
echo -e "${GREEN}6. SSH Configuration:${NC}"
echo -e "${YELLOW}Root Login:${NC}"
sudo grep "PermitRootLogin" /etc/ssh/sshd_config.d/99-security.conf || echo "Not configured"
echo -e "${YELLOW}Password Authentication:${NC}"
sudo grep "PasswordAuthentication" /etc/ssh/sshd_config.d/99-security.conf || echo "Not configured"
echo -e "${YELLOW}Public Key Authentication:${NC}"
sudo grep "PubkeyAuthentication" /etc/ssh/sshd_config.d/99-security.conf || echo "Not configured"
echo ""

# Check automatic updates
echo -e "${GREEN}7. Automatic Updates:${NC}"
sudo systemctl status unattended-upgrades --no-pager | head -n 10
echo ""
echo -e "${YELLOW}Update Configuration:${NC}"
cat /etc/apt/apt.conf.d/20auto-upgrades
echo ""

# Check users
echo -e "${GREEN}8. System Users:${NC}"
echo -e "${YELLOW}Deploy User:${NC}"
grep "deploy" /etc/passwd || echo "Deploy user not found"
echo ""
echo -e "${YELLOW}Deploy User Groups:${NC}"
groups deploy
echo ""

# Check hostname
echo -e "${GREEN}9. Hostname Configuration:${NC}"
hostname
echo ""

# Network configuration
echo -e "${GREEN}10. Network Configuration:${NC}"
echo -e "${YELLOW}IP Addresses:${NC}"
ip addr show | grep "inet " | grep -v "127.0.0.1"
echo ""

# Docker test
echo -e "${GREEN}11. Docker Functionality Test:${NC}"
echo -e "${YELLOW}Testing docker ps command...${NC}"
docker ps
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check critical items
ERRORS=0

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ Docker is installed${NC}"
fi

# Check if UFW is active
if sudo ufw status | grep -q "Status: active"; then
    echo -e "${GREEN}✓ UFW firewall is active${NC}"
else
    echo -e "${RED}✗ UFW firewall is not active${NC}"
    ((ERRORS++))
fi

# Check if fail2ban is running
if sudo systemctl is-active --quiet fail2ban; then
    echo -e "${GREEN}✓ Fail2ban is running${NC}"
else
    echo -e "${RED}✗ Fail2ban is not running${NC}"
    ((ERRORS++))
fi

# Check if deploy user exists
if id "deploy" &>/dev/null; then
    echo -e "${GREEN}✓ Deploy user exists${NC}"
else
    echo -e "${RED}✗ Deploy user does not exist${NC}"
    ((ERRORS++))
fi

# Check if deploy user is in docker group
if groups deploy | grep -q docker; then
    echo -e "${GREEN}✓ Deploy user is in docker group${NC}"
else
    echo -e "${RED}✗ Deploy user is not in docker group${NC}"
    ((ERRORS++))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   All checks passed! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}   $ERRORS error(s) found! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
