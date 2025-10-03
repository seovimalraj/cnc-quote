# Step 18: Worker Service Dockerfile

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Build stage
FROM base AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build worker
WORKDIR /app/apps/worker
RUN pnpm build

# Production stage
FROM base AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built worker
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/apps/worker/node_modules ./node_modules

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S worker -u 1001
USER worker

EXPOSE 3001

CMD ["node", "dist/main.js"]
