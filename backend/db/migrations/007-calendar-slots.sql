/**
 * Migration: Create Calendar Slot Booking Tables
 * 
 * Creates tables for calendar slot booking system:
 * - calendar_slots: Available time slots
 * - slot_bookings: Student bookings
 * - slot_quota_buckets: Quota management (optional)
 */

USE survey_system;

-- 1. Calendar Slots Table
CREATE TABLE IF NOT EXISTS calendar_slots (
    id CHAR(36) PRIMARY KEY,
    survey_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    location VARCHAR(255),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time),
    INDEX idx_survey_start (survey_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Slot Bookings Table
CREATE TABLE IF NOT EXISTS slot_bookings (
    id CHAR(36) PRIMARY KEY,
    slot_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    submission_id CHAR(36),
    status ENUM('HELD', 'CONFIRMED', 'CANCELLED') DEFAULT 'HELD',
    held_until DATETIME,
    confirmed_at DATETIME,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (slot_id) REFERENCES calendar_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES survey_submissions(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_user_slot (user_id, slot_id),
    INDEX idx_slot_id (slot_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_held_until (held_until),
    INDEX idx_slot_status (slot_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Slot Quota Buckets Table (Optional - for advanced quota management)
CREATE TABLE IF NOT EXISTS slot_quota_buckets (
    id CHAR(36) PRIMARY KEY,
    slot_id CHAR(36) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL,
    quota INT NOT NULL,
    eligibility_rule TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (slot_id) REFERENCES calendar_slots(id) ON DELETE CASCADE,
    INDEX idx_slot_id (slot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables created
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'survey_system'
    AND TABLE_NAME IN ('calendar_slots', 'slot_bookings', 'slot_quota_buckets')
ORDER BY TABLE_NAME;
