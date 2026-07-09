# Build context is the repository root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @okvns/shared run build \
  && pnpm --filter @okvns/domain run build \
  && pnpm --filter @okvns/yaml run build \
  && pnpm --filter @okvns/application run build \
  && pnpm --filter @okvns/api run build
# Produce a self-contained deployment with only production dependencies.
RUN pnpm --filter @okvns/api deploy --prod /app

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV OKVNS_API_PORT=3000
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
USER node
# Logs are written to stdout/stderr by the Nest logger.
CMD ["node", "dist/main.js"]
