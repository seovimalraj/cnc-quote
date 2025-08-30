# CNC Quote Platform

A comprehensive, full-stack platform for instant quoting of CNC machining, Sheet Metal fabrication, and Injection Molding services. The platform provides automated CAD analysis, real-time pricing, DFM validation, and complete order management workflows.

## 🚀 Features

### Core Manufacturing Processes
- **CNC Machining**: Milling and turning operations with advanced feature recognition
- **Sheet Metal**: Laser cutting, press brake bending, and waterjet cutting
- **Injection Molding**: Complex part analysis with mold design considerations

### Key Capabilities
- 📐 **CAD File Analysis** - Automated geometry analysis using OpenCASCADE
- 💰 **Real-time Pricing** - Dynamic pricing engine with machine-specific calculations
- 🔍 **DFM Validation** - Design for Manufacturing feedback and optimization suggestions
- 📋 **Quote Management** - Complete quote lifecycle from creation to order conversion
- 💳 **Payment Processing** - Stripe and PayPal integration for seamless transactions
- 📄 **QAP Documents** - Quality Assurance Program document generation
- 🔄 **Order Management** - Full order tracking and workflow management
- 📊 **Manual Review System** - Advanced review workflows for complex parts
- 🏭 **Machine Management** - Comprehensive machine configuration and capabilities
- 📁 **File Management** - Secure file storage and processing

## 🛠 Tech Stack

### Frontend
- **Next.js 13** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Three Fiber** - 3D CAD visualization
- **Supabase Auth** - Authentication and authorization
- **SWR** - Data fetching and caching

### Backend API
- **NestJS** - Scalable Node.js framework
- **TypeScript** - End-to-end type safety
- **PostgreSQL** - Primary database via Supabase
- **BullMQ + Redis** - Job queues and caching
- **JWT** - Authentication tokens
- **Swagger** - API documentation

### CAD Service
- **Python FastAPI** - High-performance async API
- **OpenCASCADE** - 3D CAD kernel for geometry analysis
- **Celery** - Distributed task processing
- **NumPy** - Scientific computing

### Infrastructure
- **Supabase** - Backend-as-a-Service (PostgreSQL, Auth, Storage)
- **Redis** - Caching and job queues
- **Sentry** - Error monitoring and performance tracking
- **Stripe & PayPal** - Payment processing
- **Resend** - Email delivery

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │   NestJS API    │    │ Python CAD Svc  │
│                 │────│                 │────│                 │
│ • React UI      │    │ • REST API      │    │ • OpenCASCADE   │
│ • 3D Viewer     │    │ • Auth/Guards   │    │ • Geometry      │
│ • File Upload   │    │ • Business Logic│    │ • Analysis      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────┐    │    ┌─────────────────┐
         │   Supabase      │────┼────│     Redis       │
         │                 │    │    │                 │
         │ • PostgreSQL    │    │    │ • Job Queues    │
         │ • Auth          │    │    │ • Caching       │
         │ • File Storage  │    │    │ • Sessions      │
         └─────────────────┘         └─────────────────┘
```

## 📁 Project Structure

```
cnc-quote/
├── apps/
│   ├── web/                    # Next.js Frontend Application
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   │   ├── (auth)/    # Authentication pages
│   │   │   │   ├── admin/     # Admin dashboard
│   │   │   │   ├── portal/    # Customer portal
│   │   │   │   └── widget/    # Embeddable quote widget
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── checkout/  # Payment components
│   │   │   │   ├── upload/    # File upload components
│   │   │   │   ├── viewer/    # 3D CAD viewer
│   │   │   │   └── widget/    # Widget components
│   │   │   └── lib/          # Utilities and configurations
│   │   └── e2e/              # End-to-end tests
│   │
│   ├── api/                   # NestJS Backend API
│   │   ├── src/
│   │   │   ├── auth/         # Authentication & authorization
│   │   │   ├── lib/          # Shared libraries
│   │   │   │   ├── cache/    # Caching service
│   │   │   │   └── supabase/ # Supabase integration
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── cad/      # CAD analysis
│   │   │   │   ├── dfm/      # Design for Manufacturing
│   │   │   │   ├── files/    # File management
│   │   │   │   ├── machines/ # Machine configuration
│   │   │   │   ├── orders/   # Order management
│   │   │   │   ├── payments/ # Payment processing
│   │   │   │   ├── pricing/  # Pricing engine
│   │   │   │   ├── qap/      # Quality Assurance
│   │   │   │   └── quotes/   # Quote management
│   │   │   ├── queues/       # Job queue configuration
│   │   │   └── observability/# Logging and monitoring
│   │   ├── db/migrations/    # Database migrations
│   │   └── test/            # API tests
│   │
│   └── cad-service/          # Python CAD Analysis Service
│       ├── app/
│       │   ├── routers/      # FastAPI route handlers
│       │   └── workers/      # Celery background workers
│       └── requirements.txt
│
├── packages/
│   └── shared/               # Shared TypeScript types and utilities
│       └── src/
│           ├── types.core.ts    # Core data types
│           ├── dfm.types.ts     # DFM validation types
│           └── pricing.types.ts # Pricing calculation types
│
├── docs/                     # Project documentation
└── turbo.json               # Monorepo build configuration
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.10+ (for CAD service)
- PostgreSQL database (via Supabase)
- Redis instance

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd cnc-quote
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Environment Setup**
   
   Create `.env.local` files in each app directory with required variables:

   **apps/web/.env.local:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   ```

   **apps/api/.env:**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret
   REDIS_URL=redis://localhost:6379
   STRIPE_SECRET_KEY=your_stripe_secret
   PAYPAL_CLIENT_ID=your_paypal_client_id
   CAD_SERVICE_URL=http://localhost:8000
   ```

