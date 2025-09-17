# CNC Quote Platform - Production Deployment

## 🚀 Deploy to quote.frigate.ai

This guide explains how to deploy the CNC Quote platform to `quote.frigate.ai` with the following URL structure:

- **https://quote.frigate.ai** - Main web application
- **https://quote.frigate.ai/api** - API services
- **https://quote.frigate.ai/cad** - CAD analysis services
- **https://quote.frigate.ai/db** - Supabase dashboard
- **https://quote.frigate.ai/redis** - Redis web interface

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain `quote.frigate.ai` configured in Cloudflare
- Server with sufficient resources (4GB RAM recommended)

## 🔧 SSL Configuration

**Cloudflare handles SSL automatically** - no additional SSL certificates needed on your server. The services run on HTTP internally, and Cloudflare terminates SSL.

### Cloudflare Setup:
1. Point `quote.frigate.ai` to your server IP
2. Enable "Always Use HTTPS" in Cloudflare
3. Set SSL mode to "Full (strict)" or "Flexible"

## 🚀 Quick Deployment

```bash
# Clone/update the repository
cd /root/cnc-quote

# Run the production deployment
./deploy-prod.sh
```

## 🏗️ Architecture

```
Internet → Cloudflare (SSL) → Nginx (Reverse Proxy) → Services
                                      ├── / → Web App (Next.js)
                                      ├── /api → API Service (NestJS)
                                      ├── /cad → CAD Service (FastAPI)
                                      ├── /db → Supabase Dashboard
                                      └── /redis → RedisInsight
```

### Services:
- **nginx**: Reverse proxy routing requests to appropriate services
- **web**: Next.js frontend application
- **api**: NestJS backend API
- **cad-service**: FastAPI CAD analysis service
- **supabase**: PostgreSQL database with Supabase services
- **redis**: Redis cache/database
- **redisinsight**: Web interface for Redis management

## 🔍 Health Checks

After deployment, verify all services are running:

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl https://quote.frigate.ai/health
curl https://quote.frigate.ai/api/health
curl https://quote.frigate.ai/cad/docs
```

## ⚙️ Configuration

### Environment Variables

Update these files with your actual credentials:

- `apps/api/.env` - API service configuration
- `apps/web/.env` - Web app configuration
- `apps/cad-service/.env` - CAD service configuration

### Required Credentials to Update:

1. **Stripe** (in `apps/api/.env`):
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Email** (in `apps/api/.env`):
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

3. **Slack** (in `apps/api/.env`):
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   ```

## 🔧 Management Commands

```bash
# View all running services
docker-compose -f docker-compose.prod.yml ps

# View logs for all services
docker-compose -f docker-compose.prod.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f api

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Scale a service
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## 🚨 Troubleshooting

### Common Issues:

1. **Services not starting**: Check logs with `docker-compose logs`
2. **Database connection issues**: Ensure Supabase is healthy
3. **CORS errors**: Verify ALLOWED_ORIGINS in API config
4. **SSL issues**: Confirm Cloudflare SSL settings

### Health Check Endpoints:
- Main app: `https://quote.frigate.ai/api/health`
- API: `https://quote.frigate.ai/api/health`
- CAD: `https://quote.frigate.ai/cad/docs`

## 📊 Monitoring

- **Nginx logs**: `docker-compose logs nginx`
- **Application logs**: `docker-compose logs web api cad-service`
- **Database logs**: `docker-compose logs supabase`

## 🔒 Security Notes

- All services run in Docker containers
- Nginx provides additional security headers
- Cloudflare provides DDoS protection and SSL
- Database is only accessible internally
- Redis is only accessible internally

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify Cloudflare configuration
3. Ensure all required credentials are set
4. Check network connectivity between containers