# =============================================================================
# Camp Intelligence - Dockerfile
# Multi-stage build: build stage + lean production image
# =============================================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend + bundle server
RUN pnpm run build

# ---- Stage 2: Production ----
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /app/logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
