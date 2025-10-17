# Developer Guide

This guide provides technical information for developers working on the CNC Quote Platform.

## 1. System Architecture

The platform is built on a modern, decoupled architecture:

-   **Frontend**: A Next.js application serving the user-facing portal and admin dashboard.
-   **Backend API**: A NestJS application that handles business logic, data processing, and communication with the database.
-   **CAD Service**: A Python-based service for processing and analyzing CAD files.
-   **Database**: PostgreSQL is used for data persistence.
-   **Job Queue**: BullMQ with Redis for managing background tasks like CAD analysis.
-   **Observability**: Prometheus for metrics collection and Grafana for visualization.

## 2. Local Development Setup

### 2.1. Prerequisites
-   Node.js (v18+)
-   pnpm
-   Docker and Docker Compose

### 2.2. Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Set up environment variables:
    -   Copy `.env.example` to `.env` in the root and in `apps/api`.
    -   Fill in the required variables, especially for the database and Supabase (if used for auth).
    -   The admin API expects canonical legal copy in Supabase. Ensure `LEGAL_DOCUMENTS_TABLE=legal_documents` and `LEGAL_DOCUMENTS_BUCKET=legal-documents` are present in `apps/api/.env` before running migrations.

### 2.3. Running the Development Environment
The easiest way to get all services running is with Docker Compose:
```bash
docker-compose up -d
```
This will start:
-   PostgreSQL database
-   Redis for BullMQ
-   The backend API
-   The frontend web app
-   The CAD service

Alternatively, you can run each service manually. For example, to start the web app:
```bash
pnpm --filter @cnc-quote/web dev
```

## 3. API Reference

The backend API is built with NestJS and exposes a RESTful interface.

### Key Endpoints
-   `POST /api/quotes`: Create a new quote.
-   `GET /api/quotes/:id`: Retrieve a quote.
-   `POST /api/files/upload`: Upload a CAD file.
-   `POST /api/cad/analyze`: Trigger DFM analysis for a file.

The API is documented using Swagger/OpenAPI. When the API is running in development mode, you can access the interactive documentation at `/api/docs`.

## 4. Frontend Component Library

The frontend is built with Next.js, React, and Tailwind CSS. It features a reusable component library.

-   **UI Components**: Located in `apps/web/src/components/ui`, built with `shadcn/ui`.
-   **Feature Components**: Higher-level components like `Part3DViewer` or `QuoteSummaryPanel` are in `apps/web/src/components`.

When developing new features, please create reusable and well-documented components.

## 5. Contributing Guidelines

### 5.1. Branching Strategy
-   Create a new feature branch from `main`.
-   Use a descriptive branch name, e.g., `feature/new-auth-flow`.

### 5.2. Code Style
-   The project uses ESLint and Prettier for code formatting and linting.
-   Run `pnpm lint` and `pnpm format` before committing.

### 5.3. Commits and Pull Requests
-   Write clear and concise commit messages.
-   Create a Pull Request (PR) targeting the `main` branch.
-   Ensure all automated checks (CI, tests) pass.
-   A code review from at least one other team member is required for merging.

### 5.4. Testing
-   **Unit Tests**: Jest is used for unit testing backend services.
-   **E2E Tests**: Playwright is used for end-to-end testing of the web application.
-   Run tests using `pnpm test`.

---

For more details on deployment, see the [Deployment Guide](./DEPLOYMENT_GUIDE.md).
