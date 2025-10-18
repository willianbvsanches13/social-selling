#!/bin/bash
# File: /infrastructure/scripts/install-docker.sh
# Description: Install Docker Engine and Docker Compose
# Usage: chmod +x install-docker.sh && sudo ./install-docker.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing Docker and Docker Compose...${NC}"

# 1. Remove old Docker versions (if any)
echo -e "${YELLOW}Removing old Docker versions...${NC}"
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Set up Docker's apt repository
echo -e "${YELLOW}Setting up Docker repository...${NC}"
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
echo -e "${YELLOW}Installing Docker Engine...${NC}"
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Add deploy user to docker group
echo -e "${YELLOW}Adding deploy user to docker group...${NC}"
usermod -aG docker deploy

# 5. Configure Docker daemon
echo -e "${YELLOW}Configuring Docker daemon...${NC}"
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
echo -e "${YELLOW}Starting Docker service...${NC}"
systemctl enable docker
systemctl start docker

# 7. Verify installation
echo -e "${YELLOW}Verifying Docker installation...${NC}"
docker --version
docker compose version

# 8. Test Docker with hello-world
echo -e "${YELLOW}Testing Docker with hello-world container...${NC}"
docker run hello-world

echo ""
echo -e "${GREEN}Docker installation completed successfully!${NC}"
echo -e "${YELLOW}Deploy user added to docker group.${NC}"
echo -e "${YELLOW}Log out and back in for group changes to take effect.${NC}"
echo ""
echo -e "${GREEN}Installed versions:${NC}"
docker --version
docker compose version
