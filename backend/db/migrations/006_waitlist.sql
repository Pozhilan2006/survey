-- Waitlist Management
-- Allows students to join a queue when surveys are full
-- Tracks position and auto-promotes when seats become available

CREATE TABLE IF NOT EXISTS waitlist (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    release_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    status ENUM('ACTIVE', 'NOTIFIED', 'EXPIRED', 'CONVERTED') DEFAULT 'ACTIVE',
    notified_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (release_id) REFERENCES survey_releases(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_release (user_id, release_id),
    INDEX idx_waitlist_release_status (release_id, status),
    INDEX idx_waitlist_user (user_id),
    INDEX idx_waitlist_position (release_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status Flow:
-- ACTIVE: User is waiting in queue
-- NOTIFIED: Seat became available, user has 24 hours to claim
-- CONVERTED: User claimed the seat and created participation
-- EXPIRED: User didn't claim in time or hold expired
