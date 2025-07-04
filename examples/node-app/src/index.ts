import Express from 'express';
import cors from 'cors';
import { ProductSchema, type Product } from './types.d';

const app = Express();

// Middlewares
app.use(cors());


const DB: {
    products: Product[]
} = {
    products: []
};

app.get('/', (req, res) => {
    return res.status(200).json({
        isSuccess: true,
        status: 200,
        message: "Server is Live 🚀🚀🚀",
        data: null
    })
})

app.get('/products', (req, res) => {
    const { q = "" } = req.query as { q?: string };
    const products = DB.products.filter(product => product.title.toLowerCase().includes(q.toLocaleLowerCase()));
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
        message: "Products found Succesfully",
        data: products
    })
})
app.post('/products', (req, res) => {
    try {
        const product = ProductSchema.omit({ id: true }).parse(req.body);
        const dbProduct = {
            ...product,
            id: crypto.randomUUID()
        }
        DB.products.push(dbProduct);
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Products found Succesfully",
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

app.put('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const product = ProductSchema.omit({ id: true }).partial({ description: true, price: true, qtyInStock: true, title: true }).parse(req.body);
        const dbProduct = DB.products.findIndex((product) => product.id === productId);
        if (!DB.products[ dbProduct ]) {
            return res.status(404).json({
                isSuccess: false,
                status: 404,
                message: "Products Not found",
                data: null
            })
        }

        DB.products[ dbProduct ] = {
            ...DB.products[ dbProduct ],
            ...product
        }
        return res.status(200).json({
            isSuccess: true,
            status: 200,
            message: "Product Updated Succesfully",
            data: DB.products[ dbProduct ]
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
app.delete('/products/:id', (req, res) => {
    const productId = req.params.id;
    const dbProduct = DB.products.find((product) => product.id === productId);
    if (dbProduct) {
        return res.status(404).json({
            isSuccess: false,
            status: 404,
            message: "Products Not found",
            data: null
        })
    }
    DB.products = DB.products.filter(product => product === dbProduct);
    return res.json({
        isSuccess: true,
        status: 200,
        message: "Product Delete Succesfully",
        data: null
    })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
    console.log(`Server Started on port : ${PORT} 🚀🚀🚀`)
})