# Database Setup Guide - Production Best Practices

## 🎉 Build Success!

Your Render build is now **successful** with Prisma 5.22.0! Follow these steps to complete the deployment.

## Critical: Two-Phase Database Setup

### Phase 1: Run Migrations ONCE (Locally)

**Run migrations from your local machine:**

```bash
cd backend
npx prisma migrate deploy
```

**OR** (preferred for development):

```bash
npx prisma migrate dev
```

**Verify in Supabase:**
1. Go to Supabase Dashboard → Table Editor
2. Confirm all tables exist (User, Survey, SurveyRelease, etc.)

### Phase 2: Configure Render

#### Step 1: Get TWO Connection Strings from Supabase

Go to **Supabase Dashboard → Settings → Database**:

**A. Pooled Connection (for Render runtime)** ✅ RECOMMENDED
- Find "Connection Pooling" section
- Mode: **Transaction**
- Copy the URI (looks like):
  ```
  postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
  ```

**B. Direct Connection (for local migrations only)**
- Find "Connection String" section
- URI tab:
  ```
  postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
  ```

#### Step 2: Update Render Environment Variables

1. Go to **Render Dashboard → Your Service → Environment**
2. Add/Update these variables:

```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-secure-random-secret-here
PORT=3000
NODE_ENV=production
```

⚠️ **Use the POOLED connection (port 6543) for Render!**

#### Step 3: Update Render Start Command

**REMOVE migrations from startup** (they're already run locally):

1. Go to **Render Dashboard → Settings → Build & Deploy**
2. Update **Start Command** to:

```bash
npm run start:prod
```

❌ **Remove this:** `npm run prisma:migrate &&`

✅ **Final command:** `npm run start:prod`

### Why This Approach?

1. **Pooled Connection (6543)**: Much more stable for runtime, handles connection pooling
2. **No startup migrations**: Prevents crash loops and race conditions
3. **Manual migrations**: Run once when schema changes, not on every deploy

## Environment Variables Summary

**Render (Production):**
```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=generate-a-secure-random-string
PORT=3000
NODE_ENV=production
```

**Local (.env):**
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
JWT_SECRET=same-as-render-or-different-for-local
PORT=3000
```

## Verify Deployment

Once deployed, test your API:
```bash
curl https://your-app.onrender.com/health
```

## Next Steps

1. ✅ Build successful
2. ✅ Migrations run locally
3. ✅ Pooled connection configured
4. ✅ Start command updated
5. → Deploy frontend to Vercel
6. → Update frontend `NEXT_PUBLIC_API_URL`
