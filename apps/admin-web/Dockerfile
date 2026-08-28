# Build context is the repository root: docker build -f apps/admin-web/Dockerfile .
FROM node:26-alpine AS build
# Node 26 no longer bundles Corepack; install it explicitly before enabling it.
RUN npm install -g corepack@0.35.0 --ignore-scripts && corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @okvns/shared run build \
  && pnpm --filter @okvns/admin-web run build

FROM nginx:1.31-alpine AS runtime
ENV OKVNS_API_BASE_URL=http://localhost:3000
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
# Keep static assets root-owned/read-only (S6504): the nginx user must not be
# able to rewrite its own served files if it's ever compromised.
COPY --from=build --chown=root:root --chmod=755 /repo/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/docker-entrypoint.sh /docker-entrypoint.d/40-okvns-env.sh
RUN chmod +x /docker-entrypoint.d/40-okvns-env.sh \
  # The base image's cache/log/pid dirs are root-owned; the nginx master process
  # needs to write to them itself since there's no root left to drop privileges from.
  && chown -R nginx:nginx /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid \
  # env.js is the one asset regenerated at container start; grant write access
  # to just that file, not the whole (otherwise read-only) webroot.
  && touch /usr/share/nginx/html/env.js && chown nginx:nginx /usr/share/nginx/html/env.js
EXPOSE 8080
USER nginx
# The stock nginx image runs scripts in /docker-entrypoint.d before starting.
