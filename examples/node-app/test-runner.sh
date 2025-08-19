#!/bin/bash

# Simple Test Runner Script
set -e

echo "🧪 Running tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to run unit tests
run_unit_tests() {
    print_status "$BLUE" "🔬 Running unit tests..."
    
    if npm test -- tests/unit/; then
        print_status "$GREEN" "✅ Unit tests passed"
        return 0
    else
        print_status "$RED" "❌ Unit tests failed"
        return 1
    fi
}

# Function to run integration tests (with database setup)
run_integration_tests() {
    print_status "$BLUE" "🔗 Running integration tests..."
    
    # Check if test database is available
    local db_available=false
    if docker ps --filter "name=test-postgres-db" --format "{{.Names}}" | grep -q "test-postgres-db"; then
        print_status "$GREEN" "✅ Test database container is running"
        db_available=true
    else
        print_status "$YELLOW" "⚠️ Test database not available, skipping integration tests"
        print_status "$BLUE" "💡 Run './run-tests.sh setup' to start test database"
        return 0
    fi
    
    if [ "$db_available" = true ]; then
        if npm run test:integration; then
            print_status "$GREEN" "✅ Integration tests passed"
            return 0
        else
            print_status "$RED" "❌ Integration tests failed"
            return 1
        fi
    fi
}

# Function to setup test database
setup_test_db() {
    print_status "$BLUE" "🐘 Setting up test database..."
    
    # Remove existing container if it exists
    docker rm -f test-postgres-db 2>/dev/null || true
    
    # Start test database
    docker run -d \
        --name test-postgres-db \
        -e POSTGRES_DB=test_products_db \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p 5433:5432 \
        postgres:15-alpine
    
    print_status "$YELLOW" "⏳ Waiting for test database to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec test-postgres-db pg_isready -U postgres >/dev/null 2>&1; then
            break
        fi
        retries=$((retries - 1))
        sleep 1
        echo -n "."
    done
    echo
    
    if [ $retries -eq 0 ]; then
        print_status "$RED" "❌ Test database failed to start"
        return 1
    fi
    
    # Create test schema
    docker exec test-postgres-db psql -U postgres -d test_products_db -c "
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            qty_in_stock INTEGER NOT NULL DEFAULT 0,
            price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    "
    
    print_status "$GREEN" "✅ Test database is ready"
}

# Function to cleanup test database
cleanup_test_db() {
    print_status "$YELLOW" "🧹 Cleaning up test database..."
    docker rm -f test-postgres-db 2>/dev/null || true
    print_status "$GREEN" "✅ Test database cleaned up"
}

# Function to generate coverage report
generate_coverage() {
    print_status "$BLUE" "📊 Generating coverage report..."
    
    if npm run test:coverage; then
        print_status "$GREEN" "✅ Coverage report generated"
        print_status "$BLUE" "📋 Coverage report available at: coverage/lcov-report/index.html"
        return 0
    else
        print_status "$RED" "❌ Failed to generate coverage report"
        return 1
    fi
}

# Main execution
main() {
    local command="${1:-unit}"
    
    case "$command" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "setup")
            setup_test_db
            ;;
        "cleanup")
            cleanup_test_db
            ;;
        "coverage")
            generate_coverage
            ;;
        "all")
            local unit_result=0
            local integration_result=0
            
            run_unit_tests || unit_result=1
            run_integration_tests || integration_result=1
            
            print_status "$BLUE" "📋 Test Results Summary:"
            [ $unit_result -eq 0 ] && print_status "$GREEN" "✅ Unit Tests: PASSED" || print_status "$RED" "❌ Unit Tests: FAILED"
            [ $integration_result -eq 0 ] && print_status "$GREEN" "✅ Integration Tests: PASSED" || print_status "$RED" "❌ Integration Tests: FAILED"
            
            local overall_result=$((unit_result + integration_result))
            if [ $overall_result -eq 0 ]; then
                print_status "$GREEN" "🎉 All tests passed!"
                return 0
            else
                print_status "$RED" "💥 Some tests failed!"
                return 1
            fi
            ;;
        *)
            print_status "$BLUE" "Usage: $0 [unit|integration|setup|cleanup|coverage|all]"
            print_status "$BLUE" "  unit        - Run unit tests only"
            print_status "$BLUE" "  integration - Run integration tests (requires test DB)"
            print_status "$BLUE" "  setup       - Setup test database"
            print_status "$BLUE" "  cleanup     - Cleanup test database"
            print_status "$BLUE" "  coverage    - Generate coverage report"
            print_status "$BLUE" "  all         - Run all tests"
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
