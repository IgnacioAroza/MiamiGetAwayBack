CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER,
    price NUMERIC(10, 2),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experience_inquiries (
    id SERIAL PRIMARY KEY,
    experience_id INTEGER REFERENCES experiences(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
    created_at TIMESTAMP DEFAULT NOW()
);
