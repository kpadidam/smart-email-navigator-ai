# Railway PostgreSQL Setup Guide

## Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub

## Step 2: Create PostgreSQL Database
1. Click "New Project"
2. Select "Deploy PostgreSQL"
3. Railway will automatically provision a PostgreSQL database

## Step 3: Get Database Credentials
1. Click on your PostgreSQL service
2. Go to "Connect" tab
3. Copy the `DATABASE_URL` (it will look like: `postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway`)

## Step 4: Update Your .env Files

### Update `/backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:PORT/railway
```

### Update root `/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:PORT/railway
```

## Step 5: Generate Prisma Client and Run Migrations

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Create and apply migrations to Railway database
npx prisma migrate dev --name init

# (Optional) View your database in Prisma Studio
npx prisma studio
```

## Step 6: Verify Connection
```bash
# Test the connection
npx prisma db pull
```

## Important Notes:
- Railway provides a free tier with 500 hours/month
- The database URL includes all credentials - keep it secure!
- Railway databases are accessible from anywhere (no IP whitelisting needed)
- Database backups are automatic on paid plans

## Environment Variables Summary:
- `DATABASE_URL`: Your Railway PostgreSQL connection string
- `FRONTEND_URL`: http://localhost:8081
- `PORT`: 5001
- `JWT_SECRET`: (keep your existing secret)
- `GOOGLE_CLIENT_ID`: (your Google OAuth client ID)
- `GOOGLE_CLIENT_SECRET`: (your Google OAuth secret)
- `GOOGLE_REDIRECT_URI`: http://localhost:5001/api/auth/google/callback

## Troubleshooting:
- If migrations fail, ensure your DATABASE_URL is correct
- Check Railway dashboard for database status
- Use `npx prisma studio` to view and manage data
- Railway logs are available in the dashboard