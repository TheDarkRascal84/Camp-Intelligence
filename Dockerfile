# =============================================================================
# Camp Intelligence - Dockerfile
# Single-stage build with native dependency support (argon2)
# =============================================================================

FROM node:22-alpine

# Install build tools required for native dependencies (argon2, bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (frontend + server bundle)
RUN pnpm run build

# Remove development dependencies to reduce image size
# This keeps only production dependencies while preserving built artifacts
RUN pnpm prune --prod

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /app/logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
