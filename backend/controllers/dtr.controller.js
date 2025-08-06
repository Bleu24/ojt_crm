const DtrEntry = require('../models/DtrEntry.model');
const User = require('../models/User.model');
const { DateTime } = require('luxon');
const { createHoursCompletionNotification, createMilestoneNotification } = require('./notifications.controller');

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
    const today = DateTime.now().setZone('Asia/Manila').toISODate(); // "2025-08-06"

    // Parse as local date to avoid timezone issues
    const [year, month, day] = today.split('-').map(Number);
    const todayDate = new Date(year, month - 1, day);

    // Check if user has already clocked in today (regardless of clock out status)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    const existingEntry = await DtrEntry.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        message: 'You have already clocked in today. Please wait until tomorrow to clock in again.' 
      });
    }

    const newEntry = new DtrEntry({
      userId,
      date: todayDate,
      timeIn: new Date()
    });

    await newEntry.save();
    res.status(201).json({ message: 'Time in logged successfully.', entry: newEntry });
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

    // Check for hours completion/milestone notifications
    await checkHoursNotifications(userId);

    res.json({ message: 'Time out logged.', entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Import DTR entry (for bulk import functionality)
exports.importDtrEntry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, timeIn, timeOut, hoursWorked, accomplishment } = req.body;

    // Validate required fields
    if (!date || !timeIn) {
      return res.status(400).json({ error: 'Date and timeIn are required' });
    }

    // Parse dates - handle date-only strings as local dates to avoid timezone issues
    let entryDate;
    if (date.includes('T') || date.includes(' ')) {
      entryDate = new Date(date);
    } else {
      // Date-only string like "2024-06-23", parse as local date
      const [year, month, day] = date.split('-').map(Number);
      entryDate = new Date(year, month - 1, day);
    }
    
    const timeInDate = new Date(timeIn);
    let timeOutDate = null;
    
    if (timeOut) {
      timeOutDate = new Date(timeOut);
    }

    // Validate dates
    if (isNaN(entryDate.getTime()) || isNaN(timeInDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (timeOut && isNaN(timeOutDate?.getTime())) {
      return res.status(400).json({ error: 'Invalid timeOut format' });
    }

    // Check if entry already exists (to prevent duplicates)
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate() + 1);
    
    const existingEntry = await DtrEntry.findOne({
      userId,
      date: { $gte: startOfDay, $lt: endOfDay },
      timeIn: timeInDate
    });

    if (existingEntry) {
      return res.status(409).json({ error: 'DTR entry already exists for this date and time' });
    }

    // Create new DTR entry
    const newEntry = new DtrEntry({
      userId,
      date: entryDate,
      timeIn: timeInDate,
      timeOut: timeOutDate,
      hoursWorked: hoursWorked || 0,
      accomplishment: accomplishment || ''
    });

    await newEntry.save();

    // Check for hours notifications if this is a completed entry (has timeOut)
    if (timeOutDate) {
      await checkHoursNotifications(userId);
    }

    res.status(201).json({ message: 'DTR entry imported successfully', entry: newEntry });
  } catch (err) {
    console.error('Error importing DTR entry:', err);
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

// Helper function to check and create notifications for hours milestones
const checkHoursNotifications = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'intern' || !user.requiredHours || user.requiredHours <= 0) {
      return; // Only check for interns with required hours set
    }

    // Calculate total hours worked
    const entries = await DtrEntry.find({ userId });
    const totalHours = entries.reduce((total, entry) => total + (entry.hoursWorked || 0), 0);
    
    const percentage = Math.floor((totalHours / user.requiredHours) * 100);
    const previousTotalHours = totalHours - (entries[entries.length - 1]?.hoursWorked || 0);
    const previousPercentage = Math.floor((previousTotalHours / user.requiredHours) * 100);

    // Check if user just completed their hours
    if (totalHours >= user.requiredHours && previousTotalHours < user.requiredHours) {
      await createHoursCompletionNotification(userId, totalHours, user.requiredHours);
    }
    // Check for milestone notifications (25%, 50%, 75%, 90%)
    else {
      const milestones = [25, 50, 75, 90];
      for (const milestone of milestones) {
        if (percentage >= milestone && previousPercentage < milestone) {
          await createMilestoneNotification(userId, milestone, totalHours, user.requiredHours);
          break; // Only send one milestone notification per session
        }
      }
    }
  } catch (err) {
    console.error('Error checking hours notifications:', err);
    // Don't throw error - notification failure shouldn't break DTR functionality
  }
};
