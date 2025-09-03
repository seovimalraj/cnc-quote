#!/bin/bash
set -e

echo "🚀 Starting CNC Quote Platform Locally..."

# Check if Redis is running
if ! docker ps | grep -q redis; then
    echo "📦 Starting Redis..."
    docker run --name redis -p 6379:6379 -d redis
    sleep 2
fi

# Start the API service
echo "🔧 Starting API service on port 3001..."
cd apps/api
PORT=3001 pnpm start &
API_PID=$!
cd ../..

# Start the CAD service
echo "🔧 Starting CAD service on port 3002..."
cd apps/cad-service
python -m uvicorn main:app --host 0.0.0.0 --port 3002 &
CAD_PID=$!
cd ../..

# Start the web application
echo "🌐 Starting web application on port 3000..."
cd apps/web
PORT=3000 pnpm dev &
WEB_PID=$!
cd ../..

echo "✅ All services started!"
echo ""
echo "🌍 Access your application at:"
echo "  - Web UI: http://localhost:3000"
echo "  - API: http://localhost:3001"
echo "  - CAD Service: http://localhost:3002"
echo ""
echo "🛑 To stop all services, press Ctrl+C"

# Wait for all processes
wait $API_PID $CAD_PID $WEB_PID
