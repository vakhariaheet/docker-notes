import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_DB_CONTAINER = 'test-postgres-db';
const TEST_DB_PORT = '5433';

const globalSetup = async (): Promise<void> => {
  console.log('🚀 Setting up integration test environment...');

  try {
    // Check if test database container is already running
    try {
      const { stdout } = await execAsync(`docker ps --filter "name=${TEST_DB_CONTAINER}" --format "{{.Names}}"`);
      if (stdout.trim() === TEST_DB_CONTAINER) {
        console.log('✅ Test database container already running');
        return;
      }
    } catch (error) {
      // Container doesn't exist, continue with setup
    }

    // Remove any existing test database container
    try {
      await execAsync(`docker rm -f ${TEST_DB_CONTAINER}`);
      console.log('🗑️ Removed existing test database container');
    } catch (error) {
      // Container doesn't exist, continue
    }

    // Start temporary PostgreSQL container for testing
    const dockerCommand = `
      docker run -d \
        --name ${TEST_DB_CONTAINER} \
        -e POSTGRES_DB=test_products_db \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p ${TEST_DB_PORT}:5432 \
        postgres:15-alpine
    `.replace(/\s+/g, ' ').trim();

    await execAsync(dockerCommand);
    console.log('🐘 Started temporary PostgreSQL container for testing');

    // Wait for database to be ready
    let retries = 30;
    while (retries > 0) {
      try {
        await execAsync(`docker exec ${TEST_DB_CONTAINER} pg_isready -U postgres`);
        console.log('✅ Test database is ready');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Test database failed to start');
        }
        console.log(`⏳ Waiting for test database... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Create test database schema
    const createSchemaCommand = `
      docker exec ${TEST_DB_CONTAINER} psql -U postgres -d test_products_db -c "
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
    `;

    await execAsync(createSchemaCommand);
    console.log('🏗️ Created test database schema');

    console.log('✅ Integration test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
};

export default globalSetup;
