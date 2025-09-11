#!/bin/bash
set -e

echo "🚀 Starting CNC Quote Platform Locally..."
echo "========================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please copy .env.example to .env and configure it."
    exit 1
fi

echo "✅ .env file found"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package
echo "📦 Building shared package..."
cd packages/shared
pnpm install
pnpm build
cd ..

# Check if Redis is running
if ! docker ps | grep -q redis; then
    echo "📦 Starting Redis..."
    docker run --name redis -p 6379:6379 -d redis
    sleep 2
fi

# Start the API service
echo "🔧 Starting API service on port 10000..."
cd apps/api
PORT=10000 pnpm start &
API_PID=$!
cd ../..

# Start the CAD service
echo "🔧 Starting CAD service on port 8001..."
cd apps/cad-service
python -m uvicorn main:app --host 0.0.0.0 --port 8001 &
CAD_PID=$!
cd ../..

# Start the web application
echo "🌐 Starting web application on port 3000..."
cd apps/web
PORT=3000 pnpm dev &
WEB_PID=$!
cd ../..

echo "✅ All services started!"
echo "========================"
echo ""
echo "🌍 Access your application at:"
echo "  - Web UI:      http://localhost:3000"
echo "  - API:         http://localhost:10000"
echo "  - CAD Service: http://localhost:8001"
echo "  - Redis:       localhost:6379"
echo ""
echo "📋 Useful links:"
echo "  - API Docs:    http://localhost:10000/docs"
echo "  - CAD Docs:    http://localhost:8001/docs"
echo "  - API Health:  curl http://localhost:10000/health"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo "   Or run: kill $API_PID $CAD_PID $WEB_PID"

# Wait for all processes
wait $API_PID $CAD_PID $WEB_PID
