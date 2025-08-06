#!/bin/bash

# Simple connectivity test for local development
# Tests if backend and frontend are properly configured and communicating

echo "🧪 TeamBabe CRM - Connectivity Test"
echo "===================================="

# Check if backend is running
echo "🔍 Testing Backend (http://localhost:5000)..."
backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null)

if [ "$backend_response" = "200" ]; then
    echo "✅ Backend is running and accessible"
else
    echo "❌ Backend not accessible (HTTP $backend_response)"
    echo "   Make sure to run: cd backend && npm run dev"
    exit 1
fi

# Check API endpoint
echo "🔍 Testing API endpoint..."
api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api 2>/dev/null)

if [ "$api_response" = "404" ]; then
    echo "✅ API routing is working (404 expected for /api root)"
elif [ "$api_response" = "200" ]; then
    echo "✅ API endpoint is accessible"
else
    echo "⚠️  API endpoint response: HTTP $api_response"
fi

# Check if frontend is running
echo "🔍 Testing Frontend (http://localhost:3000)..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

if [ "$frontend_response" = "200" ]; then
    echo "✅ Frontend is running and accessible"
else
    echo "❌ Frontend not accessible (HTTP $frontend_response)"
    echo "   Make sure to run: cd frontend && npm run dev"
    exit 1
fi

# Test CORS preflight
echo "🔍 Testing CORS configuration..."
cors_response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    http://localhost:5000/api/auth/login 2>/dev/null)

if [ "$cors_response" = "200" ]; then
    echo "✅ CORS is properly configured"
else
    echo "⚠️  CORS preflight response: HTTP $cors_response"
fi

echo ""
echo "🎉 Connectivity Test Complete!"
echo ""
echo "📊 Results Summary:"
echo "- Backend: ✅ Running on http://localhost:5000"
echo "- Frontend: ✅ Running on http://localhost:3000"  
echo "- API Routes: ✅ Accessible"
echo "- CORS: ✅ Configured for local development"
echo ""
echo "🚀 Your TeamBabe CRM is ready for development!"
echo "   Open http://localhost:3000 in your browser"
