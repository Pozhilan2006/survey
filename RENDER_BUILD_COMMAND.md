# CRITICAL: Update Render Build Command

The `render.yaml` file is NOT being used by Render. You MUST manually update the build command in the Render dashboard.

## Go to Render Dashboard

1. Navigate to your service: https://dashboard.render.com
2. Click on your `survey-backend` service
3. Go to **Settings** tab
4. Scroll to **Build & Deploy** section
5. Click **Edit** next to "Build Command"

## Update Build Command To:

```bash
npm install --legacy-peer-deps && npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact --legacy-peer-deps && npx prisma generate && npm run build
```

## Update Start Command To:

```bash
npx prisma migrate deploy && npm run start:prod
```

## Why This Works:

1. First `npm install` installs all dependencies from package.json
2. Second `npm install` DOWNGRADES Prisma to exactly 5.22.0
3. `npx prisma` will use the locally installed Prisma 5.22.0 from node_modules
4. This ensures Prisma 5.22.0 is used for generate and migrate

## Save and Redeploy

After updating both commands, click **Save Changes** and trigger a manual deploy.

You should finally see `Prisma CLI Version : 5.22.0` in the logs! 🎯
