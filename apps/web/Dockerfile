FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/backend
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# URL publique du site : sert à construire les URLs de retour envoyées à NabooPay.
# Variable NEXT_PUBLIC_*, donc figée au build — la surcharger au runtime n'a aucun effet.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV API_REWRITE_TARGET=http://api-go:4000

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./

# Copy package manifests for all workspaces
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages ./packages
COPY apps/web ./apps/web

# Build Next.js (output: 'standalone')
RUN npx turbo run build --filter=web

# ── Production stage ─────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

ARG NEXT_PUBLIC_API_URL=/backend
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# URL publique du site : sert à construire les URLs de retour envoyées à NabooPay.
# Variable NEXT_PUBLIC_*, donc figée au build — la surcharger au runtime n'a aucun effet.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV API_REWRITE_TARGET=http://api-go:4000

# Copy standalone output + static assets
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
