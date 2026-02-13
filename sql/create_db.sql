/*
====================================================
MEDIBOOK – DATABASE SCHEMA
Safe to re-run (idempotent)
Engine: InnoDB
Charset: utf8mb4
====================================================
*/

CREATE DATABASE IF NOT EXISTS medibook
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE medibook;

-- ======================
-- USERS
-- Patients, Practitioners, Admins
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM(
    'patient',
    'pending_practitioner',
    'practitioner',
    'admin'
  ) DEFAULT 'patient',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ======================
-- SERVICES
-- GP, Dentist, Optician, Dietitian
-- ======================
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  duration_minutes INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ======================
-- PRACTITIONERS
-- Each practitioner:
-- - is a user
-- - provides exactly one service
-- ======================
CREATE TABLE IF NOT EXISTS practitioners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  bio TEXT,

  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ======================
-- PRACTITIONER AVAILABILITY
-- Stores working hours (not bookings)
-- Example: Mon 09:00–17:00
-- ======================
CREATE TABLE IF NOT EXISTS availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  practitioner_id INT NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Prevent duplicate availability for same day
  UNIQUE KEY uniq_practitioner_day (practitioner_id, day_of_week),

  FOREIGN KEY (practitioner_id)
    REFERENCES practitioners(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ======================
-- BOOKINGS
-- Real appointments only
-- Double booking prevented at DB level
-- ======================
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  practitioner_id INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (patient_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  FOREIGN KEY (practitioner_id)
    REFERENCES practitioners(id)
    ON DELETE CASCADE,

  -- Prevent double booking of same practitioner, date & time
  UNIQUE KEY unique_booking (practitioner_id, booking_date, booking_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SAFETY PATCH (safe to re-run)
ALTER TABLE bookings
MODIFY status VARCHAR(20) NOT NULL DEFAULT 'booked';
CREATE TABLE IF NOT EXISTS practitioner_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bio VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id),

  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 

ALTER TABLE bookings 
MODIFY status VARCHAR(20) NOT NULL DEFAULT 'booked';
