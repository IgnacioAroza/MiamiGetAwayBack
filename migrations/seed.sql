-- =====================================================
-- SEED — MiamiGetAway local (MGA_test_db)
-- Ejecutar DESPUÉS de correr todas las migraciones
-- No incluye admins — crearlos manualmente
-- =====================================================

-- ----------------
-- CLIENTS
-- ----------------
INSERT INTO clients (name, lastname, email, phone, address, city, country, notes) VALUES
('James', 'Wilson', 'james.wilson@gmail.com', '+1 305 555 0101', '250 NW 24th St', 'Miami', 'USA', 'VIP client'),
('Sofia', 'Martinez', 'sofia.martinez@gmail.com', '+1 786 555 0202', '1200 Brickell Ave', 'Miami', 'USA', NULL),
('Lucas', 'Rossi', 'lucas.rossi@gmail.com', '+39 02 555 0303', 'Via Roma 12', 'Milan', 'Italy', 'Repeat guest');

-- ----------------
-- APARTMENTS
-- ----------------
INSERT INTO apartments (name, unit_number, address, description, price_per_night, cleaning_fee, parking_fee, capacity, bathrooms, rooms, images) VALUES
('Brickell Bay View', '801', '1100 Brickell Bay Dr, Miami, FL 33131', 'Modern 2BR apartment with bay views and pool access.', 250.00, 120.00, 30.00, 4, 2, 2, '[]'),
('South Beach Studio', '305', '1234 Collins Ave, Miami Beach, FL 33139', 'Cozy studio steps from the beach.', 150.00, 80.00, 0.00, 2, 1, 1, '[]'),
('Edgewater Penthouse', 'PH01', '18683 Collins Ave, Sunny Isles Beach, FL 33160', 'Luxury penthouse with ocean views and private terrace.', 500.00, 200.00, 50.00, 6, 3, 3, '[]');

-- ----------------
-- VILLAS
-- ----------------
INSERT INTO villas (name, description, address, capacity, bathrooms, rooms, price, images) VALUES
('Coral Gables Estate', 'Stunning 5BR villa with private pool and tropical garden.', '200 Alhambra Cir, Coral Gables, FL 33134', 10, 5, 5, 1200.00, '[]'),
('Coconut Grove Retreat', 'Charming 3BR villa surrounded by lush greenery.', '3580 Main Hwy, Coconut Grove, FL 33133', 6, 3, 3, 700.00, '[]'),
('Key Biscayne Paradise', 'Beachfront villa with direct ocean access and boat dock.', '100 Ocean Dr, Key Biscayne, FL 33149', 8, 4, 4, 950.00, '[]');

-- ----------------
-- YACHTS
-- ----------------
INSERT INTO yachts (name, description, capacity, price, images) VALUES
('Sea Breeze 42', '42ft sailing yacht. Perfect for day trips around Biscayne Bay.', 8, 800.00, '[]'),
('Miami Sun 55', '55ft motor yacht with full kitchen, AC and sun deck.', 12, 1500.00, '[]'),
('Blue Horizon 70', 'Luxury 70ft superyacht with 3 cabins, jacuzzi and crew.', 16, 3500.00, '[]');

-- ----------------
-- CARS
-- ----------------
INSERT INTO cars (brand, model, price, description, passengers, images) VALUES
('Mercedes-Benz', 'S-Class 580', 350.00, 'Executive sedan. Full comfort, tinted windows, chauffeur available.', 4, '[]'),
('Lamborghini', 'Urus', 600.00, 'Sport SUV. Ultimate performance and style in Miami.', 4, '[]'),
('Cadillac', 'Escalade ESV', 280.00, 'Full-size luxury SUV. Ideal for groups and airport transfers.', 7, '[]');

-- ----------------
-- REVIEWS (internas)
-- ----------------
INSERT INTO reviews (name, comment) VALUES
('James Wilson', 'Incredible stay at the Brickell apartment. Everything was spotless and the views were amazing!'),
('Sofia Martinez', 'The yacht trip around the bay was unforgettable. Highly recommend Miami Getaway!'),
('Lucas Rossi', 'Best vacation rental service I have used in Miami. Professional, responsive and great properties.');

