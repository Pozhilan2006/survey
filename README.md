# College Survey System

A production-grade survey platform for colleges supporting multiple survey types with complex eligibility rules, multi-stage approvals, and capacity management.

## Project Structure

```
survey_fs/
├── backend/          # Node.js + Express API server
├── mobile/           # React Native mobile app (Expo)
└── web-admin/        # React + Vite admin panel
```

## Tech Stack

### Backend
- Node.js + Express
- MySQL (mysql2)
- JWT authentication
- Background jobs for hold cleanup

### Mobile
- React Native (Expo)
- React Navigation

### Web Admin
- React + Vite
- React Router

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials
npm run migrate
npm run seed
npm run dev
```

### 2. Web Admin Setup
```bash
cd web-admin
npm install
npm start
```

### 3. Mobile Setup
```bash
cd mobile
npm install
npm start
```

## Environment Variables

### Backend (.env)
```env
# MySQL Configuration
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=survey_system

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d

# Background Jobs
HOLD_CLEANUP_INTERVAL_MS=60000
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/surveys` - Get all surveys
- Authentication endpoints (dev mode)
- Participation endpoints

## Architecture

- **Backend-Only Business Logic** - All eligibility and state decisions on backend
- **State Machine-Driven** - Entity lifecycles enforced by state machines
- **MySQL with Transactions** - Race-condition safe capacity management
- **Complete Audit Trail** - All state transitions logged

## License

MIT
