import { Pool } from 'pg';

// Test database configuration
export const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  database: process.env.TEST_DB_NAME || 'test_products_db',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

let testDbPool: Pool | null = null;

export const getTestDbPool = (): Pool => {
  if (!testDbPool) {
    testDbPool = new Pool(testDbConfig);
  }
  return testDbPool;
};

export const closeTestDb = async (): Promise<void> => {
  if (testDbPool) {
    await testDbPool.end();
    testDbPool = null;
  }
};

export const setupTestDb = async (): Promise<void> => {
  const pool = getTestDbPool();
  
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      qty_in_stock INTEGER NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Test database setup complete');
};

export const cleanupTestDb = async (): Promise<void> => {
  const pool = getTestDbPool();
  
  // Clean up test data
  await pool.query('DELETE FROM products WHERE 1=1');
  
  console.log('🧹 Test database cleaned up');
};

export const dropTestDb = async (): Promise<void> => {
  const pool = getTestDbPool();
  
  // Drop tables
  await pool.query('DROP TABLE IF EXISTS products CASCADE');
  
  console.log('🗑️ Test database dropped');
};
