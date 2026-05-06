# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY solicitudes-indirectos/package.json solicitudes-indirectos/package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY solicitudes-indirectos/ .

RUN npx prisma generate && npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/prod.db

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push && \
  if [ ! -f /app/data/.seeded ]; then \
    npx tsx prisma/seed.ts && touch /app/data/.seeded; \
  fi && \
  node server.js"]
