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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN apk add --no-cache curl && npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy built app
COPY --from=builder /app/apps/web/.next/standalone/ ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

# Ensure static directory exists and has correct permissions
RUN mkdir -p .next/static && chmod -R 755 .next

# Expose port
EXPOSE 3000

# Run
CMD ["node", "apps/web/server.js"]