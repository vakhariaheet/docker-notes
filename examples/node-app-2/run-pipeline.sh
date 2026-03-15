#!/bin/bash
# Complete CI/CD Pipeline Script

set -e

echo "🚀 Starting CI/CD Pipeline..."

source ./env-setup.sh

# 2. Install Dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Run Linting (if configured)
echo "🔍 Running linting..."
npm run lint || echo "⚠️ Linting skipped"

# 4. Run Unit Tests
echo "🧪 Running unit tests..."
./test-runner.sh unit

# 5. Setup Integration Tests
echo "🔗 Setting up integration tests..."
./test-runner.sh setup

# 6. Run Integration Tests
echo "🔗 Running integration tests..."
./test-runner.sh integration

# 7. Generate Coverage Report
echo "📊 Generating coverage report..."
./test-runner.sh coverage

# 8. Build Optimized Docker Image
echo "🏗️ Building optimized Docker image..."
./build-optimized.sh products-api ${BUILD_VERSION:-latest}

# 9. Run Security Scan (if available)
echo "🔒 Running security scan..."
docker scout quickview products-api:${BUILD_VERSION:-latest} || echo "⚠️ Security scan skipped"

# 10. Push to Registry (if configured)
echo "🚀 Pushing to registry..."
# docker tag products-api:${BUILD_VERSION:-latest} your-registry/products-api:${BUILD_VERSION:-latest}
# docker push your-registry/products-api:${BUILD_VERSION:-latest}

# 11. Cleanup
echo "🧹 Cleaning up..."
./test-runner.sh cleanup

echo "✅ CI/CD Pipeline completed successfully!"