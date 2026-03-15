FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/

# Create directories (will be mounted as tmpfs)
RUN mkdir -p /app/secrets /app/temp-keys

# Set secure permissions
RUN chmod 700 /app/secrets /app/temp-keys

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/ || exit 1

CMD ["bun", "run", "start"]