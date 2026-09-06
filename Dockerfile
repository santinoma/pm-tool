# Production image — multi-stage build, runs `next build`'s standalone output with `node server.js`
# instead of the dev server used by Dockerfile.dev. Works on linux/arm64 (Oracle Ampere) and amd64.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.platform.config.ts prisma.tenant.config.ts ./
COPY prisma ./prisma
# Placeholders so postinstall's `prisma generate` (introspection only, no real connection) succeeds.
ENV PLATFORM_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV TENANT_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV PLATFORM_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV TENANT_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output already contains a trimmed node_modules + server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schemas + migrations are needed at runtime (tenant provisioning shells out to
# `prisma migrate deploy`, and the CLI reads these files, not just the generated client).
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.platform.config.ts /app/prisma.tenant.config.ts ./
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
