# Build context is the repository root: docker build -f apps/admin-web/Dockerfile .
FROM node:26-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @okvns/shared run build \
  && pnpm --filter @okvns/admin-web run build

FROM nginx:1.31-alpine AS runtime
ENV OKVNS_API_BASE_URL=http://localhost:3000
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/docker-entrypoint.sh /docker-entrypoint.d/40-okvns-env.sh
RUN chmod +x /docker-entrypoint.d/40-okvns-env.sh
EXPOSE 8080
# The stock nginx image runs scripts in /docker-entrypoint.d before starting.
