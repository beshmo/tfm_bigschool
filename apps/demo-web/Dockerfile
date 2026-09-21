# syntax=docker/dockerfile:1
# Build context is the repository root: docker build -f apps/demo-web/Dockerfile .
# The demo consumer is not part of production image publishing.

FROM node:26-alpine AS build
WORKDIR /repo
# Node 26 no longer bundles Corepack, so install it explicitly.
RUN npm install --global corepack@0.35.0 && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/okvns-wrapper packages/okvns-wrapper
COPY apps/demo-web apps/demo-web
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @okvns/demo-web...

RUN pnpm --filter @okvns/shared run build \
 && pnpm --filter @okvns/wrapper run build \
 && pnpm --filter @okvns/demo-web run build

FROM nginx:1.31-alpine AS runtime
# Reachable from the user's browser; written into env.js when the container starts.
ENV OKVNS_API_BASE_URL=http://localhost:3000

COPY apps/demo-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/demo-web/dist /usr/share/nginx/html
COPY apps/demo-web/docker-entrypoint.sh /docker-entrypoint.d/40-okvns-env.sh

RUN chmod 755 /docker-entrypoint.d/40-okvns-env.sh \
 && chown nginx:nginx /usr/share/nginx/html/env.js \
 && chown -R nginx:nginx /var/cache/nginx \
 && touch /run/nginx.pid \
 && chown nginx:nginx /run/nginx.pid

USER nginx
EXPOSE 8080
