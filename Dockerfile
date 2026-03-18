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

# Declare the data directory as a volume so orchestration platforms can mount
# persistent storage here. Without a mounted volume every new container starts
# with an empty /app/data directory and all user data is lost on redeployment.
# Set the STORAGE_PATH env var to override the path (e.g. a mounted NFS share).
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.js"]
