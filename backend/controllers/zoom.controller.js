const {
  getOAuthURL,
  exchangeCodeForToken,
  storeUserToken,
  checkZoomConnection,
  createZoomMeeting,
  updateZoomMeeting,
  getZoomMeeting,
  deleteZoomMeeting,
  listZoomMeetings,
  scheduleInterviewMeeting
} = require('../utils/zoom');

// Initiate OAuth flow - get authorization URL
const initiateOAuth = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { authUrl, state } = getOAuthURL(userId);
    
    // Store user ID and state in session for OAuth callback
    req.session = req.session || {};
    req.session.zoomOAuthState = state;
    req.session.zoomOAuthUserId = userId; // Store user ID for callback
    
    res.json({
      success: true,
      message: 'OAuth URL generated successfully',
      authUrl,
      state
    });
  } catch (error) {
    console.error('❌ ZOOM OAUTH INITIATE ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow',
      details: error.message
    });
  }
};

// Handle OAuth callback
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('❌ ZOOM OAUTH ERROR:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/settings?auth=error&error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?auth=error&error=${encodeURIComponent('Authorization code is required')}`);
    }
    
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code, state);
    
    // Get user ID from session (stored during OAuth initiation)
    const userId = req.session?.zoomOAuthUserId || 'demo-user';
    
    storeUserToken(userId, tokenData);
    
    console.log('✅ ZOOM OAUTH: User authenticated successfully for userId:', userId);
    
    // Redirect back to settings page with success
    res.redirect(`${process.env.FRONTEND_URL}/settings?auth=success`);
    
  } catch (error) {
    console.error('❌ ZOOM OAUTH CALLBACK ERROR:', error.message);
    res.redirect(`${process.env.FRONTEND_URL}/settings?auth=error&error=${encodeURIComponent(error.message)}`);
  }
};

// Check Zoom API connection status for current user
const checkConnection = async (req, res) => {
  try {
    const userId = req.user?.id || 'demo-user';
    const result = await checkZoomConnection(userId);
    
    res.json({
      success: true,
      message: result.authenticated ? 'Zoom API is operational' : 'Zoom authentication required',
      details: result
    });
  } catch (error) {
    console.error('❌ ZOOM CONNECTION ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Zoom API connection failed',
      details: error.message
    });
  }
};

// Disconnect user's Zoom account
const disconnectZoom = async (req, res) => {
  try {
    const userId = req.user?.id || 'demo-user';
    
    // Remove stored token (in production, this should remove from database)
    const { storeUserToken } = require('../utils/zoom');
    storeUserToken(userId, null); // Clear the token
    
    res.json({
      success: true,
      message: 'Zoom account disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ ZOOM DISCONNECT ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Zoom account',
      details: error.message
    });
  }
};

// Create a new Zoom meeting
const createMeeting = async (req, res) => {
  try {
    const { topic, start_time, duration, agenda } = req.body;
    const userId = req.user?.id || 'demo-user';
    
    if (!topic || !start_time || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic, start_time, and duration are required'
      });
    }
    
    const meetingData = {
      topic,
      start_time,
      duration: parseInt(duration),
      agenda
    };
    
    const meeting = await createZoomMeeting(meetingData, userId);
    
    res.status(201).json({
      success: true,
      message: 'Zoom meeting created successfully',
      meeting
    });
    
  } catch (error) {
    console.error('❌ ZOOM CREATE MEETING ERROR:', error.message);
    if (error.message.includes('User not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'Zoom authentication required',
        details: error.message,
        authRequired: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create Zoom meeting',
      details: error.message
    });
  }
};

// Get meeting details
const getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }
    
    const meeting = await getZoomMeeting(meetingId);
    
    res.json({
      success: true,
      message: 'Meeting details retrieved successfully',
      meeting
    });
    
  } catch (error) {
    console.error('❌ ZOOM GET MEETING ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meeting details',
      details: error.message
    });
  }
};

