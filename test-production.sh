#!/bin/bash

echo "🧪 Testing CNC Quote Production Deployment"
echo "=========================================="

BASE_URL="https://quote.frigate.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "Testing $description ($url)... "

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "^$expected_status$"; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

echo "🔍 Testing service availability..."
echo ""

# Test main application
test_endpoint "$BASE_URL" 200 "Main Application"

# Test API health
test_endpoint "$BASE_URL/api/health" 200 "API Health Check"

# Test CAD service
test_endpoint "$BASE_URL/cad/docs" 200 "CAD Service"

# Test Supabase dashboard (may redirect)
test_endpoint "$BASE_URL/db" 200 "Supabase Dashboard"

# Test Redis interface
test_endpoint "$BASE_URL/redis" 200 "Redis Interface"

echo ""
echo "📋 Manual Testing Checklist:"
echo "============================"
echo "1. 🌐 Visit $BASE_URL - Should load the main application"
echo "2. 📝 Try creating a quote - Upload CAD file and fill form"
echo "3. 🔍 Check quote status and DFM analysis"
echo "4. 👤 Test user registration/login"
echo "5. 💳 Test payment flow (if configured)"
echo "6. 📊 Check admin dashboard at $BASE_URL/admin"
echo ""
echo "🔧 If any tests fail:"
echo "- Check Cloudflare DNS configuration"
echo "- Verify SSL certificate status"
echo "- Check Docker container logs: docker-compose -f docker-compose.prod.yml logs"
echo "- Ensure all environment variables are set correctly"