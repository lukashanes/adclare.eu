FROM node:22-alpine AS deps
WORKDIR /app
ENV npm_config_libc=musl
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS migrator
WORKDIR /app
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://adclare:adclare@localhost:5432/adclare?schema=public" npm run db:generate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS storage-check
WORKDIR /app
COPY scripts ./scripts
CMD ["npm", "run", "storage:check"]

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL="postgresql://adclare:adclare@localhost:5432/adclare?schema=public" npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