// Update an existing meeting
const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const updateData = req.body;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }
    
    const updatedMeeting = await updateZoomMeeting(meetingId, updateData);
    
    res.json({
      success: true,
      message: 'Meeting updated successfully',
      meeting: updatedMeeting
    });
    
  } catch (error) {
    console.error('❌ ZOOM UPDATE MEETING ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting',
      details: error.message
    });
  }
};

// Delete a meeting
const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID is required'
      });
    }
    
    const result = await deleteZoomMeeting(meetingId);
    
    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      result
    });
    
  } catch (error) {
    console.error('❌ ZOOM DELETE MEETING ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting',
      details: error.message
    });
  }
};

// List user's meetings
const listMeetings = async (req, res) => {
  try {
    const { type = 'scheduled', page_size = 30 } = req.query;
    
    const meetings = await listZoomMeetings(type, parseInt(page_size));
    
    res.json({
      success: true,
      message: 'Meetings retrieved successfully',
      ...meetings
    });
    
  } catch (error) {
    console.error('❌ ZOOM LIST MEETINGS ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meetings',
      details: error.message
    });
  }
};

// Schedule interview meeting with email invitation
const scheduleInterviewWithEmail = async (req, res) => {
  try {
    const { 
      recruitData, 
      interviewType = 'initial', 
      startTime, 
      duration = 60,
      senderName 
    } = req.body;
    const userId = req.user?.id || 'demo-user';
    
    if (!recruitData || !recruitData.email || !recruitData.firstName) {
      return res.status(400).json({
        success: false,
        error: 'Recruit data with email and firstName is required'
      });
    }
    
    if (!startTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time is required'
      });
    }
    
    // Prepare scheduler info
    const schedulerInfo = {
      startTime,
      duration,
      sender: {
        name: senderName || req.user?.name || 'HR Team',
        email: req.user?.email || process.env.EMAIL_USER
      }
    };
    
    const result = await scheduleInterviewMeeting(recruitData, interviewType, schedulerInfo, userId);
    
    res.status(201).json({
      success: true,
      message: `${interviewType} interview scheduled and invitation sent successfully`,
      ...result
    });
    
  } catch (error) {
    console.error('❌ ZOOM SCHEDULE INTERVIEW ERROR:', error.message);
    if (error.message.includes('Zoom authentication required')) {
      return res.status(401).json({
        success: false,
        error: 'Zoom authentication required',
        details: error.message,
        authRequired: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to schedule interview meeting',
      details: error.message
    });
  }
};

// Update recruit with meeting details (for integration with recruit management)
const updateRecruitMeetingDetails = async (req, res) => {
  try {
    const { recruitId, meetingDetails, interviewType = 'initial' } = req.body;
    
    if (!recruitId || !meetingDetails) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID and meeting details are required'
      });
    }
    
    const Recruit = require('../models/Recruit.model');
    
    // Prepare update data based on interview type
    const updateData = {};
    const prefix = interviewType === 'initial' ? 'initialInterview' : 'finalInterview';
    
    updateData[`${prefix}ZoomMeetingId`] = meetingDetails.meetingId;
    updateData[`${prefix}ZoomJoinUrl`] = meetingDetails.joinUrl;
    updateData[`${prefix}ZoomStartUrl`] = meetingDetails.startUrl;
    updateData[`${prefix}ZoomPassword`] = meetingDetails.password;
    
    const updatedRecruit = await Recruit.findByIdAndUpdate(
      recruitId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedRecruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Recruit meeting details updated successfully',
      recruit: updatedRecruit
    });
    
  } catch (error) {
    console.error('❌ UPDATE RECRUIT MEETING ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update recruit meeting details',
      details: error.message
    });
  }
};

module.exports = {
  // OAuth functions
  initiateOAuth,
  handleOAuthCallback,
  disconnectZoom,
  
  // API functions
  checkConnection,
  createMeeting,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  listMeetings,
  scheduleInterviewWithEmail,
  updateRecruitMeetingDetails
};
