# Cloud Deployment Guide

This guide covers deploying the Survey Platform to Vercel (frontend), Render (backend), and Supabase (database).

## Prerequisites

1. GitHub account with the code pushed to a repository
2. Accounts on:
   - [Supabase](https://supabase.com) (free tier available)
   - [Render](https://render.com) (free tier available)
   - [Vercel](https://vercel.com) (free tier available)

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name**: `survey-platform`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **Create new project**
5. Wait for project to be provisioned (~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. **Important**: Add `?pgbouncer=true&connection_limit=1` to the end for connection pooling:
   ```
   postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```

### 1.3 Enable Required Extensions (Optional)

In Supabase SQL Editor, run:
```sql
-- Already enabled by default, but verify
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Step 2: Deploy Backend to Render

### 2.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Select the `survey` repository
5. Configure:
   - **Name**: `survey-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: 
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```
     npx prisma migrate deploy && npm run start:prod
     ```
   - **Plan**: Free

### 2.2 Add Environment Variables

In the **Environment** section, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string from Step 1.2 |
| `JWT_SECRET` | Generate a strong secret (use `openssl rand -base64 32`) |
| `HOLD_EXPIRY_MINUTES` | `30` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 2.3 Deploy

1. Click **Create Web Service**
2. Wait for deployment (~5-10 minutes)
3. Once deployed, copy your backend URL (e.g., `https://survey-backend.onrender.com`)

### 2.4 Verify Backend

Visit `https://your-backend-url.onrender.com` - you should see the NestJS default response.

### 2.5 Seed Database (One-time)

After first deployment, run seed manually:

1. In Render dashboard, go to your service
2. Click **Shell** tab
3. Run:
   ```bash
   npm run prisma db seed
   ```

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Select the `survey` repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### 3.2 Add Environment Variables

In **Environment Variables** section, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL (e.g., `https://survey-backend.onrender.com`) |

### 3.3 Deploy

1. Click **Deploy**
2. Wait for deployment (~2-3 minutes)
3. Once deployed, you'll get a URL like `https://survey-xxx.vercel.app`

### 3.4 Verify Frontend

1. Visit your Vercel URL
2. You should be redirected to `/login`
3. Try logging in with test credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

## Step 4: Configure CORS (Important!)

The backend needs to allow requests from your Vercel frontend.

### 4.1 Update main.ts

In `backend/src/main.ts`, update CORS configuration:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3001',
    'https://your-vercel-url.vercel.app', // Add your actual Vercel URL
  ],
  credentials: true,
});
```

### 4.2 Redeploy Backend

Commit and push changes to trigger Render redeployment.

## Step 5: Production Checklist

- [ ] Database connection working (check Render logs)
- [ ] Migrations applied successfully
- [ ] Database seeded with test users
- [ ] Backend health check responding
- [ ] Frontend can connect to backend
- [ ] Login working with test credentials
- [ ] Admin dashboard accessible
- [ ] User portal accessible
- [ ] Survey creation and participation working
- [ ] Hold expiry job running (check Render logs every minute)

## Environment Variables Summary

### Supabase
- No additional configuration needed after setup

### Render (Backend)
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
JWT_SECRET=<generate-with-openssl-rand-base64-32>
HOLD_EXPIRY_MINUTES=30
PORT=3000
NODE_ENV=production
```

### Vercel (Frontend)
```
NEXT_PUBLIC_API_URL=https://survey-backend.onrender.com
```

## Monitoring & Logs

### Backend Logs (Render)
- Go to Render dashboard → Your service → **Logs** tab
- Watch for:
  - `Application is running on: http://localhost:3000`
  - `Expired X holds at [timestamp]` (every minute)
  - Any database connection errors

### Frontend Logs (Vercel)
- Go to Vercel dashboard → Your project → **Deployments** → Click deployment → **Functions** tab
- Check for API connection errors

### Database Monitoring (Supabase)
- Go to Supabase dashboard → **Database** → **Roles**
- Monitor connection count and query performance

## Troubleshooting

### Backend won't start on Render
- Check DATABASE_URL is correct
- Verify Prisma migrations ran: Check logs for "Migration applied"
- Ensure all dependencies installed: Check build logs

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS configuration in backend
- Ensure backend is running (visit backend URL directly)

### Database connection errors
- Verify Supabase project is active
- Check connection string includes `?pgbouncer=true&connection_limit=1`
- Ensure password is correct (no special characters causing issues)

### Hold expiry job not running
- Check Render logs for cron messages
- Verify @nestjs/schedule is installed
- Ensure ScheduleModule is imported in AppModule

## Scaling Considerations

### Free Tier Limitations
- **Render**: Spins down after 15 min inactivity (cold starts ~30s)
- **Vercel**: 100GB bandwidth/month
- **Supabase**: 500MB database, 2GB bandwidth

### Upgrade Path
1. **Render**: Upgrade to Starter ($7/mo) for always-on
2. **Vercel**: Pro plan ($20/mo) for more bandwidth
3. **Supabase**: Pro plan ($25/mo) for 8GB database

## Security Recommendations

1. **Change default passwords**: Update seed script or delete test users in production
2. **Rotate JWT_SECRET**: Use environment variable, never commit to git
3. **Enable SSL**: Already handled by Render and Vercel
4. **Rate limiting**: Add rate limiting middleware to backend
5. **Input validation**: Already implemented with class-validator
6. **SQL injection**: Protected by Prisma ORM

## Backup Strategy

### Database Backups (Supabase)
- Automatic daily backups on Pro plan
- Manual backup: Use Supabase dashboard → Database → Backups

### Code Backups
- Already on GitHub
- Vercel keeps deployment history
- Render keeps build history

## Cost Estimate (Free Tier)

- **Supabase**: $0/month (up to 500MB)
- **Render**: $0/month (with cold starts)
- **Vercel**: $0/month (up to 100GB bandwidth)

**Total**: $0/month for development/testing

## Next Steps After Deployment

1. Test complete user flow end-to-end
2. Monitor logs for first 24 hours
3. Set up error tracking (e.g., Sentry)
4. Configure custom domain (optional)
5. Set up CI/CD for automated deployments
6. Add monitoring/alerting for downtime
