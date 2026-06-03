CREATE TABLE IF NOT EXISTS transfer_vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('sedan', 'suv', 'van')),
    capacity INTEGER NOT NULL,
    luggage_capacity INTEGER NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_inquiries (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES transfer_vehicles(id) ON DELETE SET NULL,
    pick_up VARCHAR(255) NOT NULL,
    drop_off VARCHAR(255) NOT NULL,
    date VARCHAR(10) NOT NULL,
    time VARCHAR(5) NOT NULL,
    passengers INTEGER NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('airport_transfer', 'business_travel', 'sports_events', 'private_events', 'yacht_transfer', 'video_film_production', 'hourly')),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
);
