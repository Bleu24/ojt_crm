# Local Development Guide

## 🚀 Quick Start

This guide helps you set up the TeamBabe CRM system for local development.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB access
- Google Gemini API key
- Cloudinary account

### One-Command Setup

```bash
./setup-dev.sh
```

### Manual Setup

#### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
npm install
npm run dev
```

#### 2. Frontend Setup

```bash
cd frontend
# .env.local should already exist with localhost configuration
npm install
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Cloudinary (for file storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=TeamBabe Team Management System
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_LOGGING=true
```

## 🌐 Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| Backend | http://localhost:5000 | Express.js API |
| API Docs | http://localhost:5000 | API endpoint info |

## 📁 File Storage

The project uses **Cloudinary** for all file storage:
- Resume uploads
- NAP report PDFs  
- Profile images
- Any other file uploads

**No local file storage** is used - everything goes to Cloudinary.

## 🔄 CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (development frontend)
- `http://127.0.0.1:3000` (alternative localhost)
- Environment variable `FRONTEND_URL`
- Development mode allows all origins

## 🛠️ Available Scripts

### Backend
```bash
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start production mode
npm test         # Run tests
npm run migrate:cloudinary  # Migrate files to Cloudinary
npm run cleanup:uploads     # Clean up old uploads
```

### Frontend
```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm run type-check  # Check TypeScript types
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors**
   - Check `FRONTEND_URL` in backend .env
   - Ensure frontend is running on correct port

2. **API connection failed**
   - Verify `NEXT_PUBLIC_API_URL` in frontend .env.local
   - Check backend is running on port 5000

3. **File upload failures**
   - Verify Cloudinary credentials in backend .env
   - Check file size limits

4. **MongoDB connection issues**
   - Verify `MONGO_URI` format and credentials
   - Check network access to MongoDB cluster

5. **NAP report parsing fails**
   - Verify `GEMINI_API_KEY` is valid
   - Check API quota limits

### Environment Verification

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run env:check  # Check environment variables
npm run dev
```

## 📊 Features Available in Development

✅ **Working Features:**
- User authentication (JWT)
- DTR system
- Recruits management with resume upload
- NAP reports with AI parsing
- Team reports and analytics
- File storage via Cloudinary

🔧 **Development-Only Features:**
- Debug logging
- Hot reload
- Development CORS
- Error stack traces

## 🚀 Ready for Production?

When ready to deploy, update environment variables:

1. Change URLs from localhost to production domains
2. Set `NODE_ENV=production`
3. Disable debug modes
4. Update CORS origins
5. Use production database

See `DEPLOYMENT.md` files in backend and frontend folders for deployment guides.

---

**Happy Coding! 🎯**
