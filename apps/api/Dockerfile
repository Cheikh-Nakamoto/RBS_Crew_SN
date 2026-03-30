FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages /packages
RUN npm install
COPY apps/api ./apps/api
RUN npx turbo run build --filter=api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
RUN npm install --omit=dev
COPY --from=builder /app/apps/api/dist ./apps/api/dist
CMD ["node", "apps/api/dist/main"]
