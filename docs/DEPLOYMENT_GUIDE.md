# Deployment Guide

This guide covers the deployment of the CNC Quote Platform.

## 1. Prerequisites

-   A server or cloud environment with Docker installed.
-   A configured domain name.
-   A PostgreSQL database and Redis instance (can be run in Docker or as managed services).
-   An S3-compatible object storage for file uploads.

## 2. Environment Configuration

Before deploying, you need to configure the environment variables for each service. Create a `.env` file for the `api` and `web` apps based on their respective `.env.example` files.

Key variables to configure:
-   `DATABASE_URL`: Connection string for your PostgreSQL database.
-   `REDIS_URL`: Connection string for your Redis instance.
-   `S3_...`: Credentials for your object storage.
-   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: If using Supabase for authentication.
-   `JWT_SECRET`: A secret key for signing JWTs.

## 3. Docker-based Deployment

This is the recommended method for a standard deployment.

### 3.1. Building Docker Images
From the root of the project, build the Docker images for all services:
```bash
docker-compose build
```

### 3.2. Running the Application
Start all services in detached mode:
```bash
docker-compose up -d
```

### 3.3. Reverse Proxy
It is highly recommended to run a reverse proxy like Nginx or Caddy in front of the application to handle SSL termination and routing.

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000; # Next.js frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3001; # NestJS backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Remember to configure SSL with a tool like Certbot.

## 4. Render Deployment

The platform can be deployed to Render using a `render.yaml` blueprint.

-   The `render.yaml` file in the root of the repository defines the services to be deployed.
-   It includes services for the `api`, `web`, `cad-service`, and background workers.
-   You will need to configure the environment variables in the Render dashboard.
-   The `deploy-render.sh` script can be used to trigger deployments from your local machine.

## 5. Kubernetes (k8s) Deployment

For large-scale deployments, Kubernetes can be used.

-   A sample `deployment.yaml` is provided in the `k8s/` directory.
-   This file defines deployments for the `api` and `web` services.
-   You will need to create Kubernetes secrets for your environment variables.
-   You will also need to set up an Ingress controller to manage traffic.

This is an advanced deployment option and requires familiarity with Kubernetes.

## 6. Database Migrations

When deploying a new version of the application, you may need to run database migrations.
Migrations are located in `apps/api/db/migrations`.

To run migrations, you can execute a command inside the running `api` container:
```bash
docker-compose exec api pnpm db:migrate
```

---

For troubleshooting deployment issues, check the logs of each service:
```bash
docker-compose logs -f <service_name>
```
(e.g., `api`, `web`, `cad-service`)
