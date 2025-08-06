# TeamBabe Team Management System

A comprehensive Customer Relationship Management (CRM) system built with Next.js and Node.js, featuring AI-powered NAP report parsing, recruit management, DTR tracking, and team analytics.

## 🚀 Quick Start - Local Development

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
```bash
# Backend
cd backend
cp .env.example .env  # Edit with your values
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
# .env.local already configured for localhost
npm install
npm run dev
```

### Access Your Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## ✨ Features

- 🔐 **Authentication System** - JWT-based user authentication
- 👥 **User Management** - Role-based access control (Admin, Unit Manager, Staff)
- 📊 **DTR System** - Daily Time Record tracking
- 🎯 **Recruits Management** - Handle recruitment process with file uploads
- 🤖 **AI-Powered NAP Reports** - Intelligent PDF parsing using Google Gemini
- 📈 **Analytics Dashboard** - Team performance metrics and reports
- ☁️ **Cloud Storage** - Cloudinary integration for file management
- 📱 **Responsive Design** - Mobile-friendly interface

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Cloudinary** - File storage and management
- **Google Gemini AI** - PDF parsing and analysis

## 📚 API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/register  
GET  /api/auth/refresh
POST /api/auth/logout
```

### NAP Reports
```
POST /api/nap-report/upload     # Upload & parse PDF
GET  /api/nap-report            # Get parsed reports
GET  /api/nap-report/export     # Export to Excel
DELETE /api/nap-report/clear    # Clear reports table
```

### Users & Teams
```
GET  /api/users                 # Get all users
POST /api/users                 # Create user
GET  /api/dtr                   # DTR records
POST /api/recruits              # Recruit management
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
GEMINI_API_KEY=your-gemini-api-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=http://localhost:3000
PORT=5000
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=TeamBabe Team Management System
```

## 📖 Documentation

- [Local Development Setup](./DEV-SETUP.md)
- [Backend Deployment](./backend/DEPLOYMENT.md)
- [Frontend Deployment](./frontend/DEPLOYMENT.md)

## 🔍 Verification

Check if everything is configured correctly:
```bash
./verify-config.sh
```

## 📁 Project Structure

```
CRM/
├── backend/                 # Node.js API server
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Authentication & validation
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── utils/             # Utilities (Cloudinary, etc.)
│   └── server.js          # Express server
├── frontend/               # Next.js application
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── config/            # Configuration
│   └── utils/             # Frontend utilities
└── docs/                  # Documentation
