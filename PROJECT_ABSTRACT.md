# College Survey System - Project Abstract

## Executive Summary

The **College Survey System** is a production-grade survey and seat allocation platform designed for educational institutions. It enables colleges to conduct complex surveys with capacity management, eligibility rules, approval workflows, and real-time seat reservations—all while preventing race conditions and maintaining complete audit trails.

## Problem Statement

Traditional survey systems fail to handle:
- **Capacity-limited selections** (e.g., 100 students selecting from 5 courses with 30 seats each)
- **Complex eligibility rules** (e.g., "only 3rd-year CS students who completed prerequisite survey")
- **Race conditions** when multiple users select the same limited-capacity option simultaneously
- **Multi-stage approvals** (student selects → faculty approves → admin allocates)
- **Temporary seat holds** with automatic expiry and cleanup

## Solution

A **backend-driven** system where all business logic, state management, and capacity decisions are enforced server-side, with frontends acting as pure presentation layers.

### Key Capabilities

1. **Intelligent Eligibility Engine**
   - Rule-based system supporting complex conditions (group membership, prerequisites, time windows)
   - Returns actionable decisions: ALLOW, DENY, ALLOW_WITH_REQUIREMENTS, WAITLIST

2. **Race-Condition-Safe Capacity Management**
   - MySQL transactions with row-level locking
   - Atomic capacity updates
   - Temporary seat holds (15-minute expiry)
   - Background job for automatic hold cleanup

3. **State Machine-Driven Workflows**
   - Enforced state transitions: ELIGIBLE → VIEWING → HOLD_ACTIVE → SUBMITTED → APPROVED → ALLOCATED
   - Guard conditions prevent invalid transitions
   - Complete audit trail of all state changes

4. **Multi-Platform Access**
   - **Mobile App** (React Native/Expo) for students and teachers
   - **Web Admin Panel** (React/Vite) for faculty and administrators
   - **REST API** (Node.js/Express) as single source of truth

## Technology Stack

- **Backend:** Node.js, Express, MySQL (mysql2)
- **Frontend:** React (web), React Native (mobile)
- **Database:** MySQL 8.0+ with transactions
- **Authentication:** JWT-based (dev mode with token generation)
- **Background Jobs:** setInterval-based cleanup workers

## Current Project Status

**Phase:** Early Implementation (Read-Only Survey Display + Participation Flow)

### ✅ Implemented Features

#### Backend
- ✅ MySQL database schema with 20+ tables
- ✅ Survey CRUD operations
- ✅ Participation state machine (9 states)
- ✅ Eligibility checking engine
- ✅ Seat hold management with expiry
- ✅ Background job for hold cleanup
- ✅ Audit logging middleware
- ✅ JWT authentication (dev mode)
- ✅ Error handling and logging (Winston)

#### Frontend (Web Admin)
- ✅ Dashboard with survey statistics
- ✅ Survey list with status badges
- ✅ User-friendly enum translations (survey types, statuses)
- ✅ Loading and error states
- ✅ Responsive layout with navigation

#### Frontend (Mobile)
- ✅ Survey list screen
- ✅ Survey runner for PICK_N surveys
- ✅ Dynamic option rendering
- ✅ Pull-to-refresh
- ✅ Navigation between screens

#### API Endpoints
- ✅ `GET /health` - Health check
- ✅ `GET /api/v1/surveys` - Fetch all surveys with options
- ✅ `POST /api/v1/auth/dev/login` - Dev authentication
- ✅ `GET /api/v1/participation/releases/:id/eligibility` - Check eligibility
- ✅ `POST /api/v1/participation/releases/:id/participate` - Start participation
- ✅ `POST /api/v1/participation/:id/hold` - Hold seat
- ✅ `POST /api/v1/participation/:id/submit` - Submit survey

### 🚧 Partially Implemented

- ⚠️ Survey submission (API exists, frontend placeholder)
- ⚠️ Approval workflows (schema exists, logic not implemented)
- ⚠️ Document upload (schema exists, endpoints not implemented)
- ⚠️ Priority/ranking surveys (schema exists, UI not implemented)
- ⚠️ Calendar slots (schema exists, logic not implemented)

### ❌ Not Yet Implemented

- ❌ Survey creation UI (admin panel)
- ❌ Allocation algorithms (FCFS, Random, Rank-based)
- ❌ Waitlist management
- ❌ Email notifications
- ❌ Advanced eligibility rules (AST evaluation)
- ❌ Multi-stage relay workflows
- ❌ Action plan booking
- ❌ Authentication surveys (OTP, QR)
- ❌ Production deployment configuration
- ❌ Load testing and performance optimization

## Use Cases

### 1. Course Selection (PICK_N)
**Scenario:** 500 students select 3 electives from 10 courses, each with 50-seat capacity.

