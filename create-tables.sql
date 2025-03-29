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
    images JSONB[] NOT NULL DEFAULT '{}'
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
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    notes TEXT
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL
);

-- Tabla de reservas    
CREATE TABLE IF NOT EXISTS reservations (
   id SERIAL PRIMARY KEY,
    apartment_id INTEGER REFERENCES admin_apartments(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) NOT NULL,
    other_expenses DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_due DECIMAL(10,2) NOT NULL,
    parking_fee DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out')) DEFAULT 'pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'complete')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos de reservas
CREATE TABLE IF NOT EXISTS reservation_payments (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

-- Tabla de adminApartments
CREATE TABLE IF NOT EXISTS admin_apartments (
    id SERIAL PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL,
    unit_number VARCHAR(100) NOT NULL,
    distribution VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) NOT NULL,
    images JSONB[] DEFAULT '[]'
);
