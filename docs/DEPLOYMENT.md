# Deployment Guide

## Environment Configuration

### Backend (.env)

```env
# Database
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=survey_system

# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=your-production-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Background Jobs
HOLD_CLEANUP_INTERVAL_MS=60000

# Logging
LOG_LEVEL=info
```

## Production Deployment

### Backend (Node.js)

**Recommended**: Render, Railway, or AWS EC2

1. **Build**:
   ```bash
   npm install --production
   ```

2. **Database Setup**:
   ```bash
   npm run migrate
   ```

3. **Start**:
   ```bash
   npm start
   ```

4. **Process Manager** (PM2):
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name survey-backend
   pm2 save
   pm2 startup
   ```

### Web Admin (React)

**Recommended**: Vercel, Netlify, or Cloudflare Pages

1. **Build**:
   ```bash
   cd web-admin
   npm run build
   ```

2. **Deploy**:
   ```bash
   # Vercel
   vercel deploy --prod

   # Netlify
   netlify deploy --prod --dir=dist
   ```

### Mobile (React Native)

**Build for Production**:

```bash
cd mobile

# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## Database

### MySQL Setup

**Recommended**: AWS RDS, PlanetScale, or DigitalOcean Managed MySQL

1. Create database instance
2. Configure security groups/firewall
3. Run migrations: `npm run migrate`
4. Enable automated backups

### Connection Pooling

Default pool size: 10 connections

Adjust in `backend/src/db/mysqlClient.js`:
```javascript
connectionLimit: process.env.MYSQL_POOL_SIZE || 10
```

## Monitoring

### Recommended Tools

- **Error Tracking**: Sentry
- **Logging**: LogTail, Datadog
- **Uptime**: UptimeRobot, Pingdom
- **Performance**: New Relic, AppDynamics

### Health Check

```bash
curl https://your-api.com/health
```

## Security Checklist

- [ ] Environment variables secured (not in code)
- [ ] HTTPS enabled
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Database credentials rotated
- [ ] JWT secret is strong (32+ chars)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] Audit logs enabled

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (AWS ALB, Nginx)
- Ensure stateless backend (no in-memory sessions)
- Use Redis for shared state if needed

### Database Scaling

- Read replicas for analytics queries
- Connection pooling optimization
- Index optimization for slow queries

## Backup Strategy

### Database Backups

- **Automated**: Daily full backups
- **Retention**: 30 days
- **Point-in-time recovery**: Enabled

### Application Backups

- Code: Git repository
- Environment configs: Secure vault (1Password, AWS Secrets Manager)

## Rollback Plan

1. Keep previous deployment artifacts
2. Database migrations are reversible
3. Use blue-green deployment strategy
4. Monitor error rates post-deployment

## Performance Targets

- API response time: < 200ms (p95)
- Database query time: < 50ms (p95)
- Uptime: 99.9%
- Concurrent users: 1000+
