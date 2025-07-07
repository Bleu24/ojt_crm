const DtrEntry = require('../models/DtrEntry.model');
const User = require('../models/User.model');
const { DateTime } = require('luxon');

// Create new DTR entry (Admin only)
exports.createDtrEntry = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { date, timeIn, timeOut, hoursWorked, accomplishment } = req.body;

    const newEntry = new DtrEntry({
      userId: req.user.userId,
      date,
      timeIn,
      timeOut,
      hoursWorked,
      accomplishment
    });

    await newEntry.save();
    res.status(201).json({ message: 'DTR entry created', entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user's DTR entries
exports.getMyDtrEntries = async (req, res) => {
  try {
    const entries = await DtrEntry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Time in
exports.timeIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = DateTime.now().setZone('Asia/Manila').toISODate(); // "2025-06-28"

    const existing = await DtrEntry.findOne({
      userId,
      date: new Date(today)
    });

    if (existing) return res.status(400).json({ message: 'Already timed in today.' });

    const newEntry = new DtrEntry({
      userId,
      date: new Date(today),
      timeIn: new Date()
    });

    await newEntry.save();
    res.status(201).json({ message: 'Time in logged.', entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Time out
exports.timeOut = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().slice(0, 10);

    const entry = await DtrEntry.findOne({
      userId,
      date: { $gte: new Date(today), $lt: new Date(`${today}T23:59:59Z`) },
      timeOut: null
    });

    if (!entry) return res.status(400).json({ message: 'No active DTR entry for today.' });

    const now = new Date();
    const timeIn = new Date(entry.timeIn);
    const workedMs = now - timeIn;
    const hoursWorked = workedMs / (1000 * 60 * 60);

    entry.timeOut = now;
    entry.hoursWorked = parseFloat(hoursWorked.toFixed(2));
    entry.accomplishment = req.body.accomplishment || 'No notes provided';

    await entry.save();
    res.json({ message: 'Time out logged.', entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get accomplishments for a specific user and date (for supervisors)
exports.getAccomplishments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    // Check if user has permission to view accomplishments
    if (req.user.role !== 'admin') {
      // For unit managers, check if the user is under their supervision
      if (req.user.role === 'unit_manager') {
        const user = await User.findById(userId);
        if (!user || !user.supervisorId || user.supervisorId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'You can only view accomplishments of users under your supervision' });
        }
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    // Parse date
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    // Get DTR entries for the specified date
    const entries = await DtrEntry.find({
      userId: userId,
      date: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ timeIn: -1 });

    res.json({ entries });
  } catch (err) {
    console.error('Error fetching accomplishments:', err);
    res.status(500).json({ error: err.message });
  }
};
