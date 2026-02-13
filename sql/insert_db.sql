/*
====================================================
MEDIBOOK – BASE DATA
Safe to re-run (dev & production friendly)
====================================================
*/

USE medibook;

-- ======================
-- SERVICES
-- ======================
INSERT INTO services (name, price, duration_minutes)
VALUES
  ('GP', 50.00, 30),
  ('Dentist', 80.00, 45),
  ('Optician', 60.00, 30),
  ('Dietitian', 70.00, 45)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  duration_minutes = VALUES(duration_minutes);

-- ======================
-- ADMIN USER
-- password: admin123
-- ======================
INSERT INTO users (full_name, email, password, role)
VALUES (
  'Admin',
  'admin@medibook.com',
  '$2b$10$wH8y7HxxX5R5UO8gYtP8IuX6eQyGQwZ1lQ8S2Gq7zV5U1K3Rk5kG6',
  'admin'
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  role = VALUES(role);

-- ======================
-- PRACTITIONER USERS
-- password: admin123
-- ======================
INSERT INTO users (full_name, email, password, role)
VALUES
(
  'Dr John Smith',
  'gp@medibook.com',
  '$2b$10$wH8y7HxxX5R5UO8gYtP8IuX6eQyGQwZ1lQ8S2Gq7zV5U1K3Rk5kG6',
  'practitioner'
),
(
  'Dr Sarah Jones',
  'dentist@medibook.com',
  '$2b$10$wH8y7HxxX5R5UO8gYtP8IuX6eQyGQwZ1lQ8S2Gq7zV5U1K3Rk5kG6',
  'practitioner'
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name);

-- ======================
-- PRACTITIONERS TABLE
-- Link users to services
-- ======================

-- GP
INSERT INTO practitioners (user_id, service_id, bio)
SELECT u.id, s.id, 'General Practitioner'
FROM users u
JOIN services s ON s.name = 'GP'
WHERE u.email = 'gp@medibook.com'
AND NOT EXISTS (
  SELECT 1 FROM practitioners p WHERE p.user_id = u.id
);

-- Dentist
INSERT INTO practitioners (user_id, service_id, bio)
SELECT u.id, s.id, 'Certified Dentist'
FROM users u
JOIN services s ON s.name = 'Dentist'
WHERE u.email = 'dentist@medibook.com'
AND NOT EXISTS (
  SELECT 1 FROM practitioners p WHERE p.user_id = u.id
);


await db.execute(`
  INSERT INTO practitioner_applications (user_id, service_id, bio, status)
  VALUES (?, ?, ?, 'pending')
`, [result.insertId, service_id, bio || null]);
