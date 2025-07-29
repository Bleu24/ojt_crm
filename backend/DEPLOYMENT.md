# Backend Deployment Guide

## Environment Setup for Production

### 1. Environment Variables

Create these environment variables in your deployment platform:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here

# AI API
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
NODE_ENV=production
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.vercel.app

# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Optional: File Upload Limits
MAX_FILE_SIZE=10485760
```

### 2. Platform-Specific Deployment

#### A. Heroku Deployment

1. **Install Heroku CLI**
2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set MONGO_URI="your-mongo-connection-string"
   heroku config:set JWT_SECRET="your-jwt-secret"
   heroku config:set GEMINI_API_KEY="your-gemini-key"
   heroku config:set NODE_ENV="production"
   heroku config:set FRONTEND_URL="https://your-frontend.vercel.app"
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

6. **Open App**
   ```bash
   heroku open
   ```

#### B. Railway Deployment

1. **Connect GitHub to Railway**
2. **Select your backend repository**
3. **Add Environment Variables in Railway Dashboard:**
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
   - `FRONTEND_URL`

4. **Deploy automatically on push**

#### C. Render Deployment

1. **Connect GitHub to Render**
2. **Create Web Service**
3. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add Environment Variables

### 3. Database Setup

#### MongoDB Atlas (Recommended)
1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create database user
3. Whitelist IP addresses (0.0.0.0/0 for production)
4. Get connection string
5. Replace in `MONGO_URI`

### 4. File Upload Configuration

Create uploads directory structure:
```
uploads/
├── nap-reports/
├── reports/
│   └── exports/
└── resumes/
```

### 5. CORS Configuration

Update `server.js` for production:
```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000' // Keep for local development
  ],
  credentials: true
}));
```

### 6. Quick Deploy Checklist

- [ ] MongoDB Atlas database created
- [ ] Environment variables configured
- [ ] CORS configured for frontend domain
- [ ] File upload directories exist
- [ ] All dependencies in package.json
- [ ] Port configuration (`process.env.PORT`)

### 7. Production Environment Variables Template

```bash
# Copy these to your deployment platform
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=super-secure-random-string-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-app.vercel.app
MAX_FILE_SIZE=10485760
```

### 8. Health Check Endpoint

Your API includes a health check at `/` that returns:
```
"OJT Backend API is running."
```

Use this to verify deployment success.

### 9. Troubleshooting

**Common Issues:**
- **MongoDB Connection**: Check connection string and IP whitelist
- **CORS Errors**: Verify FRONTEND_URL matches your Vercel domain
- **File Uploads**: Ensure upload directories exist
- **Environment Variables**: Verify all required vars are set

**Logs:**
- Heroku: `heroku logs --tail`
- Railway: Check logs in dashboard
- Render: Check logs in dashboard
