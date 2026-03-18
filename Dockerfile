FROM node:22-alpine

WORKDIR /app

# Copy pre-built dist, server entrypoint, and runtime source modules imported by server.js
COPY dist/ ./dist/
COPY server.js ./
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "server.js"]
