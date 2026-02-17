-- Add password_hash column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) AFTER role;

-- Create default admin user (password: admin123)
-- Hash: $2b$10$rBV2kYlvVzZ5YmJxN8X8XeGKqV7vX9vY5YmJxN8X8XeGKqV7vX9vY
INSERT INTO users (id, email, role, password_hash)
VALUES (
    'admin-default-001',
    'admin@survey.com',
    'ADMIN',
    '$2b$10$rBV2kYlvVzZ5YmJxN8X8XeGKqV7vX9vY5YmJxN8X8XeGKqV7vX9vY'
)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Create default student user (password: student123)
INSERT INTO users (id, email, role, password_hash)
VALUES (
    'student-default-001',
    'student@survey.com',
    'STUDENT',
    '$2b$10$rBV2kYlvVzZ5YmJxN8X8XeGKqV7vX9vY5YmJxN8X8XeGKqV7vX9vY'
)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Create default approver user (password: approver123)
INSERT INTO users (id, email, role, password_hash)
VALUES (
    'approver-default-001',
    'approver@survey.com',
    'APPROVER',
    '$2b$10$rBV2kYlvVzZ5YmJxN8X8XeGKqV7vX9vY5YmJxN8X8XeGKqV7vX9vY'
)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
