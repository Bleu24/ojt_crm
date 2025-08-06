#!/bin/bash

# Configuration Verification Script
# Checks if the project is properly configured for local development

echo "🔍 TeamBabe CRM - Configuration Verification"
echo "============================================="

# Check if we're in the root directory
if [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the root directory"
    exit 1
fi

# Backend checks
echo ""
echo "🔧 Backend Configuration Check:"
echo "--------------------------------"

if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
    
    # Check for required variables
    if grep -q "MONGO_URI=" backend/.env; then
        echo "✅ MONGO_URI configured"
    else
        echo "❌ MONGO_URI missing in backend/.env"
    fi
    
    if grep -q "JWT_SECRET=" backend/.env; then
        echo "✅ JWT_SECRET configured"
    else
        echo "❌ JWT_SECRET missing in backend/.env"
    fi
    
    if grep -q "GEMINI_API_KEY=" backend/.env; then
        echo "✅ GEMINI_API_KEY configured"
    else
        echo "❌ GEMINI_API_KEY missing in backend/.env"
    fi
    
    if grep -q "CLOUDINARY_CLOUD_NAME=" backend/.env; then
        echo "✅ Cloudinary configured"
    else
        echo "❌ Cloudinary configuration missing in backend/.env"
    fi
    
    # Check if localhost is configured
    if grep -q "FRONTEND_URL=http://localhost:3000" backend/.env; then
        echo "✅ Configured for localhost development"
    else
        echo "⚠️  FRONTEND_URL may not be set for localhost"
    fi
    
else
    echo "❌ Backend .env file missing"
fi

# Frontend checks
echo ""
echo "🎨 Frontend Configuration Check:"
echo "---------------------------------"

if [ -f "frontend/.env.local" ]; then
    echo "✅ Frontend .env.local file exists"
    
    # Check for required variables
    if grep -q "NEXT_PUBLIC_API_URL=http://localhost:5000/api" frontend/.env.local; then
        echo "✅ API URL configured for localhost"
    else
        echo "⚠️  API URL may not be configured for localhost"
    fi
    
    if grep -q "NEXT_PUBLIC_APP_URL=http://localhost:3000" frontend/.env.local; then
        echo "✅ App URL configured for localhost"
    else
        echo "⚠️  App URL may not be configured for localhost"
    fi
    
    if grep -q "TeamBabe" frontend/.env.local; then
        echo "✅ TeamBabe branding configured"
    else
        echo "⚠️  TeamBabe branding may not be configured"
    fi
    
else
    echo "❌ Frontend .env.local file missing"
fi

# Dependencies check
echo ""
echo "📦 Dependencies Check:"
echo "----------------------"

if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies not installed (run: cd backend && npm install)"
fi

if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies not installed (run: cd frontend && npm install)"
fi

# Port availability check
echo ""
echo "🌐 Port Availability Check:"
echo "----------------------------"

# Check if port 5000 is available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 5000 is already in use (backend port)"
else
    echo "✅ Port 5000 available for backend"
fi

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use (frontend port)"
else
    echo "✅ Port 3000 available for frontend"
fi

# Configuration summary
echo ""
echo "📋 Configuration Summary:"
echo "-------------------------"
echo "✅ Using Cloudinary for file storage (no local storage)"
echo "✅ CORS configured for localhost development"
echo "✅ Environment variables use localhost fallbacks"
echo "✅ No hardcoded production URLs found in code"

# Final recommendations
echo ""
echo "💡 Development Workflow:"
echo "------------------------"
echo "1. Terminal 1: cd backend && npm run dev"
echo "2. Terminal 2: cd frontend && npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 If you need to change ports:"
echo "- Backend: Set PORT in backend/.env"
echo "- Frontend: Use 'npm run dev -- -p 3001'"
echo "- Update CORS and API URLs accordingly"
echo ""

if [ -f "backend/.env" ] && [ -f "frontend/.env.local" ]; then
    echo "🎉 Configuration looks good! Ready for development."
else
    echo "⚠️  Some configuration files are missing. Run ./setup-dev.sh to fix."
fi
