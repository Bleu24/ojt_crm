const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const reportsController = require('../controllers/reports.controller');
const requireRole = require('../middleware/roles.middleware');

// Get supervision statistics
router.get('/supervision/stats', authenticateToken, requireRole(['unit_manager', 'admin']), reportsController.getSupervisionStats);

// Get team report
router.get('/team', authenticateToken, requireRole(['unit_manager', 'admin']), reportsController.getTeamReport);

// Get analytics data
router.get('/analytics', authenticateToken, requireRole(['unit_manager', 'admin']), reportsController.getAnalyticsData);

module.exports = router;
