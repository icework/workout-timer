FROM node:22-alpine

WORKDIR /app

# Copy only what's needed for running
COPY dist/ ./dist/
COPY server.js ./
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "server.js"]
