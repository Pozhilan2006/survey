# CRITICAL: Render Database Configuration Fix

## Problem
Migrations are failing with:
```
Error: P1001: Can't reach database server at `aws-1-ap-southeast-1.pooler.supabase.com:6543`
```

## Root Cause
**Pooled connections (port 6543) DO NOT support migrations!**

Migrations require a **direct connection (port 5432)**.

## Solution

### Option 1: Use Direct Connection for Everything (SIMPLEST)

**Update Render Environment Variable:**

```
DATABASE_URL=postgresql://postgres.japmtjbzweqclegolprn:sivajivailajalebi@db.japmtjbzweqclegolprn.supabase.co:5432/postgres
```

**Key changes:**
- Host: `db.japmtjbzweqclegolprn.supabase.co` (not pooler)
- Port: `5432` (not 6543)

**Start Command stays the same:**
```bash
npx --yes prisma@5.22.0 migrate deploy && npm run start:prod
```

### Option 2: Two-Phase Approach (RECOMMENDED for Production)

**Phase 1: Initial Deploy with Migrations**

1. Set DATABASE_URL to **direct connection (5432)**
2. Deploy once to run migrations
3. Verify tables are created in Supabase

**Phase 2: Switch to Pooled for Runtime**

1. Update DATABASE_URL to **pooled connection (6543)**
2. Update Start Command to: `npm run start:prod` (remove migrations)
3. Redeploy

## Quick Fix (Do This Now)

1. Go to **Render Dashboard → Environment**
2. Update `DATABASE_URL` to:
   ```
   postgresql://postgres.japmtjbzweqclegolprn:sivajivailajalebi@db.japmtjbzweqclegolprn.supabase.co:5432/postgres
   ```
3. Save and let it redeploy

This will allow migrations to run successfully!

## After Successful Deploy

Once the app is running, you can optionally switch to the pooled connection for better performance:
- Update DATABASE_URL to use port 6543
- Remove migrations from start command
- Redeploy
