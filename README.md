# Survey Platform MVP

Production-grade backend system for unified survey-based selection platform with strict transactional integrity, audit logging, and capacity management.

## Architecture Overview

### Backend Stack
- **Framework**: NestJS with TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control (ADMIN, USER)
- **Scheduling**: NestJS Schedule for automated hold expiry

### Frontend Stack
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **API Client**: Axios with JWT interceptor

### Key Features
- ✅ Strict state machine enforcement for participation lifecycle
- ✅ Transactional seat hold management with row-level locking
- ✅ Hard and soft gating logic for prerequisite surveys
- ✅ Complete audit trail for all state transitions
- ✅ Automatic hold expiry cleanup job
- ✅ Capacity management with real-time availability tracking

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/survey_db
   JWT_SECRET=your-secure-secret-key
   HOLD_EXPIRY_MINUTES=30
   PORT=3000
   ```

4. **Create database**
   ```bash
   createdb survey_db
   ```

5. **Run migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

7. **Seed database**
   ```bash
   npx prisma db seed
   ```

8. **Start development server**
   ```bash
   npm run start:dev
   ```

   Backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3001`

## Test Credentials

After seeding the database, use these credentials:

**Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`

**User Accounts:**
- Email: `user1@example.com`, `user2@example.com`, `user3@example.com`
- Password: `user123`

## API Documentation

### Authentication Endpoints

#### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "accessToken": "jwt-token"
}
```

#### POST /auth/login
Authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { ... },
  "accessToken": "jwt-token"
}
```

### Admin Endpoints (Require ADMIN role)

#### POST /admin/surveys
Create a new survey with options.

**Request Body:**
```json
{
  "name": "Hostel Selection",
  "description": "Select your preferred hostel",
  "surveyType": "PICK_N",
  "options": [
    {
      "optionName": "North Hostel",
      "optionData": { "facilities": ["WiFi", "Gym"] }
    }
  ]
}
```

#### POST /admin/surveys/:id/releases
Create a survey release for a group.

**Request Body:**
```json
{
  "groupId": "group-uuid",
  "releaseOrder": 1,
  "capacityConfig": [
    {
      "optionId": "option-uuid",
      "maxCapacity": 10
    }
  ]
}
```

#### GET /admin/participations
List all participations with optional filters.

**Query Parameters:**
- `status`: Filter by status (SUBMITTED, APPROVED, REJECTED)
- `surveyId`: Filter by survey ID
- `userId`: Filter by user ID

#### PATCH /admin/participations/:id/approve
Approve a submitted participation.

**Response:**
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "reviewedAt": "2026-02-04T16:00:00Z",
  "reviewedBy": "admin-uuid"
}
```

#### PATCH /admin/participations/:id/reject
Reject a submitted participation.

**Request Body:**
```json
{
  "reason": "Incomplete information"
}
```

#### GET /admin/capacity/:releaseId
View capacity utilization for a release.

**Response:**
```json
[
  {
    "optionId": "uuid",
    "optionName": "North Hostel",
    "maxCapacity": 10,
    "currentUtilization": 3,
    "activeHolds": 2,
    "available": 5
  }
]
```

### User Endpoints (Require USER role)

#### GET /user/surveys
List eligible surveys with gating information.

**Response:**
```json
[
  {
    "releaseId": "uuid",
    "survey": { "id": "uuid", "name": "Hostel Selection" },
    "group": { "id": "uuid", "name": "First Year Students" },
    "releaseOrder": 1,
    "eligibility": {
      "isEligible": true
    }
  },
  {
    "releaseId": "uuid",
    "survey": { "id": "uuid", "name": "Room Selection" },
    "eligibility": {
      "isEligible": false,
      "gateType": "SOFT",
      "denyReason": "You must complete the prerequisite survey first",
      "prerequisiteDetails": {
        "surveyName": "Hostel Selection",
        "currentStatus": "NOT_STARTED"
      }
    }
  }
]
```

#### POST /user/participations/:releaseId/start
Start a survey participation.

**Response:**
```json
{
  "id": "participation-uuid",
  "status": "STARTED",
  "startedAt": "2026-02-04T16:00:00Z"
}
```

**Error (403 Forbidden):**
```json
{
  "message": "You must complete the prerequisite survey first",
  "gateType": "SOFT",
  "prerequisiteDetails": { ... }
}
```

#### POST /user/participations/:id/selections
Add an option selection (creates hold).

**Request Body:**
```json
{
  "optionId": "option-uuid"
}
```

**Response:**
```json
{
  "selection": {
    "id": "uuid",
    "optionId": "option-uuid",
    "selectionOrder": 1
  },
  "hold": {
    "id": "uuid",
    "expiresAt": "2026-02-04T16:30:00Z"
  }
}
```

