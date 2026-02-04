# Quick Setup Script for Survey Platform

Write-Host "Survey Platform MVP - Quick Setup" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Backend Setup
Write-Host "Setting up backend..." -ForegroundColor Yellow
cd backend

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "IMPORTANT: Before proceeding, ensure PostgreSQL is running and update .env file" -ForegroundColor Red
Write-Host "1. Create database: createdb survey_db" -ForegroundColor Yellow
Write-Host "2. Update DATABASE_URL in backend/.env" -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Press Enter when ready to continue..."

Write-Host "Running database migrations..." -ForegroundColor Cyan
npx prisma migrate dev --name init

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "Seeding database..." -ForegroundColor Cyan
npx prisma db seed

Write-Host ""
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host ""

# Frontend Setup
Write-Host "Setting up frontend..." -ForegroundColor Yellow
cd ../frontend

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Frontend setup complete!" -ForegroundColor Green
Write-Host ""

# Final Instructions
Write-Host "===================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start backend (in backend directory):" -ForegroundColor Cyan
Write-Host "   npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "2. Start frontend (in frontend directory):" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Open browser to http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin: admin@example.com / admin123" -ForegroundColor White
Write-Host "  User:  user1@example.com / user123" -ForegroundColor White
Write-Host ""
