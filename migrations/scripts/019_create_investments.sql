CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(100),
    address VARCHAR(255) NOT NULL,
    description TEXT,
    bathrooms INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    price DECIMAL(10, 2),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
