const Notification = require('../models/Notification.model');

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data: data || {}
    });

    await notification.save();
    res.status(201).json({ message: 'Notification created', notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user's notifications
exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    let filter = { userId: req.user.userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.userId, 
      isRead: false 
    });

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        unreadCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({ 
      _id: notificationId, 
      userId: req.user.userId 
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      userId: req.user.userId 
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to create hours completion notification
exports.createHoursCompletionNotification = async (userId, totalHours, requiredHours) => {
  try {
    const notification = new Notification({
      userId,
      type: 'hours_completed',
      title: '🎉 Internship Hours Completed!',
      message: `Congratulations! You have completed your required ${requiredHours} hours of internship. Total hours worked: ${totalHours}h`,
      data: {
        totalHours,
        requiredHours,
        completedAt: new Date()
      }
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating hours completion notification:', err);
    throw err;
  }
};

// Helper function to create milestone notifications (75%, 90%, etc.)
exports.createMilestoneNotification = async (userId, percentage, totalHours, requiredHours) => {
  try {
    let milestoneEmoji = '🎯';
    let milestoneMessage = '';

    if (percentage >= 90) {
      milestoneEmoji = '🏁';
      milestoneMessage = `You're almost there! You've completed ${percentage}% of your internship hours.`;
    } else if (percentage >= 75) {
      milestoneEmoji = '🚀';
      milestoneMessage = `Great progress! You've completed ${percentage}% of your internship hours.`;
    } else if (percentage >= 50) {
      milestoneEmoji = '⭐';
      milestoneMessage = `Halfway there! You've completed ${percentage}% of your internship hours.`;
    } else if (percentage >= 25) {
      milestoneEmoji = '📈';
      milestoneMessage = `Good start! You've completed ${percentage}% of your internship hours.`;
    }

    const notification = new Notification({
      userId,
      type: 'hours_milestone',
      title: `${milestoneEmoji} ${percentage}% Milestone Reached!`,
      message: milestoneMessage,
      data: {
        percentage,
        totalHours,
        requiredHours,
        milestone: `${percentage}%`
      }
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating milestone notification:', err);
    throw err;
  }
};
