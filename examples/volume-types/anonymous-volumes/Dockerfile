FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/

# Create cache directories
RUN mkdir -p /app/cache /app/temp

# Anonymous volumes for temporary storage
VOLUME ["/app/cache", "/app/temp"]

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/ || exit 1

CMD ["bun", "run", "start"]