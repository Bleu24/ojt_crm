const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notifications.controller');

// Get user's notifications
router.get('/', authenticateToken, notificationController.getMyNotifications);

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, notificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', authenticateToken, notificationController.deleteNotification);

module.exports = router;
