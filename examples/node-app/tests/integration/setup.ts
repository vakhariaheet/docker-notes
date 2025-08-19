import { Pool } from 'pg';

const testDbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'test_products_db',
  user: 'postgres',
  password: 'postgres',
};

let testDbPool: Pool;

beforeAll(async () => {
  testDbPool = new Pool(testDbConfig);
});

afterAll(async () => {
  if (testDbPool) {
    await testDbPool.end();
  }
});

afterEach(async () => {
  // Clean up test data after each test
  await testDbPool.query('DELETE FROM products WHERE 1=1');
});

// Global test timeout for integration tests
jest.setTimeout(60000);
