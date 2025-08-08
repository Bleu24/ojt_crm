const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const zoomController = require('../controllers/zoom.controller');

// OAuth routes (some without auth for callback)
router.get('/auth/initiate', authenticateToken, zoomController.initiateOAuth);
router.post('/connect', authenticateToken, zoomController.initiateOAuth); // Alias for frontend compatibility
router.get('/callback', zoomController.handleOAuthCallback); // Original callback route
router.get('/auth/callback', zoomController.handleOAuthCallback); // Alternative callback route
router.post('/disconnect', authenticateToken, zoomController.disconnectZoom); // Add disconnect route

// Check Zoom API connection status
router.get('/status', authenticateToken, zoomController.checkConnection);

// Meeting management routes
router.post('/meetings', authenticateToken, zoomController.createMeeting);
router.get('/meetings/:meetingId', authenticateToken, zoomController.getMeeting);
router.patch('/meetings/:meetingId', authenticateToken, zoomController.updateMeeting);
router.delete('/meetings/:meetingId', authenticateToken, zoomController.deleteMeeting);
router.get('/meetings', authenticateToken, zoomController.listMeetings);

// Interview scheduling with email integration
router.post('/schedule-interview', authenticateToken, zoomController.scheduleInterviewWithEmail);

// Update recruit with meeting details
router.patch('/recruit-meeting', authenticateToken, zoomController.updateRecruitMeetingDetails);

module.exports = router;
