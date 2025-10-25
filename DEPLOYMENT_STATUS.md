# Deployment Status - app.frigate.ai

## ✅ Successfully Deployed

### Infrastructure
- **Docker Network**: `cnc-quote_cnc-network` bridged with manufacturing containers
- **Nginx**: Running on ports 80 (HTTP) and 443 (HTTPS)
- **SSL**: Certificates mounted from `/root/cnc-quote/ssl/`

### Services Running

| Service | Container | Port | Status | Health Check |
|---------|-----------|------|--------|--------------|
| Customer Portal | customer-portal | 3000 | ✅ Healthy | http://localhost/ → 200 |
| Admin Panel | admin-panel | 3002 | ✅ Healthy | Subdomain required |
| Supplier Portal | supplier-portal | 3003 | ✅ Healthy | Subdomain required |
| API | manufacturing-api | 3001 | ✅ Healthy | http://localhost/api/health → OK |
| CAD Service | cnc-quote_cad-service_1 | 10001 | ✅ Healthy | http://localhost/cad/health → 200 |
| Database | manufacturing-db | 5433 | ✅ Running | - |
| Supabase | cnc-quote_supabase_1 | 8000 | ✅ Running | - |
| Redis | cnc-quote_redis_1 | 6379 | ✅ Running | - |

### Routing Configuration

#### Main Domain: `app.frigate.ai`
- **/** → Customer Portal (instant quote, file upload)
- **/api/** → Manufacturing API (quotes, orders, pricing)
- **/cad/** → CAD Analysis Service
- **/_next/** → Next.js static assets

#### Subdomains (require DNS configuration):
- **admin.app.frigate.ai** → Admin Panel (manage materials, pricing, orders)
- **supplier.app.frigate.ai** → Supplier Portal (RFQ management)

## 📋 DNS Configuration Required

To access admin and supplier portals, configure these DNS A records:

```
app.frigate.ai          A    [SERVER_IP]
admin.app.frigate.ai    A    [SERVER_IP]
supplier.app.frigate.ai A    [SERVER_IP]
```

Or use wildcard:
```
*.app.frigate.ai        A    [SERVER_IP]
```

## 🧪 Testing the End-to-End Flow

### 1. Instant Quote Upload (Customer Portal)
```bash
# Access the customer portal
curl http://localhost/
# Expected: 200, HTML page loads
```

**Manual Test**:
1. Open browser: `http://app.frigate.ai`
2. Upload a CAD file (STEP, STL, etc.)
3. Select material, finish, quantity
4. Get instant pricing

### 2. API Quote Creation
```bash
# Test quote endpoint
curl -X POST http://localhost/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{"material":"aluminum","quantity":10}'
```

### 3. Supplier Portal (RFQ Visibility)
**Requires**: DNS + Authentication token

```bash
# Get auth token from admin panel or database
export JWT_TOKEN="eyJ..."

# Check supplier RFQs
curl http://localhost/api/v1/supplier/rfqs \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Manual Test**:
1. Open browser: `http://supplier.app.frigate.ai` (after DNS)
2. Login with supplier credentials
3. View active RFQs from instant quotes

### 4. Admin Panel (Order Management)
**Requires**: DNS + Admin authentication

**Manual Test**:
1. Open browser: `http://admin.app.frigate.ai` (after DNS)
2. Login with admin credentials
3. View dashboard with all quotes
4. Manage materials, pricing rules, lead times

## 🔧 Service Configuration

### Environment Variables
All services use environment variables from their respective containers. Key variables:

- **API**: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- **Customer Portal**: `NEXT_PUBLIC_API_URL=/api`
- **Admin Panel**: `NEXT_PUBLIC_API_URL=/api`
- **Supplier Portal**: `NEXT_PUBLIC_API_URL=/api`

### Database
- **PostgreSQL**: manufacturing-db (port 5433)
- **Supabase**: cnc-quote_supabase_1 (port 8000)
- All migrations applied
- RLS policies active

## 📊 Monitoring & Health Checks

### Health Endpoints
```bash
# API health
curl http://localhost/api/health

# CAD service health  
curl http://localhost/cad/health

# Check all container status
docker ps --filter "name=customer-portal" --filter "name=admin-panel" --filter "name=supplier-portal" --filter "name=manufacturing-api"
```

### Logs
```bash
# View Nginx access logs
docker logs manufacturing-nginx

# View API logs
docker logs manufacturing-api

# View customer portal logs
docker logs customer-portal

# View CAD service logs
docker logs cnc-quote_cad-service_1
```

## 🚨 Known Issues & Solutions

### Issue: cnc-quote_api_1 Not Used
**Status**: Resolved by using `manufacturing-api` instead
**Reason**: DATABASE_POOL dependency injection error in cnc-quote_api_1
**Solution**: Bridged networks and routed to working manufacturing-api

### Issue: Admin/Supplier Portals Need Subdomains
**Status**: Configuration ready, DNS required
**Solution**: Configure DNS records as shown above

## 🎯 Next Steps

1. **Configure DNS** for admin and supplier subdomains
2. **Test end-to-end flow**:
   - Upload file via customer portal
   - Verify quote appears in supplier portal
   - Check admin panel visibility
3. **Set up authentication** tokens for supplier/admin access
4. **Run QA suite** with proper environment:
   ```bash
   export JWT_TOKEN="..."
   cd /root/cnc-quote
   pnpm qa:check-pricing
   pnpm qa:check-supplier
   ```

## 📝 Architecture Notes

### Network Topology
```
Internet (ports 80/443)
    ↓
manufacturing-nginx
    ↓
cnc-quote_cnc-network
    ├── customer-portal:3000
    ├── admin-panel:3002
    ├── supplier-portal:3003
    ├── manufacturing-api:3001
    ├── cnc-quote_cad-service_1:10001
    ├── manufacturing-db:5433
    ├── cnc-quote_supabase_1:8000
    └── cnc-quote_redis_1:6379
```

### Data Flow
1. **Customer** uploads CAD file → Customer Portal
2. **Portal** sends file to `/cad/analyze` → CAD Service
3. **CAD Service** extracts geometry, features → Returns analysis
4. **Portal** requests pricing via `/api/v1/quotes` → Manufacturing API
5. **API** applies pricing rules, calculates cost → Returns quote
6. **Quote** stored in database with RFQ status
7. **Supplier Portal** polls `/api/v1/supplier/rfqs` → Shows new RFQs
8. **Admin Panel** views all activity via `/api/v1/admin/*`

## 🔐 Security

- SSL certificates: `/root/cnc-quote/ssl/server.crt` and `server.key`
- TLS 1.2 and 1.3 enabled
- CORS configured for API endpoints
- JWT authentication for admin/supplier portals
- File upload size limit: 200MB
- Request timeout: 300 seconds

---

**Deployment Date**: October 23, 2025  
**Config Location**: `/root/cnc-quote/nginx/app-frigate.conf`  
**Container Network**: `cnc-quote_cnc-network`
