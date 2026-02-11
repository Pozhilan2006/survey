# Survey Management System

Enterprise-grade survey and seat allocation platform for educational institutions.

## Quick Start

```bash
# Backend
cd backend && npm install
cp .env.example .env  # Configure MySQL credentials
npm run migrate && npm run seed
npm run dev

# Web Admin
cd web-admin && npm install && npm start

# Mobile
cd mobile && npm install && npm start
```

## Prerequisites

- Node.js 18+
- MySQL 8.0+

## Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/SCHEMA.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Architecture

- **Backend**: Node.js, Express, MySQL
- **Web Admin**: React, Vite
- **Mobile**: React Native, Expo

## License

MIT
