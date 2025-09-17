#!/bin/bash
set -e

echo "🚀 Deploying CNC Quote Platform to quote.frigate.ai..."
echo "======================================================"

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Build and start all services
echo "🏗️ Building and starting production services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check nginx
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ Nginx is healthy"
else
    echo "❌ Nginx health check failed"
fi

# Check web service
if curl -f http://localhost:3000/api/health &> /dev/null; then
    echo "✅ Web service is healthy"
else
    echo "❌ Web service health check failed"
fi

# Check API service
if curl -f http://localhost:3001/health &> /dev/null; then
    echo "✅ API service is healthy"
else
    echo "❌ API service health check failed"
fi

# Check CAD service
if curl -f http://localhost:8001/docs &> /dev/null; then
    echo "✅ CAD service is healthy"
else
    echo "❌ CAD service health check failed"
fi

echo ""
echo "🎉 Deployment completed!"
echo "=========================="
echo ""
echo "🌐 Your application is now running at:"
echo "  - Main App:     https://quote.frigate.ai"
echo "  - API:          https://quote.frigate.ai/api"
echo "  - CAD Service:  https://quote.frigate.ai/cad"
echo "  - Supabase DB:  https://quote.frigate.ai/db"
echo "  - Redis UI:     https://quote.frigate.ai/redis"
echo ""
echo "📋 Next steps:"
echo "1. Configure Cloudflare to point quote.frigate.ai to your server IP"
echo "2. Enable SSL in Cloudflare (should be automatic)"
echo "3. Test all endpoints work correctly"
echo "4. Update any remaining placeholder credentials (Stripe, email, etc.)"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "  - Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  - Update:       docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d"