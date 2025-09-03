#!/bin/bash
set -e

echo "🚀 Starting CNC Quote Platform Deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Clear previous builds
echo "🧹 Cleaning previous builds..."
pnpm clean || echo "No clean script found, continuing..."

# Build shared package
echo "📦 Building shared package..."
cd packages/shared
pnpm add -D tsup@7.2.0
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
# Ensure PostCSS and Tailwind are properly installed
pnpm add -D postcss@8.4.29 tailwindcss@3.3.3 autoprefixer@10.4.15
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
