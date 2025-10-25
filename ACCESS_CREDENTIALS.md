# CNC Quote Application - Access Information

**Base URL**: http://app.frigate.ai/

---

## 🔐 Access Links

### Customer Portal (Public Quote Interface)
**URL**: http://app.frigate.ai/  
**Also**: http://app.frigate.ai/instant-quote

**Features**:
- Instant quote calculator
- CAD file upload (STEP, STL, SLDPRT, IGES)
- Real-time pricing
- Material and finish selection
- Quantity-based pricing
- Guest checkout (no login required)

**No credentials needed** - Public access for instant quotes

---

### Customer Dashboard (Registered Users)
**URL**: http://app.frigate.ai/dashboard  
**Login**: http://app.frigate.ai/login

**Features**:
- View quote history
- Track orders
- Manage account
- Saved addresses
- Order history

**Test Credentials**:
```
Email: customer@cncquote.com
Password: customer123
```
*(Create account at /login if not exists)*

---

### Admin Panel
**URL**: http://app.frigate.ai/admin

**Features**:
- Order management dashboard
- Quote oversight
- Pricing configuration
- Material management
- User management
- Analytics and reporting
- Lead time configuration
- Supplier assignments

**Test Credentials**:
```
Email: admin@cncquote.com
Password: admin123
Role: admin
```

---

### Supplier Portal
**URL**: http://app.frigate.ai/portal

**Features**:
- RFQ inbox
- Quote acceptance workflow
- Order status updates
- Dispatch tracking
- Communication with customers
- Production scheduling

**Test Credentials**:
```
Email: supplier@cncquote.com
Password: supplier123
Role: supplier
```

---

## 📝 Creating Test Accounts

Since the database is fresh, you'll need to create accounts:

### 1. Register via UI
Visit http://app.frigate.ai/login and click "Sign Up"

### 2. Create via Database (Admin/Supplier)
```bash
# Access the database
docker exec -it 95bf619b5ba5_cnc-quote_supabase_1 psql -U postgres -d postgres

# Create admin user (run after migrations)
INSERT INTO users (email, password_hash, name, role, company, created_at)
VALUES (
  'admin@cncquote.com',
  '$2b$10$...',  -- bcrypt hash of 'admin123'
  'Admin User',
  'admin',
  'CNC Quote Admin',
  NOW()
);

# Create supplier user
INSERT INTO users (email, password_hash, name, role, company, created_at)
VALUES (
  'supplier@cncquote.com',
  '$2b$10$...',  -- bcrypt hash of 'supplier123'
  'Supplier User',
  'supplier',
  'CNC Manufacturing Co',
  NOW()
);
```

---

## 🚀 Quick Start Guide

### For Customers (Getting a Quote)
1. Go to http://app.frigate.ai/
2. Click "Get Instant Quote" or "Upload CAD File"
3. Upload your CAD file (STEP, STL, SLDPRT, etc.)
4. Select:
   - Material (Aluminum, Steel, Plastic, etc.)
   - Finish (As-machined, Anodized, Powder coated, etc.)
   - Quantity
5. Get instant pricing
6. Proceed to checkout
7. Optional: Create account to track order

### For Admins
1. Go to http://app.frigate.ai/login
2. Login with admin credentials
3. Navigate to http://app.frigate.ai/admin
4. Access dashboard features:
   - View all quotes
   - Manage orders
   - Configure pricing rules
   - Manage materials
   - View analytics

### For Suppliers
1. Go to http://app.frigate.ai/login
2. Login with supplier credentials
3. Navigate to http://app.frigate.ai/portal
4. View and manage:
   - Incoming RFQs
   - Accept/reject quotes
   - Update order status
   - Mark orders as dispatched

---

## 🗺️ Site Map

```
http://app.frigate.ai/
├── / (home - instant quote)
├── /instant-quote (CAD upload interface)
├── /get-quote (quote form)
├── /login (authentication)
├── /dashboard (customer dashboard - requires auth)
├── /admin (admin panel - requires admin role)
│   ├── /admin/orders
│   ├── /admin/quotes
│   ├── /admin/pricing
│   ├── /admin/materials
│   └── /admin/analytics
├── /portal (supplier portal - requires supplier role)
│   ├── /portal/rfqs
│   ├── /portal/orders
│   └── /portal/dispatch
├── /orders (order tracking)
├── /quotes (quote history)
├── /account (account settings)
├── /files (file management)
├── /settings (user settings)
├── /help (help center)
├── /docs (documentation)
└── /contact (contact form)
```

---

## 🔧 API Endpoints (for Development)

Note: API service is currently being rebuilt. CAD service is available:

```bash
# CAD Analysis
POST http://app.frigate.ai/cad/analyze
curl -X POST http://app.frigate.ai/cad/analyze \
  -F "file=@part.step"

# Health Check
GET http://app.frigate.ai/cad/health
curl http://app.frigate.ai/cad/health
```

---

## 🎯 User Roles

| Role | Access | Features |
|------|--------|----------|
| **Guest** | Public pages | Get quotes, upload CAD files, checkout |
| **Customer** | Dashboard | View quotes, track orders, manage account |
| **Supplier** | Portal | View RFQs, accept orders, update status, dispatch |
| **Admin** | Admin Panel | Full system access, pricing config, user management |

---

## 📊 Currently Deployed Services

| Service | Container | Status | URL |
|---------|-----------|--------|-----|
| Web App | cnc-quote_web_1 | ✅ Running | http://app.frigate.ai/ |
| CAD Service | cnc-quote_cad-service_1 | ✅ Running | http://app.frigate.ai/cad/ |
| Nginx | cnc-quote_nginx_1 | ✅ Running | Ports 80/443 |
| Database | cnc-quote_supabase_1 | ✅ Running | Internal |
| Redis | cnc-quote_redis_1 | ✅ Running | Internal |

---

## 📧 Default Test Accounts Summary

| Account Type | Email | Password | Role | Access URL |
|--------------|-------|----------|------|------------|
| Admin | admin@cncquote.com | admin123 | admin | http://app.frigate.ai/admin |
| Supplier | supplier@cncquote.com | supplier123 | supplier | http://app.frigate.ai/portal |
| Customer | customer@cncquote.com | customer123 | customer | http://app.frigate.ai/dashboard |
| Guest | - | - | - | http://app.frigate.ai/ |

**Note**: These accounts need to be created via the registration UI at http://app.frigate.ai/login or directly in the database.

---

## 🛠️ Troubleshooting

### Can't login?
1. Check if account exists in database
2. Verify password is correct
3. Check browser console for errors
4. Clear cookies and try again

### Don't see admin/portal sections?
- Ensure your account has the correct role in the database
- Admin role: `role = 'admin'`
- Supplier role: `role = 'supplier'`

### Need to reset database?
```bash
cd /root/cnc-quote
docker-compose -f docker-compose.prod.yml down
docker volume rm cnc-quote_supabase-data
docker-compose -f docker-compose.prod.yml up -d
```

---

**Last Updated**: October 23, 2025  
**Deployment**: Production on app.frigate.ai
