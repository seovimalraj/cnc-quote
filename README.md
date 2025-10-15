# CNC Quote Platform 🏭

A comprehensive CNC manufacturing quote generation and DFM (Design for Manufacturing) analysis platform built with modern web technologies. Generate instant quotes, analyze CAD files, and manage manufacturing orders with advanced automation.

## 📋 Table of Contents

- [🚀 Features](#-features)
- [🏗️ Architecture](#️-architecture)

- [📦 Project Structure](#-project-structure)

- [⚙️ Technology Stack](#️-technology-stack)
- [🛠️ Installation](#️-installation)
- [🔧 Configuration](#-configuration)
- [🐳 Docker Deployment](#-docker-deployment)
- [📖 API Documentation](#-api-documentation)
- [🌐 Frontend Features](#-frontend-features)
- [🔒 Security](#-security)
- [📊 Monitoring & Analytics](#-monitoring--analytics)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

## 🚀 Features

### 🎯 Core Functionality
- **Instant Quote Generation**: Get pricing for CNC parts in seconds
- **DFM (Design for Manufacturing) Analysis**: Automated design feedback and optimization suggestions
- **Multi-Process Support**: CNC Milling, Turning, and Injection Molding
- **Material Catalog**: Comprehensive database of materials and finishes
- **Lead Time Management**: Flexible delivery options with dynamic pricing
- **File Upload & Processing**: Support for CAD files (STEP, STL, IGES, etc.)

### 👥 User Management
- **Multi-tenant Architecture**: Organization-based user management
- **Role-based Access Control**: Admin, Manager, and User roles
- **Customer Portal**: Self-service quote management and order tracking
- **Admin Dashboard**: Comprehensive management interface

### 💰 Pricing & Quoting
- **Dynamic Pricing Engine**: Real-time pricing based on geometry, material, and quantity
- **Quote Versioning**: Track quote changes and iterations
- **Bulk Pricing**: Quantity breaks and volume discounts
- **Manual Review System**: Flag complex parts for human review
- **Price Override**: Admin capability to adjust pricing
  
#### Phase 1 (Completed) – Foundational Enhancements Toward Xometry Parity

Phase 1 established a transparent, extensible pricing & preview core:

- ✅ Stateless multi-part Quote Preview API (`QuotePreviewService`) returning per-line unit/total price, complexity score, and lead time
- ✅ Shared Catalog Snapshot (materials, finishes, processes, machines) with deterministic version tag
- ✅ Shared Cost Model Types & Pricing Compute Utility (`pricing.compute.ts`) producing normalized breakdown fields (material, machining, finish, setup, inspection, overhead, margin)
- ✅ Lead Time Tiers (standard / expedited) surfaced in preview response with baseline & derived rush days + multipliers
- ✅ Per-part cost breakdown UI (Instant Quote summary > expandable per-line breakdown with granular cost buckets + lead time)
- ✅ Quote Revision Type Scaffolding (types + backend service shell) for future diff-based revisioning
- ✅ Unit test coverage for pricing compute (edge cases: zero qty, unknown codes, high complexity multipliers)

These foundations unlocked Phase 2 without structural refactors.

#### Phase 2 (In Progress) – Tiered Pricing & Comparative UX

Focus: richer pricing exploration & user-visible economic levers.

Delivered so far:
- ✅ Price Tiers surfaced (e.g. standard vs expedited) with selectable tier impacting displayed unit / total price per line
- ✅ Quantity Matrix generation (e.g. 1 / 5 / 10 / 25) returned in preview response for each part for ladder-style selection
- ✅ UI quantity & tier selectors wired—changing either updates extended price + aggregate metrics
- ✅ Aggregate lead time & price delta visualization (baseline vs selected tier / quantity) with per-line delta badges
- ✅ Revision persistence scaffolding retained for upcoming history view integration
- ✅ Extended shared types (`catalog.types.ts`) to include `price_tiers`, `quantity_matrix`, and structured lead time tier definitions
- ✅ Consolidated pricing compute tests ensure stability as matrices & tiers expand

Quote Revision Persistence (now active):
```
GET  /api/quotes/:id/revisions          # List revisions (desc revision_number)
POST /api/quotes/:id/revisions          # Create draft revision (optionally supply diff_summary)
POST /api/quotes/revisions/:revisionId/apply  # Mark revision applied (future: materialize state)
```
`quote_revisions` table fields: `id, quote_id, revision_number, status, reason, created_by, diff_summary(jsonb), created_at, applied_at` (+ RLS policies for org membership).
Shared diff helper: `computeQuoteDiffSummaryV1(prev, curr)` (shallow pricing + item count/status deltas).

Upcoming (Phase 2 remaining scope):
- Persist actual quote revisions to storage + expose revision history endpoint (diff summary of cost buckets & lead time)
- Merge realtime (event-driven) vs preview ladder data into a unified delta comparison view
- Local caching of preview requests keyed by stable part config hash to reduce network churn
- Add rush tier pricing heuristics for machine setup compression & overtime cost modeling
- Visual variance indicators when delta thresholds (e.g. ±12% unit price) are exceeded

Early Phase 3 Lookahead (dependency prep):
- Introduce bundle / multi-part optimization heuristics (shared setup amortization)
- Margin optimization overlay (target vs achieved; highlight low-margin lines)
- Risk scoring integration feeding surcharge or manual review gating


### 📦 Order Management
- **Order Lifecycle**: From quote creation through production, QC, shipment, and completion
- **Payment Integration**: PayPal Orders API (create & capture)
- **Document Generation**: Automated QAP (Quality Assurance Plan) documents
- **Notification System**: Email and in-app notifications

### 🔍 Analytics & Reporting
- **Quote Analytics**: Conversion rates, pricing trends
- **Order Metrics**: Revenue, volume, and performance tracking
- **Customer Insights**: Usage patterns and preferences
### Queue / Job Monitoring (Enterprise Grade)

- **Performance Monitoring**: System health and uptime tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   CAD Service   │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ - React UI      │    │ - REST API      │    │ - File Analysis │
│ - SSR/SSG       │    │ - Authentication│    │ - DFM Checks    │
│ - Responsive    │    │ - Business Logic│    │ - Geometry Calc │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   PostgreSQL    │    │     Redis       │
│   (Proxy/SSL)   │    │   (Supabase)    │    │   (Cache/Jobs)  │
│                 │    │                 │    │                 │
│ - Load Balancer │    │ - User Data     │    │ - Session Store │
│ - SSL/TLS       │    │ - Orders/Quotes │    │ - Rate Limiting │
│ - Static Assets │    │ - Materials     │    │ - Job Queue     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Project Structure

```
cnc-quote/
├── apps/
│   ├── api/                    # Backend NestJS API
│   │   ├── src/
│   │   │   ├── auth/          # Authentication modules
│   │   │   ├── quotes/        # Quote management
│   │   │   ├── orders/        # Order processing
│   │   │   ├── users/         # User management
│   │   │   ├── materials/     # Material catalog
│   │   │   ├── pricing/       # Pricing engine
│   │   │   ├── uploads/       # File upload handling
│   │   │   └── shared/        # Common utilities
│   │   ├── db/                # Database schemas & migrations
│   │   └── templates/         # Email templates
│   │
│   ├── web/                   # Frontend Next.js application
│   │   ├── src/
│   │   │   ├── app/          # Next.js 15 App Router
│   │   │   ├── components/   # Reusable React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Utility functions
│   │   │   └── types/        # TypeScript definitions
│   │   ├── public/           # Static assets
│   │   └── pages/            # Additional pages
│   │
│   └── cad-service/          # Python CAD analysis service
│       ├── app/
│       │   ├── models/       # Data models
│       │   ├── services/     # Business logic
│       │   └── utils/        # Helper functions
│       ├── main.py           # FastAPI application
│       └── requirements.txt  # Python dependencies
│
├── packages/
│   └── shared/               # Shared TypeScript packages
│       ├── src/
│       │   ├── types/        # Common type definitions
│       │   └── utils/        # Shared utilities
│       └── package.json
│
├── nginx/                    # Nginx configuration
│   ├── nginx.conf           # Main config
│   ├── ssl/                 # SSL certificates
│   └── sites-available/     # Site configurations
│
├── monitoring/              # Observability stack
│   ├── prometheus/          # Metrics collection
│   └── grafana/            # Dashboards & alerting
│
├── scripts/                 # Development & deployment scripts
│   ├── deploy.sh           # Deployment automation
│   ├── qa-runner.js        # Quality assurance tests
│   └── lib/                # Script utilities
│
├── docs/                   # Documentation
│   └── slo.md             # Service Level Objectives
│
├── docker-compose.yml      # Container orchestration
├── turbo.json             # Monorepo build configuration
└── package.json           # Workspace configuration
```

## ⚙️ Technology Stack

### 🖥️ Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Component Library**: Headless UI
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context + Zustand
- **HTTP Client**: Axios

### ⚙️ Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + Supabase Auth
- **Payment**: PayPal Orders API
- **Queue**: BullMQ + Redis
- **Email**: SMTP / Nodemailer (extensible)
- **File Storage**: Supabase Storage
- **API Documentation**: Swagger/OpenAPI

### 🐍 CAD Service
- **Framework**: FastAPI (Python)
- **CAD Libraries**: OpenCASCADE, FreeCAD
- **File Processing**: pythonOCC
- **Geometry Analysis**: Custom algorithms
- **Container**: Docker

### 🛠️ DevOps & Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (SSL termination)
- **Process Management**: PM2
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: GitHub Actions
- **Deployment**: Render.com, Docker
- **Build System**: Turbo (monorepo)

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and pnpm
- Docker and Docker Compose
- Python 3.9+
- PostgreSQL (or Supabase account)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/cnc-quote.git
cd cnc-quote
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Or install per app
cd apps/web && pnpm install
cd apps/api && pnpm install
cd apps/cad-service && pip install -r requirements.txt
```

### 3. Environment Setup
```bash
# Copy environment templates
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/cad-service/.env.example apps/cad-service/.env

# Configure your environment variables (see Configuration section)
```

### 4. Database Setup
```bash
# Generate Prisma client
cd apps/api && pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Seed initial data
pnpm prisma db seed
```

### 5. Start Development
```bash
# Start all services
pnpm dev

# Or start individual services
pnpm dev:web      # Frontend (http://localhost:3000)
pnpm dev:api      # Backend (http://localhost:5001)
pnpm dev:cad      # CAD Service (http://localhost:8000)
```

## 🔧 Configuration

### Web Application (apps/web/.env.local)
```env
# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-client-id

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Backend API (apps/api/.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cnc_quote
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Payments (PayPal)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_ENV=sandbox

# Email
SENDGRID_API_KEY=SG.xxx
RESEND_API_KEY=re_xxx

# Redis
REDIS_URL=redis://localhost:6379

# File Storage
SUPABASE_STORAGE_BUCKET=uploads
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.step,.stp,.stl,.iges,.igs,.obj

# CAD Service
CAD_SERVICE_URL=http://localhost:8000
CAD_SERVICE_API_KEY=your-cad-api-key
```

### CAD Service (apps/cad-service/.env)
```env
# FastAPI Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# Security
API_KEY=your-cad-api-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5001

# File Processing
MAX_FILE_SIZE=100MB
TEMP_DIR=/tmp/cad-uploads
PROCESSING_TIMEOUT=300

# OpenCASCADE
OCC_DATA_PATH=/opt/opencascade/share/opencascade
```

## 🐳 Docker Deployment

### Development with Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Start specific services
docker-compose up web api postgres redis

# View logs
docker-compose logs -f web
```

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with SSL and monitoring
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose ps
```

### Docker Compose Services
- **nginx**: Reverse proxy with SSL termination (port 80/443)
- **web**: Next.js frontend application (internal port 3000)
- **api**: NestJS backend API (internal port 5001)
- **cad-service**: Python FastAPI service (internal port 8000)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Cache and job queue (port 6379)
- **prometheus**: Metrics collection (port 9090)
- **grafana**: Monitoring dashboards (port 3001)

## 📖 API Documentation

### Base URLs
- **Development**: `http://localhost:5001`
- **Production**: `https://your-domain.com/api`

### Authentication
All API endpoints require authentication via JWT tokens:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.example.com/quotes
```

### Core Endpoints

#### Authentication
```http
POST /auth/login          # User login
POST /auth/register       # User registration
POST /auth/refresh        # Refresh token
POST /auth/logout         # User logout
```

#### Quotes
```http
GET    /quotes            # List quotes
POST   /quotes            # Create quote
GET    /quotes/:id        # Get quote details
PATCH  /quotes/:id        # Update quote
DELETE /quotes/:id        # Delete quote
POST   /quotes/:id/order  # Convert quote to order
POST   /quotes/preview-multipart  # Stateless multi-part pricing preview
```

##### Multi-Part Pricing Preview (Stateless)
`POST /api/quotes/preview-multipart`

Generates a cost, lead time, and cost breakdown estimate for multiple parts without persisting a quote. Uses the in-memory catalog snapshot (see `packages/shared/src/catalog.data.ts`). Intended for real-time UI updates as users change material/process/finish/quantity selections.

Example Request:
```json
{
  "currency": "USD",
  "parts": [
    {
      "external_id": "gear-housing",
      "process_code": "CNC-MILL-3AX",
      "material_code": "ALU-6061-T6",
      "finish_codes": ["ANODIZE-CLEAR"],
      "quantity": 10,
      "volume_cc": 55.2,
      "removed_material_cc": 180.0,
      "surface_area_cm2": 150.4,
      "features": {"holes": 12, "pockets": 3}
    },
    {
      "external_id": "mount-bracket",
      "process_code": "SHEET-LASER",
      "material_code": "SS-304",
      "quantity": 40,
      "surface_area_cm2": 92.1,
      "sheet": {"thickness_mm": 3, "cut_length_mm": 640, "bends": 2}
    }
  ]
}
```

Example Response (abridged):
```json
{
  "currency": "USD",
  "total_parts": 2,
  "subtotal": 812.4,
  "lines": [
    {
      "part_external_id": "gear-housing",
      "process_code": "CNC-MILL-3AX",
      "material_code": "ALU-6061-T6",
      "finish_codes": ["ANODIZE-CLEAR"],
      "quantity": 10,
      "unit_price": 43.11,
      "total_price": 431.1,
      "lead_time_days": 7,
      "complexity_score": 1.52,
      "breakdown": {
        "material_cost": 26.4,
        "machine_cost": 285.4,
        "finish_cost": 41.6,
        "setup_cost": 15.83,
        "qa_cost": 16.35,
        "margin": 48.22,
        "overhead": 26.3
      },
      "notes": []
    }
  ],
  "aggregate": {"avg_lead_time_days": 6.5, "max_lead_time_days": 7},
  "snapshot_version": "2025-01-01.001"
}
```

Notes per line may include warnings for unknown material/process/finish codes, adjusted non-positive quantity, or missing geometry metrics. All numeric outputs are heuristic and will evolve as the production pricing engine is integrated.

##### Catalog Snapshot Types
Shared catalog domain definitions live in:
```
packages/shared/src/catalog.types.ts
packages/shared/src/catalog.data.ts
```
Exported via `@cnc-quote/shared` root index and used by the preview service (`quote-preview.service.ts`).


#### File Upload
```http
POST   /uploads           # Upload CAD file
GET    /uploads/:id       # Get upload status
DELETE /uploads/:id       # Delete uploaded file
```

#### DFM Analysis
```http
POST   /dfm/analyze       # Start DFM analysis
GET    /dfm/results/:id   # Get analysis results
```

### API Response Format
```json
{
  "success": true,
  "data": {
    "id": "quote-123",
    "status": "pending",
    "price": 125.50,
    "parts": [...]
  },
  "message": "Quote generated successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🌐 Frontend Features

### 📱 Pages & Routes
- **Home** (`/`): Landing page with CTAs
- **Instant Quote** (`/instant-quote`): File upload and quote generation
- **Dashboard** (`/dashboard`): User dashboard and quote management  
- **Orders** (`/orders`): Order tracking and history
- **Materials** (`/materials`): Material catalog browser
- **Admin** (`/admin`): Administrative interface

### 🎨 Components
- **QuoteForm**: Multi-step quote generation
- **FileUploader**: Drag & drop CAD file upload
- **DFMResults**: Interactive design feedback display
- **PriceBreakdown**: Detailed pricing information
- **MaterialSelector**: Material and finish picker
- **OrderTracker**: Real-time order status

### 🧩 Instant Quote Layout (Xometry-Style)
The `/instant-quote` page now uses a three-column responsive layout mirroring established manufacturing marketplaces:

1. Left Sidebar (Upload & Parts)
  - Multi-file upload control
  - Scrollable part list with status pills
  - Selection drives the central workspace
2. Center Workspace (Active Part)
  - Tabbed panel: 3D Viewer / DFM
  - Configuration form (process, material, finishes, quantities, inspection)
  - Real-time pricing matrix for selected quantity ladder
3. Right Sidebar (Quote Summary)
  - Subtotal aggregation
  - Parts count and status stub
  - Guidance block & future CTA location

Key new components (under `apps/web/src/components/instant-quote/`):
```
InstantQuoteState.tsx       # Context for selected part + active tab
PartListPanel.tsx           # Left column list & upload wrapper
ViewerTabs.tsx              # 3D viewer / DFM toggle logic
SelectedPartWorkspace.tsx   # Central composite (viewer + config + pricing)
QuoteSummaryPanel.tsx       # Right column summary & guidance
```

Behavior Notes:
- Sticky left/right sidebars on wide viewports for persistent context.
- Center column scrolls independently for deep configuration.
- Subtotal recalculates from live pricing store rows; respects selected quantity if present.
- DFM and geometry events (socket-driven) remain integrated; future enhancements will stream issue aggregation.

Planned Enhancements (TODO):
- Integrate stateless `preview-multipart` API for pre-quote exploration.
- Add per-part revision/version history tab.
- Add 3D viewer advanced controls (explode, section, measurement).
- Stream DFM issue deltas w/ severity indicators.
- Inline lead time selector affecting price ladder.

### � Multi-Part Pricing Preview Integration
The UI integrates the backend `POST /api/quotes/preview-multipart` endpoint for heuristic, stateless pricing exploration.

Workflow:
1. User uploads one or more parts (persisted quote path still active for realtime pricing).
2. Toggling the "Preview Pricing" button in the right sidebar triggers a debounced call that maps current part configurations to catalog snapshot codes.
3. Response lines, snapshot version, and per-part notes are displayed in an expandable detail section.
4. Preview subtotal is shown alongside realtime subtotal (when pricing events have populated). This enables rapid experimentation before committing changes that require full recalculation.

UI Components Involved:
```
hooks/useQuotePreview.ts                 # Debounced fetch + state
components/instant-quote/QuoteSummaryPanel.tsx  # Toggle, subtotal comparison, detail list
```

Mapping Strategy (client-side):
- process_type -> catalog process_code (e.g. cnc_milling → CNC-MILL-3AX)
- material_id -> catalog material_code (e.g. al_6061 → ALU-6061-T6)
- finish_ids -> finish_codes (currently defaulting unknowns to ANODIZE-CLEAR placeholder)

Lead Time Option:
The configuration form includes a `Lead Time` selector (standard / expedite) which is persisted to part config; future pricing logic will translate expedite into adjusted machine/finish lead time + margin adjustments.

Notes Handling:
Server-generated line `notes` are truncated to first two entries in summary view; full inspection remains possible by extending the detail drawer in future iterations.

Future Preview Enhancements:
- Merge realtime and preview rows to show deltas (Δ unit price, Δ lead days)
- Local caching keyed by a stable hash of part config to avoid redundant network calls
- Integrate risk/inspection level multipliers once catalog expands
- Provide visual variance indicators when preview deviates > threshold from last realtime price

### 🧊 Interactive 3D Part Viewer
The Instant Quote center column integrates an interactive 3D viewer (`Part3DViewer`) modeled after Xometry-style usability.

Implemented Capabilities:
- Orbit / zoom / pan (`OrbitControls`)
- Dynamic mesh rendering from flat vertex + index buffers (placeholder until full STL/STEP ingestion)
- Wireframe overlay toggle
- Edge outline toggle
- Single horizontal section plane (Y-axis) toggle
- Distance measurement mode (click two surface points)
- Auto-rotate toggle + reset
- Color picker + background scheme (light / dark; grid placeholder)
- Axes gizmo & orientation viewport
- Graceful empty mesh state

Key Files:
```
apps/web/src/components/Part3DViewer.tsx
apps/web/src/components/instant-quote/ViewerTabs.tsx
```

Extensibility Roadmap:
- STL / STEP / 3MF parsing & server-side tessellation pipeline
- Assembly support (multi-part overlay + explode view)
- Multi-axis & draggable clipping planes
- Surface heatmaps (machinability, cost density, tolerance stress)
- Feature highlight & hover metrics (holes, pockets, thin walls)
- DFM issue pins (synced with `dfm_event` stream)
- Transparency / X-ray / ghosted mode
- Camera bookmarks + unit system toggle (mm ⇄ in)
- Annotated screenshot export

Future Pricing/DFM Fusion Ideas:
- Overlay cost drivers (faces contributing highest cycle time)
- Visual diffs between revisions
- Risk scoring with color ramps

Performance Notes:
- Lightweight scene (single mesh) keeps render cost low.
- Clipping plane uses local clipping; multi-plane move to shader path if needed.
- Measurement lines use simple `Line` primitive (`@react-three/drei`).


### �🔧 Custom Hooks
- `useQuote()`: Quote management and state
- `useAuth()`: Authentication and user context  
- `useUpload()`: File upload with progress
- `useDFM()`: DFM analysis integration

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Secure session management
- **Role-Based Access**: Admin, Manager, User permissions
- **API Key Authentication**: Service-to-service auth
- **Rate Limiting**: Request throttling and abuse prevention

### Data Protection
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Protection**: Content sanitization
- **CSRF Tokens**: Cross-site request forgery prevention
- **File Upload Security**: Type and size validation

### Infrastructure Security
- **SSL/TLS**: HTTPS encryption for all traffic
- **Environment Variables**: Secure credential storage
- **Container Security**: Minimal Docker images
- **Network Isolation**: Service segmentation

## 📊 Monitoring & Analytics

### Application Monitoring
- **Prometheus Metrics**: Request rates, errors, latency
- **Grafana Dashboards**: Visual monitoring and alerting
- **Health Checks**: Service availability monitoring
- **Error Tracking**: Centralized error logging

### Business Analytics
- **Quote Conversion**: Success rates and trends
- **Revenue Tracking**: Order values and growth
- **User Behavior**: Feature usage analytics
- **Performance Metrics**: System optimization insights

### Observability Stack
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  
scrape_configs:
  - job_name: 'web-app'
    static_configs:
      - targets: ['web:3000']
  - job_name: 'api-server' 
    static_configs:
      - targets: ['api:5001']
```

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing
- **Performance Tests**: Load and stress testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit        # Unit tests
pnpm test:integration # Integration tests  
pnpm test:e2e         # End-to-end tests

# Test coverage
pnpm test:coverage
```

### Test Scripts
- `scripts/qa-runner.js`: Automated QA test runner
- `scripts/dfm-acceptance-test.ts`: DFM functionality testing
- `apps/web/e2e/`: Playwright E2E tests

## 🚀 Deployment

### Production Deployment
```bash
# Build production containers
./scripts/deploy.sh production

# Deploy to Render.com
./deploy-render.sh

# Health check
./scripts/check-slos.js
```

### Environment Setup
1. **Supabase**: Create project and configure database
2. **Stripe**: Set up payment processing
3. **DNS**: Configure domain and SSL certificates
4. **Monitoring**: Deploy Prometheus and Grafana

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Docker Registry**: Container image storage
- **Environment Promotion**: Dev → Staging → Production
- **Rollback Strategy**: Quick reversion capabilities

## 🛠️ Troubleshooting

### Common Issues

#### File Upload Errors
```bash
# Check file size limits
grep MAX_FILE_SIZE apps/api/.env

# Verify file types
grep ALLOWED_FILE_TYPES apps/api/.env

# Test upload endpoint
curl -X POST http://localhost:5001/uploads \
  -F "file=@test.step" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### DFM Analysis Failures
```bash
# Check CAD service logs
docker-compose logs cad-service

# Test CAD service directly
curl http://localhost:8000/health

# Verify Python dependencies
cd apps/cad-service && pip list
```

#### CSS/Static Asset Issues
```bash
# Rebuild web container
docker-compose build web
docker-compose up -d web

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Verify static file serving
curl -I http://localhost/_next/static/css/app.css
```

#### Database Connection Issues
```bash
# Check Supabase status
curl https://your-project.supabase.co/rest/v1/

# Test database connection
cd apps/api && pnpm prisma db push

# Verify environment variables
grep DATABASE_URL apps/api/.env
```

### Performance Optimization
- **Database**: Index optimization and query analysis
- **Caching**: Redis implementation for frequent queries
- **CDN**: Static asset delivery optimization
- **Image Optimization**: Next.js automatic image optimization

### Monitoring Commands
```bash
# Check system health
./scripts/check-observability.js

# Measure SLOs
./scripts/measure-slos.ts

# Test all endpoints
./scripts/doctor.ts
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- **TypeScript**: Strict typing enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### Project Guidelines
- Follow existing architectural patterns
- Add tests for new features
- Update documentation as needed
- Ensure Docker compatibility

## 📝 License

---

## 🔄 Order Lifecycle

The platform uses a canonical set of order statuses to ensure consistent state transitions across services and UI layers.

Canonical Statuses:

| Status | Meaning |
| ------ | ------- |
| `NEW` | Order created (converted from quote, awaiting payment or just initialized) |
| `PAID` | Payment captured (funds secured) |
| `IN_PRODUCTION` | Manufacturing work started (work orders active) |
| `QC` | Quality inspection in progress |
| `SHIPPED` | Order dispatched / in transit |
| `COMPLETE` | Delivered & finalized |
| `CANCELLED` | Order voided (terminal state) |

Allowed Transitions (DAG):

```
NEW -> PAID -> IN_PRODUCTION -> QC -> SHIPPED -> COMPLETE
NEW -> CANCELLED
PAID -> CANCELLED
IN_PRODUCTION -> CANCELLED
QC -> CANCELLED
```

Notes:
- Self-transitions are treated as idempotent (ignored logically).
- `COMPLETE` and `CANCELLED` are final states (no further forward transitions).
- Legacy DB status values (`draft`, `approved`, `in_production`, etc.) are mapped to canonical forms in service layer.
- Validation is enforced via shared `validateOrderStatusTransition(from, to)` logic exported in `@cnc-quote/shared`.

### Status Mapping (DB ⇄ Canonical)

| DB (legacy) | Canonical |
| ----------- | --------- |
| `draft` / `pending_approval` | `NEW` |
| `approved` | `PAID` |
| `in_production` | `IN_PRODUCTION` |
| `quality_check` | `QC` |
| `shipping` | `SHIPPED` |
| `completed` | `COMPLETE` |
| `cancelled` | `CANCELLED` |

### Timeline & History
- Status changes persisted in `order_status_history` (order_id, new_status, notes, changed_by, created_at)
- Helper: `OrdersService.updateOrderStatus` validates and appends history atomically.
- Payments capture path promotes `NEW` → `PAID` with validation & analytics event logging.

### Extensibility Roadmap
Potential future statuses: `ON_HOLD`, `PARTIAL_SHIPPED`, `RETURN_REQUESTED` (would require transition map extension + UI lane updates).

---

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: Check this README and `/docs` folder
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: vimalraj@frigate.ai

**Built with ❤️ by the Vimal & Team**