-- ----------------
-- RESERVATIONS
-- ----------------
INSERT INTO reservations (
    client_id, apartment_id, check_in_date, check_out_date, nights,
    price_per_night, cleaning_fee, parking_fee, other_expenses, taxes,
    total_amount, amount_paid, amount_due, status, payment_status, supplier_status, notes
) VALUES
(1, 1, '06-01-2026 15:00', '06-08-2026 11:00', 7, 250.00, 120.00, 30.00, 0.00, 175.00, 2075.00, 1000.00, 1075.00, 'confirmed', 'pending', 'confirmed', 'Early check-in requested.'),
(2, 2, '06-10-2026 15:00', '06-15-2026 11:00', 5, 150.00, 80.00, 0.00, 0.00, 115.00, 945.00, 945.00, 0.00, 'confirmed', 'completed', 'unassigned', NULL),
(3, 3, '07-01-2026 15:00', '07-07-2026 11:00', 6, 500.00, 200.00, 50.00, 100.00, 426.00, 3776.00, 0.00, 3776.00, 'pending', 'pending', 'searching', 'Client requested gym access daily.');

-- ----------------
-- RESERVATION PAYMENTS
-- ----------------
INSERT INTO reservation_payments (reservation_id, amount, payment_date, payment_method, status, notes) VALUES
(1, 1000.00, '2026-05-15 10:00:00', 'wire', 'completed', 'First deposit'),
(2, 945.00,  '2026-05-20 14:30:00', 'card', 'completed', 'Full payment'),
(3, 0.00,    '2026-06-01 09:00:00', 'cash', 'pending', 'Payment pending at check-in');

-- ----------------
-- SUPPLIERS
-- ----------------
INSERT INTO suppliers (name, company, email, phone) VALUES
('Carolina Méndez', 'Coastal Stays Management', 'carolina@coastalstays.com', '+1 305 444 0101'),
('Roberto Ferraro', 'Miami Luxury Rentals LLC', 'roberto@miamiluxury.com', '+1 786 444 0202'),
('Ana Pereira', 'Brickell Property Group', 'ana@brickellpg.com', '+1 305 444 0303');

-- ----------------
-- RESERVATION SUPPLIERS
-- ----------------
INSERT INTO reservation_suppliers (reservation_id, supplier_id, payout_per_night, payment_terms) VALUES
(1, 1, 180.00, 'Within 48h after check-out'),
(2, 2, 100.00, 'Within 72h after check-out'),
(3, 3, 350.00, 'Net 7 days after check-out');

-- ----------------
-- SUPPLIER PAYMENTS
-- ----------------
INSERT INTO supplier_payments (reservation_supplier_id, amount, method, date, reference_notes) VALUES
(1, 1260.00, 'wire',     '2026-06-09', 'Wire ref #WR-001 — 7 nights × $180'),
(2, 500.00,  'transfer', '2026-06-16', 'Partial payment, balance pending'),
(3, 0.00,    'cash',     '2026-07-08', 'Pending — not yet paid');

-- ----------------
-- INVESTMENTS
-- ----------------
INSERT INTO investments (name, unit_number, address, description, bathrooms, rooms, price, images) VALUES
('Oceana Bal Harbour', '1502', '10201 Collins Ave, Bal Harbour, FL 33154', 'Pre-construction 2BR oceanfront unit. Delivery Q4 2027.', 2, 2, 950000.00, '[]'),
('Echo Brickell', NULL, '1451 Brickell Ave, Miami, FL 33131', 'Studio in one of Brickell''s most iconic towers. Strong rental yield.', 1, 1, NULL, '[]'),
('Aria Reserve', '3801', '700 NE 26th Terrace, Miami, FL 33137', 'Luxury 3BR in twin-tower waterfront development. Price upon request.', 3, 3, NULL, '[]');

-- ----------------
-- MONTHLY SUMMARIES
-- ----------------
INSERT INTO monthly_summaries (month, year, total_reservations, total_payments, total_revenue) VALUES
(3, 2026, 8, 12, 18450.00),
(4, 2026, 11, 15, 24300.00),
(5, 2026, 9, 13, 20875.00);
