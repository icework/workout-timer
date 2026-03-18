FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Copy the server entrypoint, runtime source modules, and freshly built frontend assets.
COPY server.js ./
COPY src/ ./src/
COPY --from=builder /app/dist ./dist/

EXPOSE 3000

CMD ["node", "server.js"]
