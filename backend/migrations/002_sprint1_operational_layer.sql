-- Sprint 1: Core Admin Features - Database Migrations
-- Run this to add operational layer features

-- ============================================
-- 1. Enhance surveys table
-- ============================================

ALTER TABLE surveys 
ADD COLUMN max_selections INT DEFAULT 1 AFTER config,
ADD COLUMN priority_mode BOOLEAN DEFAULT FALSE AFTER max_selections,
ADD COLUMN survey_type ENUM('SINGLE_CHOICE', 'MULTI_CHOICE', 'PRIORITY_RANKED') DEFAULT 'SINGLE_CHOICE' AFTER priority_mode,
ADD COLUMN approval_policy ENUM('AUTO_APPROVE', 'MANUAL_APPROVE', 'CONDITIONAL') DEFAULT 'AUTO_APPROVE' AFTER survey_type,
ADD COLUMN visibility_mode ENUM('PUBLIC', 'TARGETED', 'HIDDEN') DEFAULT 'PUBLIC' AFTER approval_policy,
ADD COLUMN eligibility_rules JSON DEFAULT NULL AFTER visibility_mode;

-- ============================================
-- 2. Enhance survey_releases table
-- ============================================

ALTER TABLE survey_releases
ADD COLUMN open_time DATETIME AFTER active_to,
ADD COLUMN close_time DATETIME AFTER open_time,
ADD COLUMN auto_close BOOLEAN DEFAULT FALSE AFTER close_time;

-- ============================================
-- 3. Create option_quota_buckets table
-- ============================================

CREATE TABLE IF NOT EXISTS option_quota_buckets (
  id CHAR(36) PRIMARY KEY,
  option_id CHAR(36) NOT NULL,
  bucket_name VARCHAR(50) NOT NULL,
  quota INT NOT NULL,
  filled INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE,
  INDEX idx_option_bucket (option_id, bucket_name),
  INDEX idx_bucket_name (bucket_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Create approver_assignments table
-- ============================================

CREATE TABLE IF NOT EXISTS approver_assignments (
  id CHAR(36) PRIMARY KEY,
  approver_id CHAR(36) NOT NULL,
  survey_id CHAR(36) NOT NULL,
  assigned_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE INDEX idx_approver_survey (approver_id, survey_id),
  INDEX idx_approver (approver_id),
  INDEX idx_survey (survey_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Add rank_order to survey_selections
-- ============================================

ALTER TABLE survey_selections
ADD COLUMN rank_order INT DEFAULT NULL AFTER option_id,
ADD INDEX idx_rank (rank_order);

-- ============================================
-- 6. Update TABLES constant reference
-- ============================================
-- Note: Update backend/src/db/tables.js to include:
-- OPTION_QUOTA_BUCKETS: 'option_quota_buckets'
-- APPROVER_ASSIGNMENTS: 'approver_assignments'

-- ============================================
-- Migration Complete
-- ============================================

SELECT 'Sprint 1 migration completed successfully!' AS status;
