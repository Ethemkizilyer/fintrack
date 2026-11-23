FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

FROM dependencies AS build
COPY . .

RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    npm run db:generate -w @fintrack/api

RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules

COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build --chown=node:node /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=build --chown=node:node /app/apps/api/src ./apps/api/src

COPY --from=build --chown=node:node /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/tsconfig.base.json ./tsconfig.base.json

WORKDIR /app/apps/api
USER node

EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && exec /app/node_modules/.bin/tsx src/server.ts"]
