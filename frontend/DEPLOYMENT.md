# Deployment Guide

## Environment Setup for Production

### 1. Vercel Deployment

#### Required Environment Variables in Vercel Dashboard:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=CRM System
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_LOGGING=false
```

#### Steps to Deploy:
1. Push your code to GitHub/GitLab
2. Connect your repository to Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy!

### 2. Environment Variables Reference

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000/api` | `https://your-api.com/api` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DEBUG_MODE` | Enable debug features | `true` | `false` |
| `NEXT_PUBLIC_ENABLE_LOGGING` | Console logging | `true` | `false` |

### 3. Backend Deployment
Make sure your backend is deployed and accessible via HTTPS:
- Heroku: `https://your-app.herokuapp.com`
- Railway: `https://your-app.railway.app`
- DigitalOcean: `https://your-domain.com`

### 4. CORS Configuration
Ensure your backend allows requests from your Vercel domain:
```javascript
// backend/server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app'
  ],
  credentials: true
}));
```

### 5. Quick Deploy Checklist
- [ ] Backend deployed and accessible
- [ ] Environment variables set in Vercel
- [ ] CORS configured on backend
- [ ] Database connected
- [ ] All API endpoints working
- [ ] Frontend builds without errors

## Local Development Setup
1. Copy `.env.example` to `.env.local`
2. Update the values with your local backend URL
3. Run `npm run dev`

## Troubleshooting
- **API calls failing**: Check `NEXT_PUBLIC_API_URL` is correct
- **CORS errors**: Update backend CORS settings
- **Build errors**: Check all environment variables are set
