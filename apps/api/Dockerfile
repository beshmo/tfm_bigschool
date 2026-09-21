# syntax=docker/dockerfile:1
# Build context is the repository root: docker build -f apps/api/Dockerfile .

FROM node:26-alpine AS build
WORKDIR /repo
# Node 26 no longer bundles Corepack, so install it explicitly.
RUN npm install --global corepack@0.35.0 && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @okvns/api...

# Workspace packages first, in dependency order, then the API.
RUN pnpm --filter @okvns/shared run build \
 && pnpm --filter @okvns/domain run build \
 && pnpm --filter @okvns/yaml run build \
 && pnpm --filter @okvns/application run build \
 && pnpm --filter @okvns/api run build

# Self-contained production tree: dist, migrations, scripts and prod dependencies only.
RUN pnpm --filter @okvns/api deploy --prod /app

FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
    OKVNS_API_PORT=3000
WORKDIR /app
# Everything stays root-owned and read-only for the unprivileged runtime user.
COPY --from=build /app ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
