#!/bin/bash
set -e

echo "🚀 Starting CNC Quote Platform Deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package
echo "📦 Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Build API
echo "🔧 Building API..."
cd apps/api
pnpm install
pnpm build
cd ../..

# Build web app
echo "🌐 Building web application..."
cd apps/web
pnpm install
# Skip type checking for faster build
SKIP_ENV_VALIDATION=true NODE_ENV=production pnpm build
cd ../..

echo "✅ Build completed!"
echo "📋 Deployment Summary:"
echo "  - Shared package: ✅"
echo "  - API service: ✅"
echo "  - Web application: ✅"
echo "  - CAD service: ⚠️ (Python dependencies needed)"
echo ""
echo "🌍 Ready for deployment to Render.com"
echo "💡 Use the render.yaml configuration for deployment"