4. **Database Setup**
```bash
# Run migrations (if using local PostgreSQL)
cd apps/api && pnpm run migrate
```

5. **Start Development Servers**
```bash
# Start all services
pnpm dev

# Or start individually:
pnpm --filter @cnc-quote/web dev      # Frontend on :3000
pnpm --filter @cnc-quote/api dev      # API on :3001
cd apps/cad-service && python main.py # CAD service on :8000
```

## 📋 API Endpoints

### Authentication
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - User profile

### CAD Analysis
- `POST /cad/analyze` - Queue CAD file analysis
- `GET /cad/analysis/:taskId` - Get analysis results
- `GET /cad/preview/:fileId` - Get 3D preview data

### Quotes & Pricing
- `POST /price` - Calculate pricing for parts
- `POST /api/quotes` - Create new quote
- `GET /api/quotes/:id` - Get quote details
- `PUT /api/quotes/:id` - Update quote
- `POST /api/quotes/:id/send` - Send quote to customer
- `GET /api/quotes/:id/pdf` - Download quote PDF

### DFM Validation
- `POST /api/validate/cnc` - Validate CNC design
- `POST /api/validate/sheet-metal` - Validate sheet metal design
- `POST /api/validate/injection-molding` - Validate injection molding design

### Orders & Payments
- `POST /payments/create-checkout-session` - Create payment session
- `POST /payments/webhook` - Handle payment webhooks
- `GET /orders` - List orders
- `POST /orders` - Create order from quote

### QAP (Quality Assurance)
- `POST /qap/templates` - Create QAP template
- `GET /qap/templates/:id` - Get template
- `POST /qap/documents` - Generate QAP document
- `GET /qap/documents/:id` - Get QAP document

### File Management
- `POST /files/upload` - Upload CAD files
- `GET /files/:id` - Get file metadata
- `DELETE /files/:id` - Delete file

### Machine Management
- `GET /machines` - List organization machines
- `GET /machines/:id` - Get machine details
- `POST /machines` - Create machine configuration

## 🎯 Key Features Deep Dive

### CAD Analysis Engine
The platform uses OpenCASCADE for advanced 3D geometry analysis:
- **Feature Recognition**: Automatic detection of holes, pockets, slots, and complex geometries
- **Material Volume**: Precise volume calculations for material cost estimation
- **Surface Area**: Surface area analysis for finishing operations
- **Complexity Analysis**: Algorithmic complexity scoring for pricing adjustments

### Intelligent Pricing Engine
Multi-factor pricing calculations include:
- **Machine Time**: Setup time + cycle time based on geometry complexity
- **Material Costs**: Volume-based material calculations with waste factors
- **Tooling**: Tool selection and wear calculations
- **Feature Multipliers**: Cost adjustments based on manufacturing features
- **Volume Discounts**: Quantity-based pricing tiers

### DFM Validation System
Real-time design feedback covering:
- **Manufacturability**: Process-specific design rule validation
- **Tolerance Analysis**: Achievable tolerance recommendations
- **Feature Optimization**: Suggestions for cost-effective design changes
- **Material Selection**: Process-appropriate material recommendations

### Advanced Quote Management
Comprehensive quote lifecycle:
- **Multi-part Quotes**: Support for assemblies and multiple components
- **Revision Tracking**: Version control for quote modifications
- **Customer Approval**: Digital approval workflow with e-signatures
- **Quote-to-Order**: Seamless conversion with payment processing

## 🧪 Testing

### Frontend Testing
```bash
cd apps/web
pnpm test                    # Unit tests
pnpm test:e2e               # End-to-end tests with Playwright
```

### Backend Testing
```bash
cd apps/api
pnpm test                    # Unit tests
pnpm test:e2e               # Integration tests
```

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user workflows
- CAD analysis validation tests

## 🚀 Deployment

### Production Build
```bash
pnpm build                   # Build all applications
```

### Docker Support
```bash
# Build CAD service container
cd apps/cad-service
docker build -t cad-service .

# Run with docker-compose (if configured)
docker-compose up -d
```

### Environment Variables
Ensure all production environment variables are properly configured:
- Database connections
- Redis configuration
- Payment provider credentials
- File storage settings
- Monitoring and logging

## 📊 Monitoring & Observability

### Error Tracking
- **Sentry Integration**: Comprehensive error tracking and performance monitoring
- **Custom Logging**: Structured logging with correlation IDs
- **Health Checks**: Service health monitoring endpoints

### Performance Monitoring
- API response time tracking
- Database query performance
- CAD analysis processing times
- Queue processing metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🔧 Troubleshooting

### Common Issues

**CAD Analysis Fails**
- Ensure OpenCASCADE dependencies are installed
- Check CAD service logs for geometry parsing errors
- Verify file format support (STEP, IGES, STL)

**Pricing Calculation Errors**
- Validate machine configuration completeness
- Check material database entries
- Verify feature detection accuracy

**Authentication Issues**
- Confirm Supabase configuration
- Check JWT token expiration
- Verify organization membership

**Payment Processing**
- Validate Stripe/PayPal webhook endpoints
- Check API key configuration
- Monitor payment provider status

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review API documentation via Swagger UI

---

**Built with ❤️ for modern manufacturing**
