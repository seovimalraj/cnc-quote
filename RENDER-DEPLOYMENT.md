# CNC Quote Platform - Render Deployment Guide

## 🚀 Deploy to Render.com (Free Plan)

This guide will help you deploy the CNC Quote platform to Render.com using the free plan.

### 📋 Prerequisites

1. **Render.com Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: Prepare your configuration values

### 🔧 Quick Setup

#### 1. Environment Configuration

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- **Supabase**: Project URL, anon key, service role key
- **Stripe**: Secret key, webhook secret, publishable key
- **JWT**: Secret key for authentication
- **Optional**: Redis URL, PayPal, analytics keys

#### 2. Deploy Using Render CLI

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Make the deployment script executable
chmod +x deploy-render-cli.sh

# Run deployment
./deploy-render-cli.sh
```

#### 3. Manual Deployment (Alternative)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Configure environment variables for each service
6. Deploy!

### 🏗️ Services Created

| Service | Type | Plan | Purpose |
|---------|------|------|---------|
| `cnc-quote-web` | Web Service | Free | Next.js frontend |
| `cnc-quote-api` | Web Service | Free | NestJS backend API |
| `cnc-quote-cad` | Web Service | Free | Python CAD analysis |
| `cnc-quote-redis` | Redis | Free | Background job queue |

### ⚙️ Environment Variables

#### Required Variables

**Supabase** (All services):
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

**Stripe** (API service):
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**JWT** (API service):
```
JWT_SECRET=your_jwt_secret_key
```

#### Frontend Variables (Web service):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://your-api-service.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://your-web-service.onrender.com
```

### 🔗 Service URLs

After deployment, your services will be available at:
- **Frontend**: `https://cnc-quote-web.onrender.com`
- **API**: `https://cnc-quote-api.onrender.com`
- **CAD Service**: `https://cnc-quote-cad.onrender.com`

### 📊 Free Plan Limitations

- **750 hours/month** per service
- **750 build hours/month**
- **Free Redis** with 1GB storage
- **Automatic sleep** after 15 minutes of inactivity
- **No custom domains** (use .onrender.com)

### 🚨 Important Notes

1. **Service Dependencies**: Update the API and CAD service URLs in the web service environment variables after all services are deployed.

2. **Cold Starts**: Free plan services sleep after inactivity, causing ~10-20 second cold start times.

3. **Build Time**: Initial builds may take 10-15 minutes due to monorepo setup.

4. **Environment Variables**: Some variables are marked as `sync: false` - you'll need to set these manually in the Render dashboard.

### 🐛 Troubleshooting

#### Build Failures
- Check build logs in Render dashboard
- Ensure all dependencies are properly listed
- Verify Node.js/Python versions match

#### Runtime Errors
- Check service logs for error messages
- Verify environment variables are set correctly
- Ensure database connections are working

#### Service Communication
- Update service URLs after initial deployment
- Check CORS settings if API calls fail
- Verify health check endpoints are working

### 📞 Support

- **Render Docs**: https://docs.render.com
- **Render Support**: https://render.com/docs/support
- **GitHub Issues**: Report issues in the repository

### 🎯 Next Steps

1. **Test the deployment** by visiting your frontend URL
2. **Configure monitoring** and alerts in Render dashboard
3. **Set up custom domain** (paid plan required)
4. **Configure backup** strategies for your database

---

**Happy deploying! 🚀**
