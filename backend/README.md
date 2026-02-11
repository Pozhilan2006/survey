# Backend

Production-grade survey system backend built with Node.js and Express.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Authentication**: JWT + College SSO

## Project Structure

```
src/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── domains/          # Domain-driven modules
├── engines/          # Core engines (eligibility, state machine, allocation)
├── utils/            # Utility functions
└── db/              # Database migrations and seeds
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with test data
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

- `GET /health` - Health check
- `POST /auth/login` - User authentication
- `GET /users/me` - Get current user
- `GET /surveys` - List surveys
- `POST /surveys` - Create survey
- `GET /releases/:id/eligibility` - Check eligibility
- `POST /participation/:id/hold` - Hold seat
- `POST /participation/:id/submit` - Submit survey

## Architecture

### Backend-Only Business Logic
All eligibility checks, state transitions, and capacity decisions happen on the backend. The frontend is a dumb UI that only renders what the backend provides.

### State Machine-Driven
All entity lifecycles (participation, approvals, documents) are enforced by state machines to ensure valid transitions.

### Race-Condition Safe
PostgreSQL advisory locks and atomic operations prevent race conditions in capacity management.

### Complete Audit Trail
Every state transition and action is logged to the audit_events table.

## Development

### Adding a New Domain

1. Create domain folder: `src/domains/[domain-name]/`
2. Add files: `routes.js`, `controller.js`, `service.js`, `repository.js`
3. Register routes in `src/app.js`

### Database Migrations

Create new migration file in `src/db/migrations/` with format:
```
[number]_[description].sql
```

Run migrations:
```bash
npm run migrate
```

## Testing

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npm test -- path/to/test.js
```

## Deployment

See main README for deployment instructions.
