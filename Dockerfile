# Lightweight production image for Node.js API (Express)
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first (leverage Docker layer caching)
COPY package*.json ./
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy application source
COPY . .

# Environment
ENV NODE_ENV=production
# Cloud Run sets PORT; default to 3000 for local runs
ENV PORT=3000

# Expose for local runs (Cloud Run ignores EXPOSE but it’s helpful)
EXPOSE 3000

# Use non-root user for better security
RUN adduser -D appuser && chown -R appuser:appuser /usr/src/app
USER appuser

# Start the server
CMD ["node", "server.js"]