**Error (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Option capacity exceeded",
  "errorCode": "CAPACITY_EXCEEDED"
}
```

#### DELETE /user/participations/:id/selections/:optionId
Remove an option selection (releases hold).

#### POST /user/participations/:id/submit
Submit participation for review.

**Response:**
```json
{
  "id": "uuid",
  "status": "SUBMITTED",
  "submittedAt": "2026-02-04T16:00:00Z"
}
```

#### GET /user/participations/:id
View own participation details.

## State Machines

### Participation State Machine

```
NOT_STARTED → STARTED → SUBMITTED → APPROVED
                                  ↘ REJECTED
```

**Transitions:**
- `NOT_STARTED → STARTED`: User opens survey
- `STARTED → SUBMITTED`: User submits selections
- `SUBMITTED → APPROVED`: Admin approves
- `SUBMITTED → REJECTED`: Admin rejects

All transitions are audited with old/new state snapshots.

### Hold State Machine

```
CREATE → EXPIRE (automatic)
      ↘ RELEASE (user deselects)
      ↘ CONVERT (admin approves)
```

**Operations:**
- `CREATE`: Atomic capacity check + hold creation with `SELECT FOR UPDATE`
- `EXPIRE`: Scheduled job releases expired holds
- `RELEASE`: User removes selection
- `CONVERT`: Admin approval converts holds to utilization

## Database Schema

### Core Entities
- `User`: Users with roles (ADMIN, USER)
- `Group`: User groups for survey targeting
- `GroupMember`: Junction table for user-group relationships
- `Survey`: Survey definitions with type (PICK_N)
- `SurveyRelease`: Survey releases to groups with ordering
- `SurveyOption`: Options within surveys
- `SurveyParticipation`: User participation with state machine
- `SurveySelection`: User's selected options
- `OptionCapacity`: Capacity configuration per option per release
- `OptionHold`: Temporary seat reservations with expiry
- `AuditEvent`: Complete audit trail

### Key Relationships
- Users belong to Groups via GroupMember
- Surveys have multiple Options
- Surveys have multiple Releases (one per Group)
- Participations track user progress through a Release
- Selections link Participations to Options
- Holds reserve capacity temporarily
- Capacity tracks utilization per Option per Release

## Gating Logic

### Hard Gate
User cannot see the survey if not a member of the target group.

### Soft Gate
User can see the survey but cannot start it until prerequisite surveys are APPROVED.

**Prerequisite Determination:**
Based on `releaseOrder`. Survey with order 2 requires survey with order 1 to be APPROVED.

## Transactional Guarantees

### Seat Hold Creation
```sql
BEGIN;
SELECT * FROM "OptionCapacity" WHERE "optionId" = ? FOR UPDATE;
-- Check capacity
INSERT INTO "OptionHold" ...;
COMMIT;
```

### Participation Approval
```sql
BEGIN;
UPDATE "OptionCapacity" SET "currentUtilization" = "currentUtilization" + 1 ...;
UPDATE "OptionHold" SET "isReleased" = true ...;
UPDATE "SurveyParticipation" SET "status" = 'APPROVED' ...;
INSERT INTO "AuditEvent" ...;
COMMIT;
```

## Scheduled Jobs

### Hold Expiry Cleanup
Runs every minute via `@Cron(CronExpression.EVERY_MINUTE)`.

Marks holds as released where `expiresAt < NOW()` and `isReleased = false`.

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Flow

1. **Login as user1@example.com**
2. **View surveys** - Should see Hostel Selection (eligible) and Room Selection (locked)
3. **Start Hostel Selection**
4. **Select 2 options** - Verify holds created
5. **Deselect 1 option** - Verify hold released
6. **Submit participation**
7. **Login as admin@example.com**
8. **View participations** - Filter by SUBMITTED
9. **Approve user1's participation**
10. **Login as user1@example.com again**
11. **View surveys** - Room Selection should now be unlocked

## Production Deployment

### Environment Variables
Set these in production:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong random secret (use `openssl rand -base64 32`)
- `HOLD_EXPIRY_MINUTES`: Hold duration (default 30)
- `PORT`: Server port

### Build Backend
```bash
npm run build
npm run start:prod
```

### Build Frontend
```bash
npm run build
npm start
```

### Database Migrations
Always run migrations before deployment:
```bash
npx prisma migrate deploy
```

## Architecture Decisions

### Why Row-Level Locking?
Prevents race conditions when multiple users select the same option simultaneously. `SELECT FOR UPDATE` ensures atomic capacity checks.

### Why Separate Holds Table?
Allows tracking of temporary reservations independently from final utilization. Enables automatic expiry and capacity recovery.

### Why Audit Events?
Complete traceability for compliance and debugging. Every state transition is logged with old/new state.

### Why State Machines?
Enforces business rules at the service layer. Prevents invalid transitions and ensures data integrity.

## Troubleshooting

### Database Connection Failed
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `createdb survey_db`

### Prisma Client Not Found
Run: `npx prisma generate`

### Hold Expiry Not Working
- Verify backend is running
- Check logs for cron job execution
- Ensure `@nestjs/schedule` is imported in `AppModule`

### Frontend Cannot Connect to Backend
- Verify backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS is enabled in `main.ts`

## License

UNLICENSED - Private use only
