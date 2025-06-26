const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

//Routes 
const userRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');
const dtrRoutes = require('./routes/dtr.routes');
const postRoutes = require('./routes/posts.routes');



// Middlewares (Routes)
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dtr', dtrRoutes);
app.use('/api/posts', postRoutes);

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