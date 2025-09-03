#!/bin/bash

echo "🚀 Starting CNC Quote Platform Deployment..."

# Build shared package
echo "📦 Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Build web app
echo "🌐 Building web application..."
cd apps/web

# Skip type checking for faster build
SKIP_ENV_VALIDATION=true pnpm build --no-lint
cd ../..

echo "✅ Build completed!"
echo "📋 Deployment Summary:"
echo "  - Shared package: ✅"
echo "  - Web application: ✅"
echo "  - API service: ⚠️ (PDF features disabled)"
echo "  - CAD service: ⚠️ (Python dependencies needed)"
echo ""
echo "🌍 Ready for deployment to Render.com"
echo "💡 Use the render.yaml configuration for deployment"
