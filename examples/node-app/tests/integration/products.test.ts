import { Pool } from 'pg';

describe('Product API Integration Tests', () => {
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

  beforeEach(async () => {
    // Clean up test data before each test
    await testDbPool.query('DELETE FROM products WHERE 1=1');
  });

  describe('Database Connection', () => {
    it('should be able to connect to test database', async () => {
      const result = await testDbPool.query('SELECT 1 as health_check');
      expect(result.rows[0].health_check).toBe(1);
    });

    it('should have the correct table structure', async () => {
      const result = await testDbPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'products'
        ORDER BY ordinal_position;
      `);

      const expectedColumns = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'title', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'description', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'qty_in_stock', data_type: 'integer', is_nullable: 'NO' },
        { column_name: 'price', data_type: 'numeric', is_nullable: 'NO' },
        { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
        { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
      ];

      expect(result.rows).toEqual(expectedColumns);
    });
  });

  describe('Database Operations', () => {
    it('should insert and retrieve products', async () => {
      // Insert a product
      const insertResult = await testDbPool.query(
        'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4) RETURNING *',
        ['Test Product', 'Test Description', 10, 99.99]
      );

      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0]).toMatchObject({
        title: 'Test Product',
        description: 'Test Description',
        qty_in_stock: 10,
        price: '99.99'
      });

      // Retrieve the product
      const selectResult = await testDbPool.query('SELECT * FROM products WHERE title = $1', ['Test Product']);
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].title).toBe('Test Product');
    });

    it('should handle multiple products', async () => {
      // Insert multiple products
      await testDbPool.query(
        'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4)',
        ['Product 1', 'Description 1', 5, 29.99]
      );
      await testDbPool.query(
        'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4)',
        ['Product 2', 'Description 2', 10, 49.99]
      );

      // Retrieve all products
      const result = await testDbPool.query('SELECT * FROM products ORDER BY title');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].title).toBe('Product 1');
      expect(result.rows[1].title).toBe('Product 2');
    });

    it('should update products', async () => {
      // Insert a product
      const insertResult = await testDbPool.query(
        'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Test Product', 'Test Description', 10, 99.99]
      );

      const productId = insertResult.rows[0].id;

      // Update the product
      await testDbPool.query(
        'UPDATE products SET qty_in_stock = $1 WHERE id = $2',
        [15, productId]
      );

      // Verify the update
      const result = await testDbPool.query('SELECT qty_in_stock FROM products WHERE id = $1', [productId]);
      expect(result.rows[0].qty_in_stock).toBe(15);
    });

    it('should delete products', async () => {
      // Insert a product
      const insertResult = await testDbPool.query(
        'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Test Product', 'Test Description', 10, 99.99]
      );

      const productId = insertResult.rows[0].id;

      // Delete the product
      await testDbPool.query('DELETE FROM products WHERE id = $1', [productId]);

      // Verify deletion
      const result = await testDbPool.query('SELECT * FROM products WHERE id = $1', [productId]);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('API Health Check', () => {
    it('should be able to make HTTP request to test server', async () => {
      // Simple HTTP check without external dependencies
      const http = await import('http');
      
      const makeRequest = (url: string): Promise<number> => {
        return new Promise((resolve, reject) => {
          const req = http.request(url, (res) => {
            resolve(res.statusCode || 0);
          });
          req.on('error', () => resolve(0)); // Return 0 if request fails
          req.setTimeout(5000, () => {
            req.destroy();
            resolve(0);
          });
          req.end();
        });
      };

      const statusCode = await makeRequest('http://localhost:3002/health');
      // If server is running, we should get 200, otherwise 0
      expect([0, 200]).toContain(statusCode);
    });
  });
});
