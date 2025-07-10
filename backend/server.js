const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

//Routes 
const userRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');
const dtrRoutes = require('./routes/dtr.routes');
const postRoutes = require('./routes/posts.routes');
const recruitRoutes = require('./routes/recruits.routes');
const reportsRoutes = require('./routes/reports.routes');

// Middlewares (Routes)
app.use(express.json());

// Serve static files for uploads under /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dtr', dtrRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/recruits', recruitRoutes);
app.use('/api/reports', reportsRoutes);

// Routes (sample placeholder)
app.get('/', (req, res) => {
  res.send('OJT Backend API is running.');
});



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;