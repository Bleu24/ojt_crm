const express = require('express');
const router = express.Router();
const DtrEntry = require('../models/DtrEntry.model');
const authenticateToken = require('../middleware/auth.middleware');

// Create new DTR entry
router.post('/create', authenticateToken, async (req, res) => {
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
});

// Get current user's DTR entries
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const entries = await DtrEntry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Time in 
router.post('/timein', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // Check if already timed in today
    const existing = await DtrEntry.findOne({
      userId,
      date: { $gte: new Date(today), $lt: new Date(`${today}T23:59:59Z`) }
    });

    if (existing) return res.status(400).json({ message: 'Already timed in today.' });

    const newEntry = new DtrEntry({
      userId,
      date: new Date(),
      timeIn: new Date()
    });

    await newEntry.save();
    res.status(201).json({ message: 'Time in logged.', entry: newEntry });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Time out
router.patch('/timeout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().slice(0, 10);

    const entry = await DtrEntry.findOne({
      userId,
      date: { $gte: new Date(today), $lt: new Date(`${today}T23:59:59Z`) },
      timeOut: null // Must not be already clocked out
    });

    if (!entry) return res.status(400).json({ message: 'No active DTR entry for today.' });

    const now = new Date();
    const timeIn = new Date(entry.timeIn);
    const workedMs = now - timeIn;
    const hoursWorked = workedMs / (1000 * 60 * 60);

    entry.timeOut = now;
    entry.hoursWorked = parseFloat(hoursWorked.toFixed(2)); // 2 decimal hours
    entry.accomplishment = req.body.accomplishment || 'No notes provided';

    await entry.save();
    res.json({ message: 'Time out logged.', entry });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
