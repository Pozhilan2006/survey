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

#### Step 1: Get Connection String from Supabase

Go to **Supabase Dashboard → Settings → Database**:

**For Migrations (REQUIRED):**
- Find "Connection String" section (NOT Connection Pooling)
- URI tab
- Copy the **direct connection** (looks like):
  ```
  postgresql://postgres.japmtjbzweqclegolprn:PASSWORD@db.japmtjbzweqclegolprn.supabase.co:5432/postgres
  ```

⚠️ **CRITICAL:** Migrations CANNOT use pooled connections (port 6543). You MUST use the direct connection (port 5432).

#### Step 2: Update Render Environment Variables

1. Go to **Render Dashboard → Your Service → Environment**
2. Add/Update these variables:

```bash
DATABASE_URL=postgresql://postgres.japmtjbzweqclegolprn:sivajivailajalebi@db.japmtjbzweqclegolprn.supabase.co:5432/postgres
JWT_SECRET=203e014ff4e487b14c6aab2b7b80f6f5a0620ea4efce8286162708531f2cc3f2b8cceaa377d69cf6cd4842f35e46353d2ba0717ac04a9bc9e939a1efbb394b52
PORT=3000
NODE_ENV=production
```

⚠️ **Use the DIRECT connection (port 5432) for now!**

#### Step 3: Verify Start Command

**Keep migrations in start command for initial deploy:**

```bash
npx --yes prisma@5.22.0 migrate deploy && npm run start:prod
```

✅ This will run migrations on first deploy using the direct connection.

**After first successful deploy**, you can optionally:
1. Remove migrations from start command: `npm run start:prod`
2. Switch to pooled connection (port 6543) for better performance

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
