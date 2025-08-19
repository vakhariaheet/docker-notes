import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_DB_CONTAINER = 'test-postgres-db';

const globalTeardown = async (): Promise<void> => {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Stop and remove test database container
    await execAsync(`docker rm -f ${TEST_DB_CONTAINER}`);
    console.log('🗑️ Removed test database container');
    
    console.log('✅ Integration test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup integration test environment:', error);
    // Don't throw error to avoid failing tests
  }
};

export default globalTeardown;
