# Render Deployment Troubleshooting

## Issue 1: Prisma 7.x Breaking Changes ✅ FIXED
**Error**: `The datasource property 'url' is no longer supported`

**Solution**: Downgraded Prisma from v7.3.0 to v5.22.0
- Updated `prisma` to `^5.22.0`
- Updated `@prisma/client` to `^5.22.0`

## Issue 2: Peer Dependency Conflict ✅ FIXED
**Error**: `peer @nestjs/common@"^8.0.0 || ^9.0.0 || ^10.0.0" from @nestjs/config@3.3.0`

**Solution**: Upgraded @nestjs/config and added legacy-peer-deps flag
- Updated `@nestjs/config` from `^3.2.0` to `^4.0.0`
- Added `--legacy-peer-deps` flag to Render build command

## Issue 3: Prisma Installing v7.x Instead of v5.x ✅ FIXED
**Error**: `Prisma CLI Version : 7.3.0` (even though package.json specified `^5.22.0`)

**Root Cause**: The `^` in version numbers allows npm to install newer minor/patch versions. With `legacy-peer-deps`, npm was installing the latest compatible version (7.x).

**Solution**: Lock Prisma to exact version without caret
- Changed `"prisma": "^5.22.0"` to `"prisma": "5.22.0"`
- Changed `"@prisma/client": "^5.22.0"` to `"@prisma/client": "5.22.0"`
- Regenerated package-lock.json with exact versions
- Used `npm install --save-exact` to ensure no version ranges

## Current Configuration

### package.json Dependencies (Final)
```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/config": "^4.0.0",
  "@nestjs/core": "^11.0.1",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/passport": "^11.0.0",
  "@nestjs/platform-express": "^11.0.1",
  "@nestjs/schedule": "^4.1.1",
  "@prisma/client": "5.22.0",
  "bcrypt": "^5.1.1",
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.1",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1"
}
```

### package.json DevDependencies (Final)
```json
{
  "prisma": "5.22.0"
}
```

### .npmrc Configuration
```
legacy-peer-deps=true
```

### render.yaml Build Command
```yaml
buildCommand: npm install && npx prisma generate && npm run build
```

## Next Deployment Should Succeed

The latest commit includes all fixes. Render will automatically:
1. Clone the latest code
2. Install dependencies with `--legacy-peer-deps`
3. Generate Prisma client (v5.22.0)
4. Build the NestJS application
5. Run migrations on startup
6. Start the production server

## Monitoring Deployment

Watch the Render logs for:
- ✅ `npm install` completes successfully
- ✅ `npx prisma generate` completes
- ✅ `npm run build` completes
- ✅ `npx prisma migrate deploy` runs migrations
- ✅ `Application is running on: http://localhost:3000`

## If Still Failing

Check these common issues:
1. **DATABASE_URL not set**: Verify in Render environment variables
2. **JWT_SECRET not set**: Add to environment variables
3. **Migration errors**: Check database connectivity
4. **Build timeout**: Upgrade from free tier if needed
