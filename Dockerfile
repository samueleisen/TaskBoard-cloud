# ==============================================================
# TaskBoard Cloud — Production Multi-Stage Dockerfile
# Optimized for Google Cloud Run: Minimal size (<100MB), Alpine base
# ==============================================================

# --------------------------------------------------------------
# Stage 1: Build the React Frontend SPA
# --------------------------------------------------------------
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# --------------------------------------------------------------
# Stage 2: Build the TypeScript Fastify Backend
# --------------------------------------------------------------
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json server/tsconfig.json ./
RUN npm ci

COPY server/ ./
RUN npm run build
RUN npm prune --production

# --------------------------------------------------------------
# Stage 3: Minimal Production Image for Cloud Run
# --------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Security: Non-root user execution
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy backend build and production modules
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist

# Copy frontend compiled static assets into server public folder
COPY --from=client-builder /app/client/dist ./public

USER appuser
EXPOSE 8080

# Cloud Run invokes the container listening on $PORT
CMD ["node", "dist/index.js"]
