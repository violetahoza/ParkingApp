-- Smart Parking App Database Schema

DROP DATABASE IF EXISTS smart_parking;
CREATE DATABASE smart_parking;
USE smart_parking;

-- Users table for authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE user_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    license_plate VARCHAR(20),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parking lots table
CREATE TABLE parking_lots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_spots INT NOT NULL,
    hourly_rate DECIMAL(8, 2) NOT NULL,
    operating_hours_start TIME DEFAULT '00:00:00',
    operating_hours_end TIME DEFAULT '23:59:59',
    description TEXT,
    amenities JSON, -- parking type, security, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Individual parking spots
CREATE TABLE parking_spots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lot_id INT NOT NULL,
    spot_number VARCHAR(10) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    spot_type ENUM('regular', 'disabled', 'electric', 'compact') DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_spot_per_lot (lot_id, spot_number)
);

-- Reservations table
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    spot_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    total_cost DECIMAL(8, 2) NOT NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_id INT NOT NULL,
    amount DECIMAL(8, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Insert sample parking lots in Cluj-Napoca
INSERT INTO parking_lots (name, address, latitude, longitude, total_spots, hourly_rate, description, amenities) VALUES
('Piața Unirii Parking', 'Piața Unirii, Cluj-Napoca', 46.7712, 23.6236, 150, 3.50, 'Central parking in the heart of Cluj', '{"security": true, "covered": false, "electric_charging": false}'),
('Iulius Mall Parking', 'Strada Alexandru Vaida Voevod 53B, Cluj-Napoca', 46.7318, 23.5644, 800, 2.00, 'Large mall parking facility', '{"security": true, "covered": true, "electric_charging": true}'),
('Central Park Parking', 'Calea Turzii, Cluj-Napoca', 46.7833, 23.6000, 200, 2.50, 'Parking near Central Park', '{"security": true, "covered": false, "electric_charging": false}'),
('BT Arena Parking', 'Strada Gheorghe Dima 11, Cluj-Napoca', 46.7505, 23.5736, 300, 4.00, 'Sports arena parking', '{"security": true, "covered": false, "electric_charging": true}'),
('VIVO! Cluj Parking', 'Strada Avram Iancu 492-500, Cluj-Napoca', 46.7897, 23.6158, 600, 1.50, 'Shopping center parking', '{"security": true, "covered": true, "electric_charging": false}');

-- Insert parking spots for each lot
-- Piața Unirii Parking (150 spots)
INSERT INTO parking_spots (lot_id, spot_number, spot_type)
SELECT 1, CONCAT('A', LPAD(num, 3, '0')), 
    CASE 
        WHEN num <= 10 THEN 'disabled'
        WHEN num <= 30 THEN 'compact'
        WHEN num <= 40 THEN 'electric'
        ELSE 'regular'
    END
FROM (
    SELECT @row_number := @row_number + 1 AS num
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row_number := 0) r
    LIMIT 150
) AS numbers;

-- Iulius Mall Parking (800 spots)
INSERT INTO parking_spots (lot_id, spot_number, spot_type)
SELECT 2, CONCAT('B', LPAD(num, 3, '0')), 
    CASE 
        WHEN num <= 50 THEN 'disabled'
        WHEN num <= 150 THEN 'compact'
        WHEN num <= 200 THEN 'electric'
        ELSE 'regular'
    END
FROM (
    SELECT @row_number := @row_number + 1 AS num
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row_number := 0) r
    LIMIT 800
) AS numbers;

-- Central Park Parking (200 spots)
INSERT INTO parking_spots (lot_id, spot_number, spot_type)
SELECT 3, CONCAT('C', LPAD(num, 3, '0')), 
    CASE 
        WHEN num <= 15 THEN 'disabled'
        WHEN num <= 50 THEN 'compact'
        WHEN num <= 70 THEN 'electric'
        ELSE 'regular'
    END
FROM (
    SELECT @row_number := @row_number + 1 AS num
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row_number := 0) r
    LIMIT 200
) AS numbers;

-- BT Arena Parking (300 spots)
INSERT INTO parking_spots (lot_id, spot_number, spot_type)
SELECT 4, CONCAT('D', LPAD(num, 3, '0')), 
    CASE 
        WHEN num <= 20 THEN 'disabled'
        WHEN num <= 80 THEN 'compact'
        WHEN num <= 120 THEN 'electric'
        ELSE 'regular'
    END
