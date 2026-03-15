## API Documentation

The example Node.js application provides a REST API for managing products. Here are the available endpoints:

### Base URL
```
http://localhost:3000
```

### API Endpoints

#### 1. Health Check
**GET** `/`
```bash
curl -X GET http://localhost:3000/
```

**Response:**
```json
{
  "isSuccess": true,
  "status": 200,
  "message": "Server is Live 🚀🚀🚀",
  "data": null
}
```

#### 2. Get All Products
**GET** `/products`
```bash
# Get all products
curl -X GET http://localhost:3000/products

# Search products by title
curl -X GET "http://localhost:3000/products?q=laptop"
```

**Response:**
```json
{
  "isSuccess": true,
  "status": 200,
  "message": "Products found Successfully",
  "data": [
    {
      "id": "uuid-string",
      "title": "Product Name",
      "description": "Product Description",
      "qtyInStock": 10,
      "price": 99.99
    }
  ]
}
```

#### 3. Create Product
**POST** `/products`
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Product",
    "description": "Product description",
    "qtyInStock": 50,
    "price": 29.99
  }'
```

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "qtyInStock": "number",
  "price": "number"
}
```

#### 4. Update Product
**PUT** `/products/:id`
```bash
curl -X PUT http://localhost:3000/products/<product-id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Product Name",
    "price": 39.99
  }'
```

**Request Body (all fields optional):**
```json
{
  "title": "string",
  "description": "string",
  "qtyInStock": "number",
  "price": "number"
}
```

#### 5. Delete Product
**DELETE** `/products/:id`
```bash
curl -X DELETE http://localhost:3000/products/<product-id>
```

**Response:**
```json
{
  "isSuccess": true,
  "status": 200,
  "message": "Product Delete Successfully",
  "data": null
}
```

### Error Responses
```json
{
  "isSuccess": false,
  "status": 400,
  "message": "Invalid Schema",
  "data": "error details"
}
```

## Docker Example Usage

### Running the Example App with Docker
```bash

# Build the Docker image
docker build -t product-api .

# Run the container
docker run -d -p 3000:3000 --name product-api-container product-api

# Test the API
curl http://localhost:3000/

# View logs
docker logs product-api-container

# Stop and remove
docker stop product-api-container
docker rm product-api-container
```