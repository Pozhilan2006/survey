-- Create test approver user and assign to surveys
-- This script sets up test data for approver role testing

USE survey_system;

-- Create approver user if not exists
INSERT INTO users (id, email, password_hash, role, name, year, department, created_at)
VALUES (
    UUID(),
    'approver@test.com',
    '$2b$10$YourHashedPasswordHere',  -- Password: 'password123'
    'APPROVER',
    'Test Approver',
    NULL,
    NULL,
    NOW()
)
ON DUPLICATE KEY UPDATE role = 'APPROVER';

-- Get the approver ID
SET @approver_id = (SELECT id FROM users WHERE email = 'approver@test.com' LIMIT 1);

-- Get some survey IDs to assign
SET @survey1_id = (SELECT id FROM surveys LIMIT 1);
SET @survey2_id = (SELECT id FROM surveys LIMIT 1 OFFSET 1);

-- Assign approver to surveys
INSERT INTO approver_assignments (id, approver_id, survey_id, assigned_by, assigned_at)
VALUES 
    (UUID(), @approver_id, @survey1_id, (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1), NOW()),
    (UUID(), @approver_id, @survey2_id, (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1), NOW())
ON DUPLICATE KEY UPDATE assigned_at = NOW();

-- Show results
SELECT 'Approver created/updated:' as status;
SELECT id, email, role, name FROM users WHERE email = 'approver@test.com';

SELECT 'Assignments created:' as status;
SELECT 
    aa.id,
    u.email as approver_email,
    s.title as survey_title,
    aa.assigned_at
FROM approver_assignments aa
JOIN users u ON aa.approver_id = u.id
JOIN surveys s ON aa.survey_id = s.id
WHERE u.email = 'approver@test.com';
