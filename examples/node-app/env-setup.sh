#!/bin/bash

# Environment Variables Setup Script
# This script sets up environment variables for Docker build

set -e  # Exit on any error

echo "🔧 Setting up environment variables for Docker build..."

# Default values
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-products_db}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}

# Build-time variables
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export BUILD_VERSION=${BUILD_VERSION:-latest}
export BUILD_COMMIT=${BUILD_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}

echo "✅ Environment variables configured:"
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo "  DB_NAME: $DB_NAME"
echo "  BUILD_DATE: $BUILD_DATE"
echo "  BUILD_VERSION: $BUILD_VERSION"
echo "  BUILD_COMMIT: $BUILD_COMMIT"

echo "🚀 Ready for Docker build!"
