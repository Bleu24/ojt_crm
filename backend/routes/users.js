// routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

// TEMP route to test user creation
router.post('/create', async (req, res) => {
  try {
    const { name, email, role, password  } = req.body;

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);


    const newUser = new User({ name, email, role, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
