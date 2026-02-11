-- Initial Schema for MySQL

-- Users table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT', -- ENUM('STUDENT', 'TEACHER', 'ADMIN')
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    metadata JSON
) ENGINE=InnoDB;

-- Groups table
CREATE TABLE `groups` (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    metadata JSON
) ENGINE=InnoDB;

-- Group Members table
CREATE TABLE group_members (
    group_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER', -- ENUM('MEMBER', 'ADMIN')
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Surveys table
CREATE TABLE surveys (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- ENUM('PICK_N', 'PRIORITY', 'CALENDAR_SLOT', 'WORKFLOW_RELAY', 'AUTHENTICATION')
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')
    created_by CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    config JSON,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Survey Releases table
CREATE TABLE survey_releases (
    id CHAR(36) PRIMARY KEY,
    survey_id CHAR(36) NOT NULL,
    version INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED', -- ENUM('PUBLISHED', 'CLOSED', 'DEPRECATED')
    active_from DATETIME,
    active_to DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rule_config JSON,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Survey Options table
CREATE TABLE survey_options (
    id CHAR(36) PRIMARY KEY,
    survey_id CHAR(36) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    value VARCHAR(255) NOT NULL,
    metadata JSON,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Option Capacity table
CREATE TABLE option_capacity (
    option_id CHAR(36) PRIMARY KEY,
    total_capacity INT NOT NULL DEFAULT 0,
    reserved_count INT NOT NULL DEFAULT 0,
    filled_count INT NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Option Quota Buckets table
CREATE TABLE option_quota_buckets (
    id CHAR(36) PRIMARY KEY,
    option_id CHAR(36) NOT NULL,
    rule_key VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    filled INT NOT NULL DEFAULT 0,
    FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Survey Participation table
CREATE TABLE survey_participation (
    id CHAR(36) PRIMARY KEY,
    release_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    completed_at DATETIME,
    state_history JSON,
    FOREIGN KEY (release_id) REFERENCES survey_releases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Survey Selections table
CREATE TABLE survey_selections (
    id CHAR(36) PRIMARY KEY,
    participation_id CHAR(36) NOT NULL,
    option_id CHAR(36) NOT NULL,
    rank_order INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participation_id) REFERENCES survey_participation(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Option Holds table
CREATE TABLE option_holds (
    id CHAR(36) PRIMARY KEY,
    option_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Option Waitlist table
CREATE TABLE option_waitlist (
    id CHAR(36) PRIMARY KEY,
    option_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES survey_options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Approval Workflows table
CREATE TABLE approval_workflows (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Approval Steps table
CREATE TABLE approval_steps (
    id CHAR(36) PRIMARY KEY,
    workflow_id CHAR(36) NOT NULL,
    step_order INT NOT NULL,
    approver_role VARCHAR(50), -- Role based approval
    approver_user_id CHAR(36), -- Specific user approval
    logic_type VARCHAR(50) NOT NULL DEFAULT 'ANY', -- ENUM('ANY', 'ALL', 'SPECIFIC')
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Approval Items table
CREATE TABLE approval_items (
    id CHAR(36) PRIMARY KEY,
    workflow_id CHAR(36) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- e.g., 'SURVEY_PARTICIPATION'
    target_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    current_step INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
) ENGINE=InnoDB;

-- Approval Actions table
CREATE TABLE approval_actions (
    id CHAR(36) PRIMARY KEY,
    item_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL, -- ENUM('APPROVE', 'REJECT', 'COMMENT')
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES approval_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Documents table
CREATE TABLE documents (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- ENUM('PENDING', 'VERIFIED', 'REJECTED')
    storage_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    verified_by CHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Document Requirements table
CREATE TABLE document_requirements (
    id CHAR(36) PRIMARY KEY,
    survey_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Auth Challenges table
CREATE TABLE auth_challenges (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- ENUM('OTP', 'QR', 'MANUAL')
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    code VARCHAR(50),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Survey Dependencies table
CREATE TABLE survey_dependencies (
    id CHAR(36) PRIMARY KEY,
    source_survey_id CHAR(36) NOT NULL,
    target_survey_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- ENUM('HARD', 'SOFT')
    rule_config JSON,
    FOREIGN KEY (source_survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (target_survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Relay Workflows table
CREATE TABLE relay_workflows (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Relay Stages table
CREATE TABLE relay_stages (
    id CHAR(36) PRIMARY KEY,
    workflow_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    stage_order INT NOT NULL,
    config JSON,
    FOREIGN KEY (workflow_id) REFERENCES relay_workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Relay Instances table
CREATE TABLE relay_instances (
    id CHAR(36) PRIMARY KEY,
    workflow_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_stage_id CHAR(36),
    data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES relay_workflows(id),
    FOREIGN KEY (current_stage_id) REFERENCES relay_stages(id)
) ENGINE=InnoDB;

-- Calendar Slots table
CREATE TABLE calendar_slots (
    id CHAR(36) PRIMARY KEY,
    release_id CHAR(36) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    filled INT NOT NULL DEFAULT 0,
    FOREIGN KEY (release_id) REFERENCES survey_releases(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Slot Bookings table
CREATE TABLE slot_bookings (
    id CHAR(36) PRIMARY KEY,
    slot_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'BOOKED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES calendar_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Action Plans table
CREATE TABLE action_plans (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    template_id CHAR(36),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    content JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Audit Events table
CREATE TABLE audit_events (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id CHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_survey_options_survey_id ON survey_options(survey_id);
CREATE INDEX idx_survey_participation_user_id ON survey_participation(user_id);
CREATE INDEX idx_survey_participation_release_id ON survey_participation(release_id);
CREATE INDEX idx_option_capacity_option_id ON option_capacity(option_id);
CREATE INDEX idx_option_holds_option_id ON option_holds(option_id);
CREATE INDEX idx_option_holds_user_id ON option_holds(user_id);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
