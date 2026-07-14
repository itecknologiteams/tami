# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @tami/api...
RUN pnpm --filter @tami/shared build
RUN pnpm --filter @tami/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @tami/api exec nest build
RUN pnpm --filter @tami/api --prod deploy --legacy /srv/api
RUN cp -R /workspace/apps/api/dist /srv/api/dist \
  && cd /srv/api && node_modules/.bin/prisma generate --schema prisma/schema.prisma

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /srv/api
COPY --from=build /srv/api ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
