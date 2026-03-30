FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
# install all deps to build
RUN npm install
COPY apps/web ./apps/web
# build next app
RUN npx turbo run build --filter=web

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Next.js optimization
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

ENV PORT 3000
CMD ["node", "apps/web/server.js"]
