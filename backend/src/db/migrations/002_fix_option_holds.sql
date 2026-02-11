-- 1. Add missing columns to option_holds
ALTER TABLE option_holds
    ADD COLUMN release_id CHAR(36) NOT NULL AFTER user_id,
    ADD COLUMN participation_id CHAR(36) AFTER release_id,
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' AFTER participation_id,
    ADD COLUMN released_at DATETIME AFTER expires_at;

-- 2. Add Foreign Keys and Indexes
ALTER TABLE option_holds
    ADD CONSTRAINT fk_holds_release FOREIGN KEY (release_id) REFERENCES survey_releases(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_holds_participation FOREIGN KEY (participation_id) REFERENCES survey_participation(id) ON DELETE SET NULL,
    ADD INDEX idx_status_expires (status, expires_at);
