FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Create log directory
RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "src/index.js"]
