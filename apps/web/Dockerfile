# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY packages ./packages

# Build
RUN pnpm --filter web build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache curl && npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# Copy built Next.js application
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public

# Copy startup script
COPY apps/web/start-web.sh ./start-web.sh

# Ensure directories exist and have correct permissions
RUN chmod +x ./start-web.sh && \
    chmod -R 755 public .next

# Expose port
EXPOSE 3000

# Run with startup script
CMD ["./start-web.sh"]