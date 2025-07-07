const bcrypt = require('bcrypt');
const User = require('../models/User.model');
const DtrEntry = require('../models/DtrEntry.model');

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

// Get users available for supervision (users without a supervisor)
exports.getAvailableUsers = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let roleFilter = {};
    
    // Unit managers can only supervise staff and interns
    if (req.user.role === 'unit_manager') {
      roleFilter = { role: { $in: ['staff', 'intern'] } };
    }
    // Admins can supervise unit_managers, staff, and interns
    else if (req.user.role === 'admin') {
      roleFilter = { role: { $in: ['unit_manager', 'staff', 'intern'] } };
    }

    const users = await User.find({ 
      supervisorId: null, 
      _id: { $ne: req.user.userId }, // Exclude current user
      ...roleFilter // Apply role-based filtering
    }).select('-passwordHash');
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get users under current user's supervision
exports.getSupervisedUsers = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = await User.find({ 
      supervisorId: req.user.userId 
    }).select('-passwordHash');
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign supervisor to a user
exports.assignSupervisor = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.supervisorId) {
      return res.status(400).json({ error: 'User already has a supervisor' });
    }

    // Role-based validation for supervision hierarchy
    if (req.user.role === 'unit_manager') {
      if (!['staff', 'intern'].includes(user.role)) {
        return res.status(403).json({ error: 'Unit managers can only supervise staff and interns' });
      }
    } else if (req.user.role === 'admin') {
      if (!['unit_manager', 'staff', 'intern'].includes(user.role)) {
        return res.status(403).json({ error: 'Invalid supervision assignment' });
      }
    }

    user.supervisorId = req.user.userId;
    await user.save();

    res.json({ message: 'Supervisor assigned successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove supervisor from a user
exports.removeSupervisor = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.supervisorId || user.supervisorId.toString() !== req.user.userId) {
      return res.status(400).json({ error: 'User is not under your supervision' });
    }

    user.supervisorId = null;
    await user.save();

    res.json({ message: 'Supervisor removed successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get team status with DTR information
exports.getTeamStatus = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get supervised users
    const supervisedUsers = await User.find({ 
      supervisorId: req.user.userId 
    }).select('-passwordHash');

    if (supervisedUsers.length === 0) {
      return res.json({ teamMembers: [] });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get DTR entries for all supervised users for today
    const userIds = supervisedUsers.map(user => user._id);
    const todayEntries = await DtrEntry.find({
      userId: { $in: userIds },
      date: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ timeIn: -1 });

    // Build team status
    const teamMembers = supervisedUsers.map(user => {
      const userEntries = todayEntries.filter(entry => entry.userId.toString() === user._id.toString());
      
      let currentStatus = 'never_clocked';
      let lastClockIn = null;
      let lastClockOut = null;
      let todayHours = 0;
      let isFirstTimeToday = true;

      if (userEntries.length > 0) {
        isFirstTimeToday = false;
        
        // Calculate total hours for today
        todayHours = userEntries.reduce((total, entry) => {
          return total + (entry.hoursWorked || 0);
        }, 0);

        // Find latest entry to determine current status
        const latestEntry = userEntries[0]; // Already sorted by timeIn desc
        
        if (latestEntry.timeOut) {
          currentStatus = 'clocked_out';
          lastClockOut = latestEntry.timeOut;
        } else {
          currentStatus = 'clocked_in';
          lastClockIn = latestEntry.timeIn;
        }

        // Get the most recent clock in and out times
        const allClockIns = userEntries.filter(entry => entry.timeIn).map(entry => entry.timeIn);
        const allClockOuts = userEntries.filter(entry => entry.timeOut).map(entry => entry.timeOut);
        
        if (allClockIns.length > 0) {
          lastClockIn = new Date(Math.max(...allClockIns.map(date => new Date(date).getTime())));
        }
        
        if (allClockOuts.length > 0) {
          lastClockOut = new Date(Math.max(...allClockOuts.map(date => new Date(date).getTime())));
        }
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOnline: false, // Could be enhanced with real-time presence
        currentStatus,
        lastClockIn,
        lastClockOut,
        todayHours,
        isFirstTimeToday
      };
    });

    res.json({ teamMembers });
  } catch (err) {
    console.error('Error fetching team status:', err);
    res.status(500).json({ error: err.message });
  }
};

