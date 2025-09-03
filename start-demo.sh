#!/bin/bash

# CNC Quote Platform Demo Startup Script

echo "🚀 Starting CNC Quote Platform Demo..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Start the web application
echo "🌐 Starting the web application..."
echo ""
echo "📱 Demo Pages Available:"
echo "   • Dashboard: http://localhost:3000/"
echo "   • Quote Wizard: http://localhost:3000/widget"
echo "   • Admin Dashboard: http://localhost:3000/admin"
echo ""
echo "🎯 Demo Features:"
echo "   • Interactive quote creation workflow"
echo "   • Professional admin dashboard"
echo "   • Real-time price calculations"
echo "   • Quote management system"
echo "   • Mobile-responsive design"
echo ""
echo "📋 Demo Data Includes:"
echo "   • 4 sample quotes from different companies"
echo "   • Multiple material options with pricing"
echo "   • Various surface finishes and tolerances"
echo "   • Complete quote workflow"
echo ""
echo "🔥 Starting development server..."

cd apps/web && pnpm dev
