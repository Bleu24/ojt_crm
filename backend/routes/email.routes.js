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

// Recruitment status email routes
router.post('/pass-initial', authenticateToken, emailController.sendPassInitial);
router.post('/fail-initial', authenticateToken, emailController.sendFailInitial);
router.post('/hire', authenticateToken, emailController.sendHire);
router.post('/reject', authenticateToken, emailController.sendReject);

// Get email history for a recruit
router.get('/history/:recruitId', authenticateToken, emailController.getEmailHistory);

module.exports = router;
