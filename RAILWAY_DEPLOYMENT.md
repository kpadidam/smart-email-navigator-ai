# Railway Deployment Guide for Smart Email Navigator AI

## Overview
This guide covers deploying the Smart Email Navigator AI to Railway with PostgreSQL database and automatic deployments.

## Prerequisites
- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository with your code
- Google OAuth credentials configured

## Architecture
```
Smart Email Navigator AI
├── Backend (Node.js + Express + Prisma)
│   ├── PostgreSQL Database (Railway Managed)
│   ├── API Server (Port 5001)
│   └── Socket.IO for real-time updates
└── Frontend (React + Vite)
    └── Static hosting or separate deployment
```

## Step 1: Create Railway Project

### 1.1 Sign in to Railway
```bash
# Install Railway CLI (optional but recommended)
npm install -g @railway/cli

# Login to Railway
railway login
```

### 1.2 Create New Project
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select your repository

## Step 2: Add PostgreSQL Database

### 2.1 Add Database Service
1. In your Railway project, click "New Service"
2. Select "Database" → "Add PostgreSQL"
3. Railway will provision a PostgreSQL database automatically

### 2.2 Get Database URL
1. Click on the PostgreSQL service
2. Go to "Connect" tab
3. Copy the `DATABASE_URL` (format: `postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway`)

## Step 3: Configure Environment Variables

### 3.1 Backend Environment Variables
In Railway dashboard, add these environment variables:

```bash
# Database (Railway provides this automatically when you link services)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://your-frontend.vercel.app

# Port (Railway sets this automatically)
PORT=${{PORT}}

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.up.railway.app/api/auth/google/callback

# Node Environment
NODE_ENV=production

# Optional: OpenAI for email categorization
OPENAI_API_KEY=your_openai_key
```

### 3.2 Link Database to Backend
1. In Railway dashboard, go to your backend service
2. Click "Variables" tab
3. Click "Add Reference" → Select your PostgreSQL database
4. This automatically adds DATABASE_URL

## Step 4: Configure Build & Deploy Settings

### 4.1 Build Configuration
Railway automatically detects Node.js projects, but you can customize:

1. Go to Settings → Build
2. Set Root Directory: `/backend`
3. Build Command: `npm install && npx prisma generate`
4. Install Command: `npm ci`

### 4.2 Deploy Configuration
1. Go to Settings → Deploy
2. Start Command: `npx prisma migrate deploy && npm start`
3. Health Check Path: `/api/health`
4. Restart Policy: ON_FAILURE

## Step 5: Database Migrations

### 5.1 Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### 5.2 Create Initial Migration
```bash
# For development
npx prisma migrate dev --name init

# For production (Railway runs this automatically)
npx prisma migrate deploy
```

### 5.3 Seed Database (Optional)
Create `backend/prisma/seed.js`:
```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Add seed data if needed
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

## Step 6: Deploy to Railway

### 6.1 Automatic Deployment
Railway automatically deploys when you push to your connected GitHub branch:
```bash
git add .
git commit -m "Configure Railway deployment"
git push origin main
```

### 6.2 Manual Deployment (using CLI)
```bash
# From project root
railway up --service backend

# Or deploy specific directory
cd backend && railway up
```

### 6.3 Monitor Deployment
1. Check Railway dashboard for build logs
2. View deployment status
3. Check application logs for errors

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### 7.2 Update Environment Variables
Update these after getting your Railway URL:
- `GOOGLE_REDIRECT_URI` in Google Console
- `FRONTEND_URL` if deploying frontend separately

## Step 8: Frontend Deployment Options

### Option A: Deploy Frontend to Vercel
1. Connect GitHub repo to Vercel
2. Set environment variables:
   ```bash
   VITE_API_URL=https://your-backend.up.railway.app
   ```
3. Deploy

### Option B: Deploy Frontend to Railway (Separate Service)
1. Create new service in same Railway project
2. Set root directory to `/` (project root)
3. Build command: `npm install && npm run build`
4. Start command: `npm run preview -- --port $PORT --host 0.0.0.0`

### Option C: Serve Frontend from Backend
Update backend to serve frontend build:
```javascript
// In app.js, add after API routes
app.use(express.static(path.join(__dirname, '../../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});
```

## Step 9: Post-Deployment Tasks

### 9.1 Verify Health Check
```bash
curl https://your-backend.up.railway.app/api/health
```

### 9.2 Test OAuth Flow
1. Update Google OAuth redirect URI
2. Test login flow
3. Verify token generation

### 9.3 Monitor Logs
```bash
# Using Railway CLI
railway logs --service backend

# Or view in dashboard
```

## Monitoring & Maintenance

### Database Management
```bash
# Connect to production database
railway run npx prisma studio

# View database metrics in Railway dashboard
```

### Performance Monitoring
- CPU and Memory usage in Railway dashboard
- Set up alerts for high usage
- Monitor response times

### Backup Strategy
1. Railway provides automatic backups (Pro plan)
2. Manual backup:
   ```bash
   railway run pg_dump $DATABASE_URL > backup.sql
   ```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
- Verify DATABASE_URL is set correctly
- Check if database service is running
- Ensure Prisma schema is generated

#### 2. Build Failures
- Check Node version compatibility
- Verify all dependencies are in package.json
- Review build logs in Railway dashboard

#### 3. OAuth Not Working
- Update redirect URIs in Google Console
- Verify environment variables are set
- Check CORS configuration

#### 4. Port Issues
- Railway assigns PORT dynamically
- Use `process.env.PORT || 5001`
- Don't hardcode ports

### Debug Commands
```bash
# Check environment variables
railway run env

# Run Prisma studio
railway run npx prisma studio

# Test database connection
railway run npx prisma db pull

# View real-time logs
railway logs --tail
```

## Cost Optimization

### Railway Pricing
- **Hobby Plan**: $5/month (includes $5 of usage)
- **Pro Plan**: $20/month (includes $20 of usage)
- **Usage-based**: Pay for what you use

### Optimization Tips
1. Use connection pooling in Prisma
2. Implement caching for frequently accessed data
3. Optimize database queries
4. Use indexes effectively

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Railway's environment variable management
   - Rotate secrets regularly

2. **Database Security**
   - Use connection pooling
   - Implement row-level security if needed
   - Regular backups

3. **API Security**
   - Rate limiting implemented
   - JWT token expiration
   - CORS properly configured

## Scaling

### Horizontal Scaling
1. Railway supports multiple instances
2. Configure in Settings → Scaling
3. Load balancing handled automatically

### Database Scaling
1. Upgrade PostgreSQL plan as needed
2. Implement read replicas for high traffic
3. Consider caching layer (Redis)

## CI/CD Pipeline

### GitHub Actions Integration
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Status Page](https://status.railway.app)

## Conclusion

Your Smart Email Navigator AI is now deployed on Railway with:
- ✅ PostgreSQL database
- ✅ Automatic deployments from GitHub
- ✅ Environment variables configured
- ✅ Health checks and monitoring
- ✅ Scalable architecture

Remember to:
1. Update OAuth redirect URIs
2. Monitor usage and costs
3. Set up backups for production data
4. Keep dependencies updated