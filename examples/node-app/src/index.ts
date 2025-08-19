import Express from 'express';
import cors from 'cors';
import { ProductSchema } from './types.d';
import pool, { initDatabase } from './database';

const app = Express();

// Middlewares
app.use(cors());
app.use(Express.json());

// Initialize database on startup
initDatabase().catch(console.error);

app.get('/', (req, res) => {
    return res.status(200).json({
        isSuccess: true,
        status: 200,
        message: "Server is Live 🚀🚀",
        data: null
    })
})

app.get('/products', async (req, res) => {
    try {
        const { q = "" } = req.query as { q?: string };
        let query = 'SELECT id, title, description, qty_in_stock as "qtyInStock", price FROM products';
        let params: any[] = [];
        
        if (q) {
            query += ' WHERE LOWER(title) LIKE LOWER($1)';
            params = [`%${q}%`];
        }
        
        const result = await pool.query(query, params);
        const products = result.rows;
        
        if (products.length === 0) {
            return res.status(404).json({
                isSuccess: true,
                status: 404,
                message: "No Products Found",
                data: products
            })
        }
        
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Products found Successfully",
            data: products
        })
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            isSuccess: false,
            status: 500,
            message: "Internal Server Error",
            data: null
        })
    }
})

app.post('/products', async (req, res) => {
    try {
        const product = ProductSchema.omit({ id: true }).parse(req.body);
        
        const result = await pool.query(
            'INSERT INTO products (title, description, qty_in_stock, price) VALUES ($1, $2, $3, $4) RETURNING id, title, description, qty_in_stock as "qtyInStock", price',
            [product.title, product.description, product.qtyInStock, product.price]
        );
        
        const dbProduct = result.rows[0];
        
        return res.status(201).json({
            isSuccess: true,
            status: 201,
            message: "Product created successfully",
            data: dbProduct
        })
    }
    catch (error) {
        console.log(error)
        return res.status(400).json({
            isSuccess: false,
            status: 400,
            message: "Invalid Schema",
            data: error
        })
    }
})

app.put('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const product = ProductSchema.omit({ id: true }).partial({ description: true, price: true, qtyInStock: true, title: true }).parse(req.body);
        
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        
        if (product.title !== undefined) {
            updateFields.push(`title = $${paramCount++}`);
            values.push(product.title);
        }
        if (product.description !== undefined) {
            updateFields.push(`description = $${paramCount++}`);
            values.push(product.description);
        }
        if (product.qtyInStock !== undefined) {
            updateFields.push(`qty_in_stock = $${paramCount++}`);
            values.push(product.qtyInStock);
        }
        if (product.price !== undefined) {
            updateFields.push(`price = $${paramCount++}`);
            values.push(product.price);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                isSuccess: false,
                status: 400,
                message: "No fields to update",
                data: null
            });
        }
        
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(productId);
        
        const query = `
            UPDATE products 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramCount} 
            RETURNING id, title, description, qty_in_stock as "qtyInStock", price
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                isSuccess: false,
                status: 404,
                message: "Product not found",
                data: null
            });
        }
        
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Product updated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.log(error)
        return res.status(400).json({
            isSuccess: false,
            status: 400,
            message: "Invalid Schema",
            data: error
        })
    }
})

app.delete('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING id',
            [productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                isSuccess: false,
                status: 404,
                message: "Product not found",
                data: null
            });
        }
        
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Product deleted successfully",
            data: null
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            isSuccess: false,
            status: 500,
            message: "Internal Server Error",
            data: null
        });
    }
})

// Health check endpoint for Docker health checks and monitoring
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbResult = await pool.query('SELECT 1 as health_check');
        const dbHealthy = dbResult.rows.length > 0;
        
        const healthStatus = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbHealthy ? 'connected' : 'disconnected',
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.BUILD_VERSION || 'unknown',
            commit: process.env.BUILD_COMMIT || 'unknown'
        };
        
        if (dbHealthy) {
            return res.status(200).json(healthStatus);
        } else {
            return res.status(503).json({
                ...healthStatus,
                status: 'SERVICE_UNAVAILABLE',
                message: 'Database connection failed'
            });
        }
    } catch (error) {
        console.error('Health check failed:', error);
        return res.status(503).json({
            status: 'SERVICE_UNAVAILABLE',
            timestamp: new Date().toISOString(),
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

const PORT = process.env.PORT ?? 3000
app.listen(PORT, async () => {
    console.log(`Server Started on port : ${PORT} 🚀🚀🚀`)
})