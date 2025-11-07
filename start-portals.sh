#!/bin/bash

# CNC Quote Portal Quick Start Script
# Starts all portals for demo/testing

set -e

echo "🚀 Starting CNC Quote Portals..."
echo "================================"

cd /root/cnc-quote

# Check if API is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ API already running on port 3001"
else
    echo "📦 Starting API server on port 3001..."
    cd apps/api
    pnpm dev > /tmp/api.log 2>&1 &
    API_PID=$!
    echo "   API PID: $API_PID"
    cd ../..
fi

# Check if Web is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Web already running on port 3000"
else
    echo "🌐 Starting Web server on port 3000..."
    cd apps/web
    pnpm dev > /tmp/web.log 2>&1 &
    WEB_PID=$!
    echo "   Web PID: $WEB_PID"
    cd ../..
fi

echo ""
echo "✅ Servers started!"
echo "================================"
echo ""
echo "📍 Portal URLs:"
echo ""
echo "🔹 Admin Portal:"
echo "   http://localhost:3000/admin/login"
echo "   Login: admin@cncquote.com / Demo123!"
echo ""
echo "🔹 Customer Portal:"
echo "   http://localhost:3000/portal/dashboard"
echo "   Login: customer@acme.com / Demo123!"
echo "   or: john@acme.com / Demo123!"
echo ""
echo "🔹 Supplier Portal:"
echo "   http://localhost:3000/supplier/dashboard"  
echo "   Login: supplier@precision.com / Demo123!"
echo "   or: sarah@precision.com / Demo123!"
echo ""
echo "================================"
echo ""
echo "📋 Logs:"
echo "   API: tail -f /tmp/api.log"
echo "   Web: tail -f /tmp/web.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $API_PID $WEB_PID"
echo "   or: pkill -f 'pnpm dev'"
echo ""
echo "📖 Full documentation: /root/cnc-quote/PORTAL_LOGIN_GUIDE.md"
echo ""
