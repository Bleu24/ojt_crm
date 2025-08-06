#!/bin/bash

# TeamBabe CRM Local Development Setup Script
# This script helps set up the project for local development

echo "🚀 Setting up TeamBabe CRM for Local Development"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the root directory of the project"
    exit 1
fi

echo "✅ Project directory confirmed"

# Check Node.js version
echo "🔍 Checking Node.js version..."
node_version=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js found: $node_version"
else
    echo "❌ Error: Node.js not found. Please install Node.js first."
    exit 1
fi

# Check npm
echo "🔍 Checking npm..."
npm_version=$(npm --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ npm found: $npm_version"
else
    echo "❌ Error: npm not found. Please install npm first."
    exit 1
fi

# Setup Backend
echo ""
echo "🔧 Setting up Backend..."
cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Backend .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit backend/.env with your actual values:"
    echo "   - MONGO_URI: Your MongoDB connection string"
    echo "   - JWT_SECRET: A secure random string (32+ characters)"
    echo "   - GEMINI_API_KEY: Your Google Gemini API key"
    echo "   - Cloudinary credentials for file upload"
    echo ""
    echo "⏸️  Setup paused. Please configure backend/.env and run this script again."
    exit 1
else
    echo "✅ Backend .env file found"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Error installing backend dependencies"
    exit 1
fi

# Setup Frontend
echo ""
echo "🔧 Setting up Frontend..."
cd ../frontend

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating frontend .env.local for localhost development..."
    cat > .env.local << EOL
# Frontend Environment Variables for Local Development
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=TeamBabe Team Management System
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_LOGGING=true
EOL
    echo "✅ Frontend .env.local created"
else
    echo "✅ Frontend .env.local file found"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Error installing frontend dependencies"
    exit 1
fi

# Back to root
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🚀 To start development:"
echo ""
echo "1. Start Backend (in one terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "📱 Your application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔧 Configuration:"
echo "   - Frontend configured for localhost:3000"
echo "   - Backend configured for localhost:5000"
echo "   - CORS enabled for local development"
echo "   - File storage: Cloudinary (no changes needed)"
echo ""
echo "💡 Tips:"
echo "   - Make sure MongoDB is accessible via your MONGO_URI"
echo "   - Ensure Gemini API key is valid for NAP report parsing"
echo "   - Check Cloudinary credentials for file uploads"
echo ""
echo "🐛 If you encounter issues:"
echo "   - Check that all environment variables are set correctly"
echo "   - Ensure MongoDB connection is working"
echo "   - Verify API endpoints are accessible"
echo ""
echo "Happy coding! 🎯"
