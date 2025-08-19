#!/bin/bash

# Optimized Docker Build Script with Environment Setup
set -e

echo "🏗️ Starting optimized Docker build process..."

# Source environment variables
source ./env-setup.sh

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build optimized image
build_optimized_image() {
    local image_name="${1:-products-api}"
    local tag="${2:-latest}"
    
    echo "📦 Building optimized Docker image: ${image_name}:${tag}"
    
    # Build multi-stage image
    docker build \
        --build-arg NODE_ENV="$NODE_ENV" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg BUILD_VERSION="$BUILD_VERSION" \
        --build-arg BUILD_COMMIT="$BUILD_COMMIT" \
        -t "${image_name}:${tag}" \
        -f Dockerfile \
        .
    
    echo "✅ Built image: ${image_name}:${tag}"
}

# Function to analyze image size
analyze_image() {
    local image_name="$1"
    echo "📊 Analyzing image size..."
    docker images "${image_name}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # Show layer information
    echo "📋 Image layers:"
    docker history "${image_name}" --format "table {{.CreatedBy}}\t{{.Size}}"
}

# Function to run security scan (if available)
security_scan() {
    local image_name="$1"
    if command -v docker >/dev/null && docker version --format '{{.Server.Version}}' | grep -q "Desktop"; then
        echo "🔒 Running security scan..."
        docker scout quickview "$image_name" 2>/dev/null || echo "⚠️ Docker Scout not available"
    fi
}

# Function to verify build artifacts
verify_build() {
    local image_name="$1"
    echo "🔍 Verifying build artifacts..."
    
    # Check if image exists
    if ! docker images -q "$image_name" >/dev/null; then
        echo "❌ Image $image_name not found"
        exit 1
    fi
    
    # Check for dev dependencies in production image
    echo "🕵️ Checking for dev dependencies in final image..."
    dev_deps=$(docker run --rm "$image_name" sh -c "ls -la node_modules/ 2>/dev/null | grep -E '(eslint|jest|typescript|@types)' || echo 'No dev dependencies found'")
    echo "$dev_deps"
    
    # Verify application files exist
    echo "📁 Verifying application files..."
    docker run --rm "$image_name" sh -c "ls -la dist/"
    
    echo "✅ Build verification complete"
}

# Main execution
main() {
    local image_name="${1:-products-api}"
    local tag="${2:-latest}"
    
    check_docker
    build_optimized_image "$image_name" "$tag"
    analyze_image "${image_name}:${tag}"
    verify_build "${image_name}:${tag}"
    security_scan "${image_name}:${tag}"
    
    echo "🎉 Optimized Docker build complete!"
    echo "📋 Image details:"
    docker inspect "${image_name}:${tag}" --format='
    Image: {{.RepoTags}}
    Size: {{.Size}} bytes
    Created: {{.Created}}
    Architecture: {{.Architecture}}
    OS: {{.Os}}
    '
    
    echo "🚀 To run the container:"
    echo "docker run -p 3000:3000 --env-file .env ${image_name}:${tag}"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
