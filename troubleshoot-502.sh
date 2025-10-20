#!/bin/bash

echo "================================================"
echo "🔍 Social Selling - Troubleshooting 502 Error"
echo "================================================"
echo ""

echo "1️⃣ Checking Docker Containers Status..."
echo "----------------------------------------"
docker ps -a --filter "name=social-selling" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2️⃣ Checking Backend Container Logs (last 30 lines)..."
echo "----------------------------------------"
docker logs social-selling-backend --tail 30 2>&1
echo ""

echo "3️⃣ Checking Nginx Container Logs (last 20 lines)..."
echo "----------------------------------------"
docker logs social-selling-nginx --tail 20 2>&1
echo ""

echo "4️⃣ Testing Backend Health from Inside Nginx Container..."
echo "----------------------------------------"
docker exec social-selling-nginx wget -O- http://backend:4000/health 2>&1 || echo "❌ Failed to connect to backend"
echo ""

echo "5️⃣ Checking Backend Environment Variables..."
echo "----------------------------------------"
docker exec social-selling-backend printenv | grep -E "(NODE_ENV|PORT|DATABASE|REDIS|POSTGRES)" | sort
echo ""

echo "6️⃣ Checking PostgreSQL Health..."
echo "----------------------------------------"
docker exec social-selling-postgres pg_isready -U postgres 2>&1 || echo "❌ PostgreSQL not ready"
echo ""

echo "7️⃣ Checking Redis Health..."
echo "----------------------------------------"
docker exec social-selling-redis redis-cli ping 2>&1 || echo "❌ Redis not responding"
echo ""

echo "8️⃣ Checking Network Connectivity..."
echo "----------------------------------------"
docker network inspect social-selling-network | grep -A 5 "social-selling-backend" 2>&1 || echo "❌ Network issue"
echo ""

echo "9️⃣ Checking if Backend Port 4000 is Listening..."
echo "----------------------------------------"
docker exec social-selling-backend netstat -tuln | grep 4000 2>&1 || echo "❌ Port 4000 not listening"
echo ""

echo "🔟 Checking Disk Space..."
echo "----------------------------------------"
df -h | grep -E "(Filesystem|/$)"
echo ""

echo "================================================"
echo "✅ Diagnosis Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Check if backend container is running (status should be 'Up')"
echo "2. Look for errors in backend logs"
echo "3. Verify environment variables are set correctly"
echo "4. Check if PostgreSQL and Redis are healthy"
echo "5. Verify backend is listening on port 4000"
echo ""
echo "To restart services:"
echo "  docker compose restart backend"
echo "  docker compose restart nginx"
echo ""
echo "To see live logs:"
echo "  docker logs -f social-selling-backend"
echo ""
