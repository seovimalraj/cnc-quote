#!/bin/bash
# Marketplace Backend Deployment Script
# Deploys MinIO, Supabase migrations, and seeds demo data

set -e

echo "🚀 Deploying Marketplace Backend..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Copying from .env.marketplace.example${NC}"
    cp .env.marketplace.example .env.local
    echo -e "${YELLOW}⚠️  Please update .env.local with your credentials before continuing${NC}"
    exit 1
fi

# Load environment variables
source .env.local

echo -e "${BLUE}Step 1: Starting services with Docker Compose${NC}"
docker-compose up -d db redis minio

echo ""
echo -e "${BLUE}Step 2: Waiting for services to be healthy...${NC}"
sleep 10

# Check if PostgreSQL is ready
echo "Checking PostgreSQL..."
until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Check if Redis is ready
echo "Checking Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "Waiting for Redis to be ready..."
    sleep 2
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Check if MinIO is ready
echo "Checking MinIO..."
until curl -f http://localhost:9050/minio/health/live > /dev/null 2>&1; do
    echo "Waiting for MinIO to be ready..."
    sleep 2
done
echo -e "${GREEN}✅ MinIO is ready${NC}"

echo ""
echo -e "${BLUE}Step 3: Running database migrations${NC}"

# Check if npx supabase is available
if command -v npx &> /dev/null; then
    # Run migrations using Supabase CLI
    npx supabase db push
    echo -e "${GREEN}✅ Migrations applied${NC}"
else
    # Fallback: Apply migrations directly via psql
    echo "Supabase CLI not found, applying migrations directly..."
    docker-compose exec -T db psql -U postgres -d cnc_quote -f /docker-entrypoint-initdb.d/marketplace_schema.sql
    echo -e "${GREEN}✅ Migrations applied${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Seeding demo data${NC}"
cd scripts
pnpm tsx seed-marketplace-demo.ts
cd ..
echo -e "${GREEN}✅ Demo data seeded${NC}"

echo ""
echo -e "${BLUE}Step 5: Starting remaining services${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services available at:"
echo "  - Web App:           https://app.frigate.ai"
echo "  - API:               https://app.frigate.ai/api"
echo "  - MinIO Console:     https://app.frigate.ai/storage (or http://localhost:9051)"
echo "  - Supabase Studio:   https://app.frigate.ai/db"
echo ""
echo "Demo Data:"
echo "  - Orders: ORD-2024-001, ORD-2024-002, ORD-2024-003"
echo "  - RFQs: RFQ-2024-001 (with 5 pending bids)"
echo "  - Test Email: customer@example.com"
echo ""
echo "Next steps:"
echo "  1. Configure nginx to proxy /storage to MinIO"
echo "  2. Update Supabase RLS policies if needed"
echo "  3. Test file uploads at /instant-quote-v2"
echo "  4. Review bids at /admin/bids"
echo ""