**Flow:**
1. Student checks eligibility → System validates prerequisites
2. Student views available courses → System shows real-time capacity
3. Student holds 3 seats → System locks capacity for 15 minutes
4. Student submits → System converts holds to confirmed selections
5. Faculty approves → System finalizes allocation

### 2. Internship Preference (PRIORITY)
**Scenario:** Students rank 5 companies by preference; allocation uses hybrid algorithm.

**Flow:**
1. Student submits ranked preferences
2. Admin runs allocation algorithm
3. System allocates based on: student rank, company capacity, eligibility rules
4. Students receive allocation results

### 3. Advisor Slot Booking (CALENDAR_SLOT)
**Scenario:** Students book 30-minute slots with academic advisors.

**Flow:**
1. System displays available time slots
2. Student selects slot → System checks conflicts
3. System confirms booking → Sends calendar invite

## Architecture Highlights

### Backend-Driven Design
- **Frontend:** Renders UI based on backend responses, no business logic
- **Backend:** Single source of truth for all decisions
- **API Response Pattern:**
  ```json
  {
    "data": { ... },
    "nextAction": {
      "type": "SUBMIT_SURVEY",
      "message": "Complete and submit before hold expires",
      "expiresAt": "2024-01-15T10:30:00Z"
    }
  }
  ```

### State Machine Enforcement
All entities follow strict state transitions:
```
ELIGIBLE → VIEWING → HOLD_ACTIVE → SUBMITTED → 
PENDING_APPROVAL → APPROVED → ALLOCATED
```

Invalid transitions are rejected at the database level.

### Capacity Safety
```javascript
// Atomic capacity check and update
UPDATE option_capacity 
SET reserved_count = reserved_count + 1
WHERE option_id = ? 
  AND (filled_count + reserved_count) < total_capacity
RETURNING *;

// If no rows returned → capacity exceeded
```

## Project Structure

```
survey_fs/
├── backend/
│   ├── src/
│   │   ├── db/                    # Migrations, seeds, MySQL client
│   │   ├── domains/               # Business logic
│   │   │   ├── surveys/          # Survey CRUD
│   │   │   ├── participation/    # Participation flow
│   │   │   └── auth/             # Authentication
│   │   ├── engines/              # Eligibility, allocation engines
│   │   ├── middleware/           # Auth, error handling, audit
│   │   ├── utils/                # Logger, background jobs
│   │   └── index.js              # Server entry point
│   └── .env                      # Local configuration
│
├── web-admin/
│   └── src/
│       ├── pages/                # Dashboard, Surveys, Approvals
│       ├── components/           # Layout, reusable components
│       ├── api/                  # API client
│       └── utils/                # Enum mappings, helpers
│
└── mobile/
    ├── screens/                  # Survey list, runner, status
    ├── api/                      # API client
    └── utils/                    # Enum mappings, helpers
```

## Database Schema Overview

**Core Tables:**
- `users`, `groups`, `group_members` - User management
- `surveys`, `survey_releases`, `survey_options` - Survey definitions
- `survey_participation`, `survey_selections` - User responses

**Capacity Tables:**
- `option_capacity` - Total capacity per option
- `option_holds` - Temporary seat reservations
- `option_waitlist` - Waitlist queue

**Workflow Tables:**
- `approval_workflows`, `approval_steps`, `approval_items` - Approval flows
- `relay_workflows`, `relay_stages` - Multi-stage workflows

**Audit:**
- `audit_events` - Complete audit trail

## Deployment Readiness

### Current State: Development
- ✅ Local MySQL database
- ✅ Dev authentication (token-based)
- ✅ Hot reload (nodemon, Vite HMR)
- ✅ Seed data for testing

### Production Requirements (Not Yet Implemented)
- ❌ Environment-based configuration
- ❌ Database connection pooling optimization
- ❌ Rate limiting and DDoS protection
- ❌ HTTPS/SSL configuration
- ❌ Monitoring and alerting (Sentry, LogTail)
- ❌ Automated backups
- ❌ Load balancing
- ❌ CI/CD pipeline

## Success Metrics

When fully implemented, the system will support:
- **1000+ concurrent users** without race conditions
- **Sub-second response times** for eligibility checks
- **Zero data loss** with complete audit trails
- **99.9% uptime** during critical selection periods
- **Automatic recovery** from hold expiry and failures

## Timeline Estimate

- **Current Phase:** 30% complete (basic read-only + participation flow)
- **Next 4 weeks:** Survey submission, approval workflows, allocation algorithms
- **Next 8 weeks:** Advanced features (relay, calendar, documents)
- **Next 12 weeks:** Production hardening, testing, deployment

## Conclusion

This system transforms complex survey and allocation processes into a reliable, scalable, and auditable platform. By enforcing all business logic server-side and using proven patterns (state machines, database transactions, background jobs), it eliminates common pitfalls like race conditions, inconsistent state, and capacity overruns.

**Current Status:** Functional MVP for read-only survey display and basic participation flow. Ready for expansion to full feature set.
