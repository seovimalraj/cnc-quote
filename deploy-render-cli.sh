#!/bin/bash

# CNC Quote Platform - Render Deployment Script
# This script helps deploy the CNC Quote platform to Render.com

set -e

echo "🚀 CNC Quote Platform - Render Deployment"
echo "=========================================="

# Check if render-cli is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI is not installed."
    echo "Please install it from: https://docs.render.com/render-cli"
    echo "npm install -g @render/cli"
    exit 1
fi

# Check if logged in to Render
if ! render whoami &> /dev/null; then
    echo "❌ Not logged in to Render CLI."
    echo "Please run: render login"
    exit 1
fi

echo "✅ Render CLI is configured"

# Validate render.yaml
echo "🔍 Validating render.yaml configuration..."
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found!"
    exit 1
fi

echo "✅ render.yaml found"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "cp .env.example .env"
    echo ""
    echo "Required environment variables:"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_KEY"
    echo "- STRIPE_SECRET_KEY"
    echo "- JWT_SECRET"
    echo ""
    read -p "Do you want to continue without .env? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Deploying to Render..."
echo "This will create the following services:"
echo "- cnc-quote-web (Next.js frontend)"
echo "- cnc-quote-api (NestJS backend)"
echo "- cnc-quote-cad (Python CAD service)"
echo "- cnc-quote-redis (Redis cache)"
echo ""

read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting deployment..."

    # Deploy using render.yaml
    render deploy --file render.yaml

    echo ""
    echo "✅ Deployment initiated!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Check the deployment status of all services"
    echo "3. Configure environment variables in each service"
    echo "4. Update NEXT_PUBLIC_API_URL and other URLs once services are deployed"
    echo ""
    echo "🔗 Service URLs (after deployment):"
    echo "- Web: https://cnc-quote-web.onrender.com"
    echo "- API: https://cnc-quote-api.onrender.com"
    echo "- CAD: https://cnc-quote-cad.onrender.com"
    echo ""
    echo "📚 Useful links:"
    echo "- Render Dashboard: https://dashboard.render.com"
    echo "- Render Docs: https://docs.render.com"
else
    echo "❌ Deployment cancelled"
    exit 1
fi
