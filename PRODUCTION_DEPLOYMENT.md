# CNC Quote - Production Deployment Guide

## Overview

CNC Quote is a comprehensive CNC, Sheet Metal, and Injection Molding quoting platform with integrated analytics, error tracking, security, and code quality analysis.

## Services

The application consists of the following services:

### Core Services
- **Web App** (Port 3000): Next.js 15 React application
- **API** (Port 3001): NestJS backend API
- **CAD Service** (Port 3002): Python FastAPI service for CAD analysis
- **Database** (Port 5432): PostgreSQL database
- **Redis** (Port 6379): Caching and queue storage

### Observability & Security
- **SonarQube** (Port 9000): Code quality and security analysis
- **Sentry** (Port 9001): Error tracking and monitoring
- **Keycloak** (Port 8080): Identity and access management
- **MailHog** (Ports 1025, 8025): Email testing service

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cnc-quote
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Check service health**
   ```bash
   docker-compose ps
   ```

## Service URLs

- **Main Application**: http://localhost:3000
- **API**: http://localhost:3001
- **CAD Service**: http://localhost:3002
- **SonarQube**: http://localhost:9000
- **Sentry**: http://localhost:9001
- **Keycloak**: http://localhost:8080
- **MailHog Web UI**: http://localhost:8025

## Code Quality Analysis

### Running SonarQube Analysis

```bash
# Run analysis script
./sonar-analysis.sh

# Or run directly
sonar-scanner -Dsonar.host.url=http://localhost:9000
```

### SonarQube Configuration

- **Project Key**: `cnc-quote`
- **Configuration File**: `sonar-project.properties`
- **Analysis Script**: `sonar-analysis.sh`

## Environment Configuration

### Production URLs
- **Application**: https://quote.frigate.ai
- **API**: https://quote.frigate.ai/api
- **Analytics**: https://quote.frigate.ai/analytics
- **Logs**: https://quote.frigate.ai/logs
- **Security**: https://quote.frigate.ai/security

### Key Environment Variables
- `SUPABASE_URL`: https://quote.frigate.ai/db
- `NEXT_PUBLIC_POSTHOG_KEY`: Cloud PostHog project key
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry DSN for error tracking

## Database Initialization

The `init-services-db.sh` script automatically creates databases for:
- Sentry
- Keycloak
- SonarQube

## Health Checks

All services include health checks:
- API: `GET /v1/health`
- CAD Service: `GET /health`
- SonarQube: `GET /api/system/status`
- Sentry: `GET /_health/`
- Keycloak: Realm check

## Deployment Checklist

- [x] All services running and healthy
- [x] Database initialized
- [x] Environment variables configured
- [x] Health checks passing
- [x] SonarQube analysis configured
- [x] Production URLs configured

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure no other services are using ports 3000-9001
2. **Database connection**: Check PostgreSQL is running on port 5432
3. **SonarQube analysis**: Ensure SonarQube is accessible at localhost:9000

### Logs

```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs <service-name>

# Follow logs in real-time
docker-compose logs -f <service-name>
```

## Production Deployment

For production deployment:

1. Update environment variables for production URLs
2. Configure SSL certificates
3. Set up proper reverse proxy (nginx/traefik)
4. Configure monitoring and alerting
5. Set up backup strategies for databases and volumes

## Support

For issues or questions, check the service logs and ensure all dependencies are properly configured.