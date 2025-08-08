const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean); // Remove null/undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // For development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

//Routes 
const userRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');
const dtrRoutes = require('./routes/dtr.routes');
const postRoutes = require('./routes/posts.routes');
const recruitRoutes = require('./routes/recruits.routes');
const reportsRoutes = require('./routes/reports.routes');
const napReportRoutes = require('./routes/napReport.routes');
const notificationRoutes = require('./routes/notifications.routes');
const emailRoutes = require('./routes/email.routes');

// Middlewares (Routes)
app.use(express.json());

// Additional CORS headers for complex requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Note: Static file serving removed - now using Cloudinary for file storage

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dtr', dtrRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/recruits', recruitRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/nap-report', napReportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);

// Routes (sample placeholder)
app.get('/', (req, res) => {
  res.send('OJT Backend API is running.');
});



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;