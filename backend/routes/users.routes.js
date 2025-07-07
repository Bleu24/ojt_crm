
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


module.exports = router;
