FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS test

COPY . .

CMD ["npm", "run", "test:cov"]

FROM test AS build

RUN npm run build

FROM node:22-alpine AS release

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY README.md LICENSE* ./

CMD ["node", "dist/index.js"]