# Survey Platform MVP - Project Structure

```
survey_fs/
├── backend/                          # NestJS Backend
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema with 11 entities
│   │   ├── seed.ts                  # Database seed script
│   │   └── migrations/              # Database migrations
│   ├── src/
│   │   ├── common/                  # Shared utilities
│   │   │   ├── decorators/          # CurrentUser, Roles decorators
│   │   │   ├── guards/              # JWT auth, roles guards
│   │   │   └── filters/             # Global exception filter
│   │   ├── modules/
│   │   │   ├── prisma/              # Prisma service
│   │   │   ├── auth/                # Authentication (JWT, bcrypt)
│   │   │   ├── audit/               # Audit event logging
│   │   │   ├── capacity/            # Hold state machine, cleanup job
│   │   │   ├── eligibility/         # Gating logic service
│   │   │   ├── participations/      # Participation state machine
│   │   │   ├── selections/          # Selection management
│   │   │   ├── surveys/             # Survey and release management
│   │   │   ├── admin/               # Admin API controller
│   │   │   └── user/                # User API controller
│   │   ├── app.module.ts            # Root module
│   │   └── main.ts                  # Application bootstrap
│   ├── .env                         # Environment variables
│   └── package.json
│
├── frontend/                         # Next.js Frontend
│   ├── app/
│   │   ├── login/                   # Login page
│   │   ├── admin/                   # Admin dashboard
│   │   ├── user/                    # User portal
│   │   │   └── survey/[id]/         # Survey participation page
│   │   └── page.tsx                 # Root redirect
│   ├── lib/
│   │   ├── api.ts                   # API client with JWT interceptor
│   │   └── auth.ts                  # Auth utilities
│   ├── .env.local                   # Environment variables
│   └── package.json
│
├── README.md                         # Complete documentation
└── setup.ps1                         # Quick setup script
```

## Key Features Implemented

✅ **State Machines**
- Participation: NOT_STARTED → STARTED → SUBMITTED → APPROVED/REJECTED
- Hold: CREATE → EXPIRE/RELEASE/CONVERT

✅ **Transactional Safety**
- Row-level locking with SELECT FOR UPDATE
- Atomic capacity checks and hold creation
- All state transitions in transactions

✅ **Gating Logic**
- Hard gate: Group membership required
- Soft gate: Prerequisite survey approval required
- Real-time eligibility checks

✅ **Audit Trail**
- Every state transition logged
- Old/new state snapshots
- Admin action tracking

✅ **Scheduled Jobs**
- Hold expiry cleanup every minute
- Batch processing with single query

✅ **API Endpoints**
- Admin: Create surveys, manage participations, view capacity
- User: View eligible surveys, select options, submit
- Auth: Register, login with JWT

✅ **Frontend**
- Admin dashboard with approve/reject
- User portal with gating display
- Survey participation with selection management