FROM (
    SELECT @row_number := @row_number + 1 AS num
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row_number := 0) r
    LIMIT 300
) AS numbers;

-- VIVO! Cluj Parking (600 spots)
INSERT INTO parking_spots (lot_id, spot_number, spot_type)
SELECT 5, CONCAT('E', LPAD(num, 3, '0')), 
    CASE 
        WHEN num <= 40 THEN 'disabled'
        WHEN num <= 120 THEN 'compact'
        WHEN num <= 160 THEN 'electric'
        ELSE 'regular'
    END
FROM (
    SELECT @row_number := @row_number + 1 AS num
    FROM information_schema.tables t1, information_schema.tables t2, (SELECT @row_number := 0) r
    LIMIT 600
) AS numbers;

-- Make some spots unavailable to simulate real conditions
UPDATE parking_spots 
SET is_available = FALSE 
WHERE id IN (
    SELECT spot_id FROM (
        SELECT id as spot_id FROM parking_spots 
        ORDER BY RAND() 
        LIMIT 300
    ) as random_spots
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_parking_lots_location ON parking_lots(latitude, longitude);
CREATE INDEX idx_parking_spots_lot_available ON parking_spots(lot_id, is_available);
CREATE INDEX idx_reservations_user_status ON reservations(user_id, status);
CREATE INDEX idx_reservations_spot_time ON reservations(spot_id, start_time, end_time);

-- Sample users for testing (password is 'password123' hashed with bcrypt)
INSERT INTO users (email, password_hash) VALUES 
('john.doe@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('jane.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Sample user profiles
INSERT INTO user_profiles (user_id, first_name, last_name, phone, license_plate) VALUES
(1, 'John', 'Doe', '+40712345678', 'CJ01ABC'),
(2, 'Jane', 'Smith', '+40712345679', 'CJ02DEF'),
(3, 'Test', 'User', '+40712345680', 'CJ03GHI');

-- View to get parking lot availability
CREATE VIEW parking_lot_availability AS
SELECT 
    pl.id,
    pl.name,
    pl.address,
    pl.latitude,
    pl.longitude,
    pl.total_spots,
    pl.hourly_rate,
    COUNT(CASE WHEN ps.is_available = TRUE THEN 1 END) as available_spots,
    COUNT(ps.id) as total_created_spots,
    pl.operating_hours_start,
    pl.operating_hours_end,
    pl.description,
    pl.amenities
FROM parking_lots pl
LEFT JOIN parking_spots ps ON pl.id = ps.lot_id
GROUP BY pl.id;

-- View to get user reservation history
CREATE VIEW user_reservation_history AS
SELECT 
    r.id as reservation_id,
    u.email,
    up.first_name,
    up.last_name,
    pl.name as parking_lot_name,
    ps.spot_number,
    r.start_time,
    r.end_time,
    r.total_cost,
    r.status,
    r.payment_status,
    r.created_at
FROM reservations r
JOIN users u ON r.user_id = u.id
JOIN user_profiles up ON u.id = up.user_id
JOIN parking_spots ps ON r.spot_id = ps.id
JOIN parking_lots pl ON ps.lot_id = pl.id;

CREATE TABLE IF NOT EXISTS user_vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(30),
    year INT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_vehicles_user_id (user_id),
    INDEX idx_user_vehicles_license_plate (license_plate)
);

-- Add profile_image_url column to user_profiles table if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN profile_image_url VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX idx_reservations_user_status ON reservations(user_id, status);
CREATE INDEX idx_reservations_spot_time ON reservations(spot_id, start_time, end_time);

-- Insert sample vehicles for demo user (if demo user exists)
INSERT IGNORE INTO user_vehicles (user_id, license_plate, make, model, color, year, is_primary)
SELECT 
    u.id,
    'CJ99DEMO',
    'Toyota',
    'Camry',
    'Blue',
    2022,
    TRUE
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'demo@parking.com'
LIMIT 1;

-- Add some sample vehicles for testing
INSERT IGNORE INTO user_vehicles (user_id, license_plate, make, model, color, year, is_primary)
SELECT 
    u.id,
    'CJ01TEST',
    'Honda',
    'Civic',
    'Red',
    2023,
    FALSE
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'vio@yahoo.com'
LIMIT 1;
