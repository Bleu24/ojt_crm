const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const emailController = require('../controllers/email.controller');

// Check email service connection status
router.get('/connection-status', authenticateToken, emailController.checkEmailConnection);

// Send interview invitation email
router.post('/send-invitation', authenticateToken, emailController.sendInvitationEmail);

// Test email deliverability across providers
router.post('/test-deliverability', authenticateToken, emailController.testDeliverability);

module.exports = router;
