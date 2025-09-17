# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN cd apps/api && sh build-ignore-errors.sh

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./
RUN npm install -g pnpm && pnpm install --prod

# Copy built app
COPY --from=builder /app/apps/api/dist ./dist

# Expose port
EXPOSE 3001

# Run
CMD ["node", "dist/apps/api/src/main.js"]