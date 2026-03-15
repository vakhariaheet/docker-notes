-- Initialize the products database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    qty_in_stock INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO products (title, description, qty_in_stock, price) VALUES
('Laptop', 'High-performance laptop for developers', 10, 999.99),
('Wireless Mouse', 'Ergonomic wireless mouse', 25, 29.99),
('Mechanical Keyboard', 'RGB mechanical keyboard', 15, 149.99),
('Monitor', '27-inch 4K monitor', 8, 399.99),
('Webcam', 'HD webcam for video calls', 20, 79.99);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_products_title ON products USING gin(to_tsvector('english', title));