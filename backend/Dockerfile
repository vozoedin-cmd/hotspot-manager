FROM node:20-alpine

WORKDIR /app

# postgresql-client for pg_dump (backup service)
RUN apk add --no-cache postgresql-client

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Create log and backup directories
RUN mkdir -p logs backups

EXPOSE 3000

CMD ["node", "src/index.js"]
