const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const userController = require('../controllers/users.controller');

// TEMP: Create user
router.post('/create', userController.createUser);

// Get current user profile
router.get('/me', authenticateToken, userController.getCurrentUser);

module.exports = router;
