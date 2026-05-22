-- Tablas y columnas que existían en producción antes del sistema de migraciones
-- Este script es solo para setup local

-- Columnas faltantes en reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Columnas faltantes en clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Columnas faltantes en apartments
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS rooms INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]';

-- Tabla admins
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla cars
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    passengers INTEGER CHECK (passengers > 0),
    images TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla villas
CREATE TABLE IF NOT EXISTS villas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    images TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla yachts
CREATE TABLE IF NOT EXISTS yachts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    images TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla reviews (internas)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
