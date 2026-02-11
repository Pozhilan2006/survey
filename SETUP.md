# Setup Guide for Collaborators

This guide will help you get the College Survey System running on your local machine in under 10 minutes.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **MySQL 8.0+** - [Download here](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download here](https://git-scm.com/)

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd survey_fs
```

## Step 2: Setup MySQL Database

### Option A: Using MySQL Workbench (Recommended for beginners)

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click "Create a new schema" button (cylinder with + icon)
4. Name it: `survey_system`
5. Click "Apply"

### Option B: Using Command Line

```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE survey_system;
EXIT;
```

## Step 3: Setup Backend

```bash
cd backend
npm install
```

Create your environment file:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit `.env` file and update these values:
```env
MYSQL_PASSWORD=your_actual_mysql_password
JWT_SECRET=any_random_string_at_least_32_characters_long_for_security
```

Run database migrations:
```bash
npm run migrate
```

You should see:
```
✅ Migration completed successfully!
```

Seed test data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
✅ Database connected
```

**Test it:** Open http://localhost:3000/health in your browser. You should see `{"status":"ok"}`

## Step 4: Setup Web Admin Panel

Open a **new terminal window**:

```bash
cd web-admin
npm install
npm start
```

The admin panel will open at http://localhost:5173

## Step 5: Setup Mobile App (Optional)

Open a **new terminal window**:

```bash
cd mobile
npm install
npm start
```

Press:
- `w` for web preview
- `a` for Android emulator (requires Android Studio)
- `i` for iOS simulator (requires Xcode on Mac)

## Troubleshooting

### "Migration failed" or "Connection refused"

**Problem:** Can't connect to MySQL

**Solution:**
1. Make sure MySQL is running
2. Check your password in `.env` matches your MySQL password
3. Verify database name is `survey_system`

### "Port 3000 already in use"

**Problem:** Another app is using port 3000

**Solution:** Change `PORT=3001` in backend `.env` file

### "npm install" fails

**Problem:** Network or permission issues

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

## What's Next?

- **View Surveys:** Go to http://localhost:5173 (web admin)
- **Test API:** Use the endpoints listed in README.md
- **Add Data:** Run `npm run seed` again to add more test data

## Project Structure Quick Reference

```
survey_fs/
├── backend/              # API server (runs on port 3000)
│   ├── src/
│   │   ├── db/          # Database migrations and seeds
│   │   ├── domains/     # Business logic (surveys, participation)
│   │   └── index.js     # Server entry point
│   └── .env             # Your local config (DO NOT commit)
│
├── web-admin/           # Admin panel (runs on port 5173)
│   └── src/
│       ├── pages/       # Dashboard, Surveys, etc.
│       └── api/         # API client
│
└── mobile/              # React Native app
    └── screens/         # Mobile screens
```

## Need Help?

- Check the main [README.md](./README.md) for architecture details
- Review API endpoints in backend code
- Ask your team lead for access credentials
