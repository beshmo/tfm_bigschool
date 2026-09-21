# syntax=docker/dockerfile:1
# Build context is the repository root: docker build -f apps/admin-web/Dockerfile .

FROM node:26-alpine AS build
WORKDIR /repo
# Node 26 no longer bundles Corepack, so install it explicitly.
RUN npm install --global corepack@0.35.0 && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/admin-web apps/admin-web
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @okvns/admin-web...

RUN pnpm --filter @okvns/shared run build \
 && pnpm --filter @okvns/admin-web run build

FROM nginx:1.31-alpine AS runtime
# Reachable from the user's browser; written into env.js when the container starts.
ENV OKVNS_API_BASE_URL=http://localhost:3000

COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/docker-entrypoint.sh /docker-entrypoint.d/40-okvns-env.sh

# Static assets stay root-owned and read-only; only env.js (rewritten at start)
# and nginx's own runtime files belong to the unprivileged user.
RUN chmod 755 /docker-entrypoint.d/40-okvns-env.sh \
 && chown nginx:nginx /usr/share/nginx/html/env.js \
 && chown -R nginx:nginx /var/cache/nginx \
 && touch /run/nginx.pid \
 && chown nginx:nginx /run/nginx.pid

USER nginx
EXPOSE 8080
