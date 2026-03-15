import Express from 'express';
import cors from 'cors';
import { ProductSchema } from './types.d';

const app = Express();

// Middlewares
app.use(cors());
app.use(Express.json());

// In-memory storage for products (replacing database)
let products: Array<{
    id: string;
    title: string;
    description: string;
    qtyInStock: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}> = [
    {
        id: '1',
        title: 'Sample Product 1',
        description: 'This is a sample product for demonstration',
        qtyInStock: 10,
        price: 29.99,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '2',
        title: 'Sample Product 2',
        description: 'Another sample product',
        qtyInStock: 5,
        price: 49.99,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Helper function to generate simple IDs
const generateId = () => Date.now().toString();

app.get('/', (req, res) => {
    return res.status(200).json({
        isSuccess: true,
        status: 200,
        message: "Server is Live 🚀🚀",
        data: null
    })
})

app.get('/products', (req, res) => {
    try {
        const { q = "" } = req.query as { q?: string };
        
        let filteredProducts = products;
        
        if (q) {
            filteredProducts = products.filter((product) =>
                product.title.toLowerCase().includes(q.toLowerCase())
            );
        }
        
        if (filteredProducts.length === 0) {
            return res.status(404).json({
                isSuccess: true,
                status: 404,
                message: "No Products Found",
                data: filteredProducts
            })
        }
        
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Products found Successfully",
            data: filteredProducts
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

app.post('/products', (req, res) => {
    try {
        const product = ProductSchema.omit({ id: true }).parse(req.body);
        
        const newProduct = {
            id: generateId(),
            title: product.title,
            description: product.description,
            qtyInStock: product.qtyInStock,
            price: product.price,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        products.push(newProduct);
        
        return res.status(201).json({
            isSuccess: true,
            status: 201,
            message: "Product created successfully",
            data: newProduct
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

app.put('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const productData = ProductSchema.omit({ id: true }).partial({ description: true, price: true, qtyInStock: true, title: true }).parse(req.body);
        
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({
                isSuccess: false,
                status: 404,
                message: "Product not found",
                data: null
            });
        }
        
        // Check if there are fields to update
        if (Object.keys(productData).length === 0) {
            return res.status(400).json({
                isSuccess: false,
                status: 400,
                message: "No fields to update",
                data: null
            });
        }
        
        // Update the product
        const updatedProduct = {
            ...products[productIndex],
            ...productData,
            updatedAt: new Date()
        };
        
        products[productIndex] = updatedProduct;
        
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Product updated successfully",
            data: updatedProduct
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

app.delete('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({
                isSuccess: false,
                status: 404,
                message: "Product not found",
                data: null
            });
        }
        
        // Remove the product from the array
        products.splice(productIndex, 1);
        
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
app.get('/health', (req, res) => {
    try {
        const healthStatus = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.BUILD_VERSION || 'unknown',
            commit: process.env.BUILD_COMMIT || 'unknown',
            productsCount: products.length
        };
        
        return res.status(200).json(healthStatus);
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