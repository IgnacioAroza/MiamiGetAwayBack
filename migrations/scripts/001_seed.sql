-- Script para insertar datos de demostración

-- Datos para la tabla cars
INSERT INTO cars (brand, model, description, price, images) VALUES
('BMW', 'X5', 'SUV de lujo con todas las comodidades para explorar Miami', 120.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501234/miami_getaway/cars/bmw_x5_1.jpg", "alt": "BMW X5 frontal"}]'::JSONB),
('Mercedes-Benz', 'C-Class Convertible', 'Convertible elegante ideal para recorrer Ocean Drive', 150.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501235/miami_getaway/cars/mercedes_c_1.jpg", "alt": "Mercedes-Benz C-Class"}]'::JSONB),
('Jeep', 'Wrangler', 'Vehículo robusto perfecto para aventuras en los Everglades', 95.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501236/miami_getaway/cars/jeep_wrangler_1.jpg", "alt": "Jeep Wrangler"}]'::JSONB);

-- Datos para la tabla villas
INSERT INTO villas (name, description, address, capacity, rooms, bathrooms, price, images) VALUES
('Villa Bahía', 'Espectacular villa con vista al mar y acceso directo a la playa', '123 Palm Island Dr, Miami Beach, FL 33139', 8, 4, 3, 750.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501237/miami_getaway/villas/villa_bahia_1.jpg", "alt": "Villa Bahía frente al mar"}]'::JSONB),
('Villa Palmera', 'Hermosa villa con piscina privada y jardín tropical', '456 Coconut Grove Ave, Miami, FL 33133', 6, 3, 2, 550.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501238/miami_getaway/villas/villa_palmera_1.jpg", "alt": "Villa Palmera con piscina"}]'::JSONB),
('Villa Oasis', 'Lujosa villa con spa, sauna y sala de cine', '789 Coral Way, Coral Gables, FL 33134', 10, 5, 4, 950.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501239/miami_getaway/villas/villa_oasis_1.jpg", "alt": "Villa Oasis con jardín"}]'::JSONB);

-- Datos para la tabla yatchs
INSERT INTO yatchs (name, description, capacity, price, images) VALUES
('Serenity', 'Yate de lujo de 75 pies con 3 camarotes y terraza panorámica', 12, 1200.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501240/miami_getaway/yachts/serenity_1.jpg", "alt": "Yate Serenity"}]'::JSONB),
('Ocean Breeze', 'Yate deportivo de 60 pies ideal para navegar por Biscayne Bay', 8, 950.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501241/miami_getaway/yachts/ocean_breeze_1.jpg", "alt": "Yate Ocean Breeze"}]'::JSONB),
('Royal Blue', 'Catamaran de 55 pies perfecto para fiestas y eventos especiales', 20, 1500.00, '[{"url": "https://res.cloudinary.com/dcxa0ozit/image/upload/v1714501242/miami_getaway/yachts/royal_blue_1.jpg", "alt": "Catamaran Royal Blue"}]'::JSONB);

-- Datos para la tabla clients
INSERT INTO clients (name, lastname, email, phone, address, city, country, notes) VALUES
('John', 'Smith', 'john.smith@example.com', '+1 (305) 555-1234', '123 Ocean Drive', 'New York', 'USA', 'Cliente frecuente, prefiere apartamentos cerca de South Beach'),
('Maria', 'González', 'maria.gonzalez@example.com', '+34 912 345 678', 'Calle Mayor 12', 'Madrid', 'España', 'Ha reservado varias veces villas para vacaciones familiares'),
('Thomas', 'Müller', 'thomas.muller@example.com', '+49 30 12345678', 'Berlinerstr. 42', 'Berlín', 'Alemania', 'Le interesan tours en yate y excursiones de pesca');

-- Datos para la tabla reviews
INSERT INTO reviews (name, comment) VALUES
('Sarah J.', 'Nuestra estancia en el apartamento Ocean View fue increíble. Vistas espectaculares y excelente ubicación. ¡Volveremos seguro!'),
('Michael R.', 'El BMW X5 que alquilamos estaba impecable y fue perfecto para nuestro viaje familiar por Florida. El servicio fue excelente.'),
('Laura T.', 'La experiencia en el yate Royal Blue superó todas nuestras expectativas. La tripulación fue muy profesional y atenta.');

-- Datos para la tabla apartments
INSERT INTO apartments (name, description, unit_number, address, capacity, rooms, bathrooms, price, images) VALUES
('Ocean View Studio', 'Estudio moderno con impresionantes vistas al mar', '1001', '123 Collins Ave, Miami Beach, FL 33139', 2, 0, 1, 120.00, '[{"url": "https://res.cloudinary.com/dbvpwfh07/image/upload/v1734622397/apartments/dfyxyfqxz8ff3h5xml0f.jpg", "alt": "Vista desde Ocean View Studio"}]'::JSONB),
('Downtown Loft', 'Espacioso loft en el corazón de Brickell', '501', '789 Brickell Ave, Miami, FL 33131', 4, 1, 1, 180.00, '[{"url": "https://res.cloudinary.com/dbvpwfh07/image/upload/v1732583480/apartments/lczgsjbt7n9fxp0ugj9k.jpg", "alt": "Interior del Downtown Loft"}]'::JSONB),
('Beachfront Condo', 'Condominio de lujo con acceso directo a la playa', '2203', '456 Ocean Dr, Miami Beach, FL 33139', 6, 2, 2, 250.00, '[{"url": "https://res.cloudinary.com/dbvpwfh07/image/upload/v1734620435/apartments/qwggvc0rq06mtfywygxp.jpg", "alt": "Terraza del Beachfront Condo"}]'::JSONB);

-- Datos para la tabla reservations
INSERT INTO reservations (client_id, apartment_id, check_in_date, check_out_date, nights, price_per_night, cleaning_fee, parking_fee, other_expenses, taxes, total_amount, amount_paid, amount_due, status, payment_status, notes, created_at) VALUES
(1, 1, '2025-06-15', '2025-06-20', 5, 120.00, 50.00, 25.00, 0.00, 39.00, 714.00, 714.00, 0.00, 'confirmed', 'complete', 'El cliente solicitó check-in temprano', '2025-05-01 10:00:00'),
(2, 2, '2025-07-10', '2025-07-17', 7, 180.00, 80.00, 30.00, 100.00, 77.00, 1547.00, 0.00, 1547.00, 'pending', 'pending', 'Solicitó información sobre alquiler de coche', '2025-05-05 14:30:00'),
(3, 3, '2025-08-05', '2025-08-12', 7, 250.00, 100.00, 40.00, 0.00, 108.50, 1998.50, 999.25, 999.25, 'confirmed', 'partial', 'Familia con 2 niños, necesita cuna', '2025-05-10 09:15:00');

-- Datos para la tabla reservation_payments
INSERT INTO reservation_payments (reservation_id, amount, payment_date, payment_method, payment_reference, status, notes) VALUES
(1, 714.00, '2025-05-01 11:30:00', 'credit_card', 'Tarjeta', 'completed', 'Pago completo realizado al confirmar la reserva'),
(3, 999.25, '2025-05-10 10:00:00', 'bank_transfer', 'Tarjeta', 'completed', 'Pago del 50% como depósito inicial'),
(3, 999.25, '2025-05-15 16:45:00', 'paypal', 'Tarjeta', 'completed', 'Pago del saldo restante');

-- Datos para la tabla monthly_summaries
-- INSERT INTO monthly_summaries (month, year, total_reservations, total_payments, total_revenue) VALUES
-- (5, 2025, 3, 3, 2712.50),
-- (6, 2025, 1, 1, 714.00),
-- (7, 2025, 1, 0, 0.00);

-- Mensaje de confirmación
SELECT 'Datos de demostración insertados correctamente' as message;