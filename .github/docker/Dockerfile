FROM node:24-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

FROM base AS deps

RUN pnpm install --frozen-lockfile

FROM deps AS audit

CMD ["pnpm", "audit", "--audit-level=low"]

FROM deps AS linter

COPY . .
CMD ["pnpm", "lint:no-spec"]

FROM deps AS check

COPY . .
CMD ["pnpm", "check"]

FROM deps AS test

COPY . .
CMD ["pnpm", "test:cov"]

FROM deps AS build

COPY . .
RUN pnpm build

FROM node:24-alpine AS release

HEALTHCHECK NONE
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY README.md LICENSE* ./

USER node
CMD ["node", "dist/index.js"]
