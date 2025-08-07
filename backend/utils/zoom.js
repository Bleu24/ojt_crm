const axios = require('axios');

// Zoom API configuration
const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

// Helper function to get Zoom access token
const getZoomAccessToken = async () => {
  try {
    // Server-to-Server OAuth (recommended)
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    console.log('🔑 ZOOM AUTH DEBUG: Attempting to get access token');
    console.log('📍 Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET');
    console.log('📍 Client Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NOT SET');
    console.log('📍 Account ID:', accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET');

    if (!clientId || !clientSecret || !accountId) {
      throw new Error('Zoom credentials not configured. Please set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_ACCOUNT_ID in your environment variables.');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    console.log('🔐 Encoded Auth Header:', `Basic ${auth.substring(0, 20)}...`);
    
    const response = await axios.post('https://zoom.us/oauth/token', 
      `grant_type=account_credentials&account_id=${accountId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ ZOOM AUTH SUCCESS: Access token received');
    console.log('⏰ Token expires in:', response.data.expires_in, 'seconds');
    
    return response.data.access_token;
  } catch (error) {
    console.error('❌ ZOOM AUTH ERROR: Failed to get access token');
    console.error('📝 Error Message:', error.message);
    console.error('📊 Response Status:', error.response?.status);
    console.error('📊 Response Data:', error.response?.data);
    throw new Error('Failed to authenticate with Zoom API');
  }
};

// Create a Zoom meeting
const createZoomMeeting = async (meetingData) => {
  try {
    console.log('🚀 ZOOM API: Starting meeting creation process');
    
    const accessToken = await getZoomAccessToken();
    const userId = process.env.ZOOM_USER_ID || 'me'; // Use 'me' for the authenticated user

    console.log('👤 Using Zoom User ID:', userId);

    const meetingPayload = {
      topic: meetingData.topic,
      type: 2, // Scheduled meeting
      start_time: meetingData.startTime, // ISO format: 2025-08-07T14:30:00Z
      duration: meetingData.duration || 60, // Default 60 minutes
      timezone: meetingData.timezone || 'Asia/Manila',
      password: meetingData.password || generateMeetingPassword(),
      agenda: meetingData.agenda || '',
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false,
        in_meeting: false,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 2, // No registration required
        audio: 'both', // Both telephony and VoIP
        auto_recording: 'none',
        waiting_room: true,
        ...meetingData.settings
      }
    };

    console.log('📦 ZOOM PAYLOAD:', JSON.stringify(meetingPayload, null, 2));
    console.log('🎯 API Endpoint:', `${ZOOM_API_BASE_URL}/users/${userId}/meetings`);

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
    console.log('📋 Response Status:', response.status);
    console.log('🆔 Meeting ID:', response.data.id);
    console.log('🔗 Join URL:', response.data.join_url);

    return {
      id: response.data.id,
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      startTime: response.data.start_time,
      duration: response.data.duration,
      meetingId: response.data.id.toString()
    };
  } catch (error) {
    console.error('❌ ZOOM API ERROR: Failed to create meeting');
    console.error('📝 Error Message:', error.message);
    console.error('📊 Response Status:', error.response?.status);
    console.error('📊 Response Headers:', error.response?.headers);
    console.error('📊 Response Data:', JSON.stringify(error.response?.data, null, 2));
    
    // Log specific error details for common issues
    if (error.response?.status === 401) {
      console.error('🔐 AUTH ISSUE: Check your Zoom credentials and scopes');
    } else if (error.response?.status === 400) {
      console.error('📝 REQUEST ISSUE: Check your meeting data format');
    } else if (error.response?.status === 404) {
      console.error('👤 USER ISSUE: Check your ZOOM_USER_ID');
    }
    
    throw new Error('Failed to create Zoom meeting');
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
  // Combine date and time into ISO format
  const dateTimeString = `${date}T${time}:00`;
  const dateTime = new Date(dateTimeString);
  return dateTime.toISOString();
};

module.exports = {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getZoomMeeting,
  formatZoomDateTime,
  generateMeetingPassword
};
