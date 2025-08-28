# CNC Quote Platform

A comprehensive platform for CNC, Sheet Metal, and Injection Molding instant quoting.

## Tech Stack

- Frontend: Next.js with TailAdmin UI
- Backend API: NestJS
- CAD Service: Python FastAPI + OpenCASCADE
- Database: Supabase (PostgreSQL)
- Queue: BullMQ + Redis
- Payments: Stripe + PayPal

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
- Copy `.env.example` to `.env.local` in each app directory
- Fill in the required environment variables

3. Start development servers:
```bash
pnpm dev
```

## Project Structure

```
cnc-quote/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS backend
│   └── cad-service/  # Python FastAPI service
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── eslint-config/# Shared ESLint configuration
```

## License

GNU General Public License v3.0
