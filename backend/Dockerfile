# syntax=docker/dockerfile:1.7
# Multi-stage build: install → build → minimal runtime. Build from the repository root:
#   docker build -f backend/Dockerfile -t stellar-reconcile-api .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/core/package.json packages/core/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages ./packages
COPY backend ./backend
RUN pnpm run build && pnpm --filter @stellar-reconcile/api --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./
COPY --chown=app:app database ./database
USER app
EXPOSE 4020
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4020/health || exit 1
CMD ["node", "dist/server.js"]
