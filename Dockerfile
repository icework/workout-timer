FROM node:22-alpine

WORKDIR /app

# Copy pre-built dist and server
COPY dist/ ./dist/
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
