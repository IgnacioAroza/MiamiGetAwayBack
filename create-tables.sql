-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Tabla de departamentos
CREATE TABLE IF NOT EXISTS apartments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}'
);

-- Tabla de villas
CREATE TABLE IF NOT EXISTS villas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}'
);

-- Tabla de yates
CREATE TABLE IF NOT EXISTS yachts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}'
);

-- Tabla de autos
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}'
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL
); 