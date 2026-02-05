# Quick Deployment Checklist

## 1. Supabase Setup (5 minutes)
- [ ] Create Supabase project
- [ ] Copy DATABASE_URL with `?pgbouncer=true&connection_limit=1`
- [ ] Save password securely

## 2. Render Backend (10 minutes)
- [ ] Create new Web Service
- [ ] Connect GitHub repo
- [ ] Set root directory: `backend`
- [ ] Add environment variables:
  - DATABASE_URL (from Supabase)
  - JWT_SECRET (generate new)
  - HOLD_EXPIRY_MINUTES=30
  - PORT=3000
  - NODE_ENV=production
- [ ] Deploy and wait
- [ ] Copy backend URL
- [ ] Run seed command in Shell tab

## 3. Vercel Frontend (5 minutes)
- [ ] Import GitHub repo
- [ ] Set root directory: `frontend`
- [ ] Add environment variable:
  - NEXT_PUBLIC_API_URL (Render backend URL)
- [ ] Deploy
- [ ] Copy frontend URL

## 4. Update CORS (2 minutes)
- [ ] Add FRONTEND_URL to Render environment variables
- [ ] Redeploy backend

## 5. Test (5 minutes)
- [ ] Visit frontend URL
- [ ] Login with admin@example.com / admin123
- [ ] Create a survey
- [ ] Login as user1@example.com / user123
- [ ] Start and submit survey
- [ ] Login as admin and approve

## Total Time: ~30 minutes

## Useful Commands

Generate JWT Secret:
```bash
openssl rand -base64 32
```

Seed Database (in Render Shell):
```bash
npm run prisma db seed
```

View Logs (Render):
```bash
# Automatically shown in Logs tab
```

## URLs to Save
- Supabase Dashboard: https://app.supabase.com
- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
- Backend URL: https://survey-backend.onrender.com
- Frontend URL: https://survey-xxx.vercel.app
