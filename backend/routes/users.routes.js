const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const userController = require('../controllers/users.controller');
const requireRole = require('../middleware/roles.middleware');


// TEMP: Create user
router.post('/create', userController.createUser);

// Get current user profile
router.get('/me', authenticateToken, userController.getCurrentUser);

// Get current team 
router.get('/team', authenticateToken, requireRole(['unit_manager', 'branch_manager', 'admin']), userController.getMyTeam);

// Supervision management routes
router.get('/', authenticateToken, requireRole(['unit_manager', 'admin']), userController.getAvailableUsers);
router.get('/supervised', authenticateToken, requireRole(['unit_manager', 'admin']), userController.getSupervisedUsers);
router.get('/team-status', authenticateToken, requireRole(['unit_manager', 'admin']), userController.getTeamStatus);
router.patch('/:userId/assign-supervisor', authenticateToken, requireRole(['unit_manager', 'admin']), userController.assignSupervisor);
router.patch('/:userId/remove-supervisor', authenticateToken, requireRole(['unit_manager', 'admin']), userController.removeSupervisor);

// Required hours management routes
router.patch('/:userId/required-hours', authenticateToken, userController.setRequiredHours);
router.get('/:userId/total-hours', authenticateToken, userController.getTotalHoursWorked);
router.get('/team-hours-summary', authenticateToken, requireRole(['unit_manager', 'admin']), userController.getTeamHoursSummary);

module.exports = router;
