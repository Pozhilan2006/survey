# Database Schema

## Core Tables

### users
User accounts mapped from college SSO.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key (UUID) |
| email | VARCHAR(255) | Unique email |
| role | VARCHAR(50) | STUDENT, TEACHER, ADMIN |
| metadata | JSON | Additional user data |
| created_at | DATETIME | Account creation timestamp |

### surveys
Survey templates.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| title | VARCHAR(255) | Survey title |
| type | VARCHAR(50) | PICK_N, PRIORITY, CALENDAR_SLOT, etc. |
| status | VARCHAR(50) | DRAFT, ACTIVE, COMPLETED, ARCHIVED |
| config | JSON | Survey configuration |
| created_by | CHAR(36) | Creator user ID |

### survey_releases
Survey instances with eligibility rules.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| survey_id | CHAR(36) | Parent survey |
| version | INT | Release version |
| status | VARCHAR(50) | PUBLISHED, CLOSED, DEPRECATED |
| rule_config | JSON | Eligibility rules |
| active_from | DATETIME | Start time |
| active_to | DATETIME | End time |

### survey_options
Selectable options in surveys.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| survey_id | CHAR(36) | Parent survey |
| label | VARCHAR(255) | Display label |
| value | VARCHAR(255) | Option value |
| metadata | JSON | Additional data |

## Participation Tables

### survey_participation
User participation tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| release_id | CHAR(36) | Survey release |
| user_id | CHAR(36) | Participant |
| status | VARCHAR(50) | State machine status |
| started_at | DATETIME | Participation start |
| submitted_at | DATETIME | Submission time |
| state_history | JSON | State transition log |

**States**: `NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `APPROVED` → `REJECTED`

### survey_selections
User's selected options.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| participation_id | CHAR(36) | Parent participation |
| option_id | CHAR(36) | Selected option |
| rank_order | INT | Ranking (for PRIORITY surveys) |

## Capacity Management

### option_capacity
Total capacity per option.

| Column | Type | Description |
|--------|------|-------------|
| option_id | CHAR(36) | Primary key |
| total_capacity | INT | Maximum seats |
| reserved_count | INT | Currently held seats |
| filled_count | INT | Confirmed allocations |

### option_holds
Temporary seat reservations (15-minute expiry).

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| option_id | CHAR(36) | Held option |
| user_id | CHAR(36) | Holder |
| release_id | CHAR(36) | Survey release |
| participation_id | CHAR(36) | Participation session |
| status | VARCHAR(50) | ACTIVE, EXPIRED, CONVERTED |
| expires_at | DATETIME | Expiry time |
| released_at | DATETIME | Release timestamp |

### option_waitlist
Waitlist queue.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| option_id | CHAR(36) | Waitlisted option |
| user_id | CHAR(36) | Waitlisted user |
| position | INT | Queue position |

## Audit

### audit_events
Complete audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(36) | Primary key |
| user_id | CHAR(36) | Actor |
| action | VARCHAR(255) | Action performed |
| resource_type | VARCHAR(50) | Affected resource type |
| resource_id | CHAR(36) | Affected resource ID |
| details | JSON | Additional context |
| ip_address | VARCHAR(45) | Client IP |
| created_at | DATETIME | Event timestamp |

## Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_participation_user_id ON survey_participation(user_id);
CREATE INDEX idx_participation_release_id ON survey_participation(release_id);
CREATE INDEX idx_holds_status_expires ON option_holds(status, expires_at);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
```

## Migrations

Run migrations:
```bash
npm run migrate
```

Migration files: `backend/src/db/migrations/*.sql`
