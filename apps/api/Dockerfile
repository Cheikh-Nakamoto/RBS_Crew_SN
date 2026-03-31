FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./

# Copy package manifests for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build
RUN npx turbo run build --filter=api

# ── Production stage ─────────────────────────
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/types/package.json ./packages/types/
RUN npm install --omit=dev

# Copy Prisma schema + generated client
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types ./packages/types

EXPOSE 4000
ENV API_PORT=4000
CMD ["node", "apps/api/dist/main"]
