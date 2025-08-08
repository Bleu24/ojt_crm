const axios = require('axios');
const { sendInterviewInvitation } = require('./email');

// Zoom API configuration
const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

// Helper function to get Zoom access token
const getZoomAccessToken = async () => {
  try {
    // Server-to-Server OAuth (recommended)
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    if (!clientId || !clientSecret || !accountId) {
      throw new Error('Missing Zoom API credentials in environment variables');
    }

    console.log('🔐 ZOOM AUTH: Requesting access token...');
    console.log('📋 Account ID:', accountId);
    console.log('📋 Client ID:', clientId);

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${accountId}`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ ZOOM AUTH: Access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ ZOOM AUTH ERROR: Failed to get access token');
    console.error('📊 Response Status:', error.response?.status);
    console.error('📊 Response Data:', error.response?.data);
    throw new Error('Failed to authenticate with Zoom API');
  }
};

// Create a Zoom meeting with built-in email notifications
const createZoomMeeting = async (meetingData) => {
  try {
    console.log('🚀 ZOOM API: Starting meeting creation process');
    
    const accessToken = await getZoomAccessToken();
    const userId = process.env.ZOOM_USER_ID || 'me';

    console.log('👤 Using Zoom User ID:', userId);

    const meetingPayload = {
      topic: meetingData.topic,
      type: 2, // Scheduled meeting
      start_time: meetingData.startTime,
      duration: meetingData.duration || 60,
      timezone: meetingData.timezone || 'Asia/Manila',
      password: meetingData.password || generateMeetingPassword(),
      agenda: meetingData.agenda || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        approval_type: 2,
        audio: 'both',
        auto_recording: 'none',
        // Email notifications for the host
        email_notification: true,
        ...meetingData.settings
      }
    };

    console.log('📦 ZOOM PAYLOAD:', JSON.stringify(meetingPayload, null, 2));

    const response = await axios.post(
      `${ZOOM_API_BASE_URL}/users/${userId}/meetings`,
      meetingPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ ZOOM API SUCCESS: Meeting created');
    console.log('🆔 Meeting ID:', response.data.id);
    console.log('🔗 Join URL:', response.data.join_url);

    const meetingInfo = {
      id: response.data.id,
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      startTime: response.data.start_time,
      duration: response.data.duration,
      meetingId: response.data.id.toString()
    };

    // 🎯 SEND CUSTOM EMAIL INVITATIONS TO INVITEES
    if (meetingData.invitees && meetingData.invitees.length > 0) {
      console.log('📧 EMAIL SERVICE: Sending custom interview invitations...');
      
      for (const email of meetingData.invitees) {
        try {
          // Extract first name from candidateName if provided
          let firstName = null;
          if (meetingData.candidateName) {
            firstName = meetingData.candidateName.split(' ')[0];
            console.log('👤 Candidate Name:', meetingData.candidateName, '→ First Name:', firstName);
          }
          
          // Pass sender information and candidate name if provided
          await sendInterviewInvitation(
            email, 
            meetingInfo, 
            meetingData.senderInfo, 
            meetingData.interviewPhase || 'Interview',
            firstName
          );
          console.log('✅ Interview invitation sent to:', email);
        } catch (emailError) {
          console.error('❌ Failed to send invitation to:', email, emailError.message);
          // Don't throw here - meeting was created successfully, email is secondary
        }
      }
    }

    return meetingInfo;

  } catch (error) {
    console.error('❌ ZOOM API ERROR: Meeting creation failed');
    console.error('🔍 Error Details:', error.response?.data || error.message);
    throw error;
  }
};

// Update a Zoom meeting
const updateZoomMeeting = async (meetingId, meetingData) => {
  try {
    const accessToken = await getZoomAccessToken();

    const meetingPayload = {
      topic: meetingData.topic,
      start_time: meetingData.startTime,
      duration: meetingData.duration || 60,
      timezone: meetingData.timezone || 'Asia/Manila',
      agenda: meetingData.agenda || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        ...meetingData.settings
      }
    };

    const response = await axios.patch(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      meetingPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, message: 'Meeting updated successfully' };
  } catch (error) {
    console.error('Error updating Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to update Zoom meeting');
  }
};

// Delete a Zoom meeting
const deleteZoomMeeting = async (meetingId) => {
  try {
    const accessToken = await getZoomAccessToken();

    await axios.delete(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return { success: true, message: 'Meeting deleted successfully' };
  } catch (error) {
    console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to delete Zoom meeting');
  }
};

// Get meeting details
const getZoomMeeting = async (meetingId) => {
  try {
    const accessToken = await getZoomAccessToken();

    const response = await axios.get(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      id: response.data.id,
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      startTime: response.data.start_time,
      duration: response.data.duration,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error getting Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to get Zoom meeting details');
  }
};

// Generate a random meeting password
const generateMeetingPassword = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Format datetime for Zoom API
const formatZoomDateTime = (date, time, timezone = 'Asia/Manila') => {
  // Combine date and time into ISO format for the specified timezone
  // Since we're in Philippines (UTC+8), we need to handle timezone properly
  const dateTimeString = `${date}T${time}:00`;
  
  // Create date object and get the time as if it's in the specified timezone
  const localDateTime = new Date(dateTimeString);
  
  // Convert to ISO string but adjust for timezone offset
  // Philippines is UTC+8, so we need to add 8 hours to get the correct UTC time
  const timezoneOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const adjustedDateTime = new Date(localDateTime.getTime() + timezoneOffset);
  
  return adjustedDateTime.toISOString();
};

module.exports = {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getZoomMeeting,
  formatZoomDateTime,
  generateMeetingPassword
};
