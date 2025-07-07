const bcrypt = require('bcrypt');
const User = require('../models/User.model');

// Create user 
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = new User({ name, email, role, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current authenticated user's profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
};

exports.getMyTeam = async (req, res) => {
  try {
    const team = await User.find({ supervisorId: req.user.userId }).select('-passwordHash');
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

