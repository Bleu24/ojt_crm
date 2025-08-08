const axios = require('axios');
const { DateTime } = require('luxon');

// Zoom API Base URL
const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

// Store user tokens (in production, this should be in a database)
const userTokens = new Map();

// Generate OAuth authorization URL for user authentication
const getOAuthURL = (userId = null) => {
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Missing ZOOM_OAUTH_CLIENT_ID or ZOOM_REDIRECT_URI in environment variables');
  }
  
  const scopes = 'meeting:write meeting:read user:read';
  // Include userId in state if provided, otherwise generate random state
  const state = userId ? `${Math.random().toString(36).substring(2, 15)}_${userId}` : Math.random().toString(36).substring(2, 15);
  
  // For user-managed apps, create a simpler OAuth URL without scope and state parameters
  // as they seem to cause issues with the retry redirect
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return {
    authUrl,
    state
  };
};

// Exchange authorization code for access token
const exchangeCodeForToken = async (code, state) => {
  try {
    console.log('🔐 ZOOM OAUTH: Exchanging code for token...');
    
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_OAUTH_CLIENT_ID}:${process.env.ZOOM_OAUTH_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      expires_at: Date.now() + (response.data.expires_in * 1000),
      scope: response.data.scope
    };
    
    console.log('✅ ZOOM OAUTH: Token obtained successfully');
    return tokenData;
    
  } catch (error) {
    console.error('❌ ZOOM OAUTH ERROR:', error.response?.data || error.message);
    throw new Error(`Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`);
  }
};

// Refresh access token using refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    console.log('� ZOOM OAUTH: Refreshing access token...');
    
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_OAUTH_CLIENT_ID}:${process.env.ZOOM_OAUTH_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken, // Some responses don't include new refresh token
      expires_in: response.data.expires_in,
      expires_at: Date.now() + (response.data.expires_in * 1000),
      scope: response.data.scope
    };
    
    console.log('✅ ZOOM OAUTH: Token refreshed successfully');
    return tokenData;
    
  } catch (error) {
    console.error('❌ ZOOM REFRESH ERROR:', error.response?.data || error.message);
    throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
  }
};

// Get valid access token for user (refresh if needed)
const getValidAccessToken = async (userId) => {
  const tokenData = userTokens.get(userId);
  
  if (!tokenData) {
    throw new Error('User not authenticated. Please authenticate with Zoom first.');
  }
  
  // Check if token is expired (with 5 minute buffer)
  if (Date.now() >= (tokenData.expires_at - 300000)) {
    console.log('🔄 Token expired, refreshing...');
    const newTokenData = await refreshAccessToken(tokenData.refresh_token);
    userTokens.set(userId, newTokenData);
    return newTokenData.access_token;
  }
  
  return tokenData.access_token;
};

// Store user token data
const storeUserToken = (userId, tokenData) => {
  userTokens.set(userId, tokenData);
  console.log(`💾 Stored token for user: ${userId}`);
};

// Get Zoom API headers with authentication for a specific user
const getZoomHeaders = async (userId) => {
  const token = await getValidAccessToken(userId);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Check Zoom API connection status for a user
const checkZoomConnection = async (userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    // For user-managed apps, test connection by listing meetings instead of /users/me
    const response = await axios.get(`${ZOOM_API_BASE_URL}/users/me/meetings?type=scheduled&page_size=1`, { headers });
    
    return {
      status: 'connected',
      authenticated: true,
      message: 'Zoom API connection successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    if (error.message.includes('User not authenticated')) {
      return {
        status: 'not_authenticated',
        authenticated: false,
        message: 'User needs to authenticate with Zoom',
        authUrl: getOAuthURL().authUrl
      };
    }
    throw new Error(`Zoom API connection failed: ${error.response?.data?.message || error.message}`);
  }
};

// Format date and time for Zoom API using a specific timezone
// Returns local time string 'yyyy-LL-ddTHH:mm:ss' and relies on the 'timezone' field in the Zoom payload
const formatZoomDateTime = (date, time, timezone = process.env.ZOOM_DEFAULT_TIMEZONE || 'Asia/Manila') => {
  try {
    let dt;
    // If both date and time are provided (e.g., '2025-08-10', '15:00') treat them as in the provided timezone
    if (typeof date === 'string' && typeof time === 'string') {
      dt = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
    } else if (date instanceof Date) {
      dt = DateTime.fromJSDate(date, { zone: timezone });
    } else if (typeof date === 'string') {
      // If a single ISO-like string is provided:
      // - If it has an explicit offset/zone, convert to desired timezone preserving instant
      // - If it's naive (no zone), interpret it as wall time in the desired timezone (no shift)
      const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(date);
      if (hasZone) {
        const parsed = DateTime.fromISO(date, { setZone: true });
        dt = parsed.isValid ? parsed.setZone(timezone) : DateTime.invalid('Invalid ISO');
      } else {
        // Parse as local time in target timezone
        dt = DateTime.fromFormat(date, "yyyy-LL-dd'T'HH:mm:ss", { zone: timezone });
        if (!dt.isValid) {
          // Try a looser parse fallback
          dt = DateTime.fromISO(date, { zone: timezone });
        }
      }
    } else {
      throw new Error('Invalid date format');
    }

    if (!dt.isValid) {
      throw new Error('Invalid date/time provided');
    }

    // Zoom expects a local-time string when the 'timezone' field is provided
    return dt.toFormat("yyyy-LL-dd'T'HH:mm:ss");
  } catch (error) {
    throw new Error(`Date formatting error: ${error.message}`);
  }
};

// Create a Zoom meeting for a specific user
const createZoomMeeting = async (meetingData, userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    
    // Validate required fields - handle both camelCase and snake_case
    const { topic, start_time, startTime, duration, agenda } = meetingData;
    const actualStartTime = start_time || startTime;
    
    if (!topic || !actualStartTime || !duration) {
      throw new Error('Missing required fields: topic, start_time (or startTime), and duration are required');
    }
    
    console.log('🔵 ZOOM: Creating meeting for user:', userId);
    console.log('📋 Meeting topic:', topic);
    
    // Format the meeting data for Zoom API
    const meetingTimezone = process.env.ZOOM_DEFAULT_TIMEZONE || 'Asia/Manila';
    const zoomMeetingPayload = {
      topic: topic,
      type: 2, // Scheduled meeting
      // Provide local time string and explicit timezone so Zoom displays correctly for the host and attendees
      start_time: formatZoomDateTime(actualStartTime, undefined, meetingTimezone),
      duration: parseInt(duration),
      timezone: meetingTimezone,
      agenda: agenda || `Interview session for ${topic}`,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false,
        in_meeting: false,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: 'none',
        enforce_login: false,
        registrants_confirmation_email: false,
        waiting_room: true,
        allow_multiple_devices: true
      },
      password: generateMeetingPassword()
    };
    
    const response = await axios.post(
      `${ZOOM_API_BASE_URL}/users/me/meetings`,
      zoomMeetingPayload,
      { headers }
    );
    
    console.log('✅ ZOOM: Meeting created successfully');
    
    return {
      id: response.data.id,
      meetingId: response.data.id.toString(),
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      startTime: response.data.start_time,
      duration: response.data.duration,
      timezone: response.data.timezone,
      agenda: response.data.agenda,
      status: response.data.status,
      created_at: response.data.created_at
    };
    
  } catch (error) {
    console.error('❌ ZOOM CREATE ERROR:', error.response?.data || error.message);
    if (error.response) {
      throw new Error(`Zoom API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw new Error(`Failed to create Zoom meeting: ${error.message}`);
  }
};

// Generate a secure meeting password
const generateMeetingPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Update a Zoom meeting
const updateZoomMeeting = async (meetingId, updateData, userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    
    // Format the update data
    const zoomUpdatePayload = {
      ...updateData
    };
    
    if (updateData.start_time) {
      zoomUpdatePayload.start_time = formatZoomDateTime(updateData.start_time);
    }
    
    await axios.patch(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      zoomUpdatePayload,
      { headers }
    );
    
    // Get the updated meeting details
    return await getZoomMeeting(meetingId, userId);
    
  } catch (error) {
    if (error.response) {
      throw new Error(`Zoom API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw new Error(`Failed to update Zoom meeting: ${error.message}`);
  }
};

// Get Zoom meeting details
const getZoomMeeting = async (meetingId, userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    
    const response = await axios.get(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      { headers }
    );
    
    return {
      id: response.data.id,
      meetingId: response.data.id.toString(),
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
      startTime: response.data.start_time,
      duration: response.data.duration,
      timezone: response.data.timezone,
      agenda: response.data.agenda,
      status: response.data.status,
      created_at: response.data.created_at
    };
    
  } catch (error) {
    if (error.response) {
      throw new Error(`Zoom API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw new Error(`Failed to get Zoom meeting: ${error.message}`);
  }
};

// Delete a Zoom meeting
const deleteZoomMeeting = async (meetingId, userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    
    await axios.delete(
      `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
      { headers }
    );
    
    return {
      success: true,
      message: 'Meeting deleted successfully',
      meetingId
    };
    
  } catch (error) {
    if (error.response) {
      throw new Error(`Zoom API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw new Error(`Failed to delete Zoom meeting: ${error.message}`);
  }
};

// List user's meetings
const listZoomMeetings = async (type = 'scheduled', pageSize = 30, userId) => {
  try {
    const headers = await getZoomHeaders(userId);
    
    const response = await axios.get(
      `${ZOOM_API_BASE_URL}/users/me/meetings`,
      { 
        headers,
        params: {
          type,
          page_size: pageSize
        }
      }
    );
    
    return {
      meetings: response.data.meetings.map(meeting => ({
        id: meeting.id,
        meetingId: meeting.id.toString(),
        topic: meeting.topic,
        joinUrl: meeting.join_url,
        startTime: meeting.start_time,
        duration: meeting.duration,
        status: meeting.status,
        created_at: meeting.created_at
      })),
      page_count: response.data.page_count,
      page_size: response.data.page_size,
      total_records: response.data.total_records
    };
    
  } catch (error) {
    if (error.response) {
      throw new Error(`Zoom API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw new Error(`Failed to list Zoom meetings: ${error.message}`);
  }
};

// Schedule interview meeting and send email (OAuth version)
const scheduleInterviewMeeting = async (recruitData, interviewType = 'initial', schedulerInfo, userId) => {
  try {
    const { email, firstName, lastName, position } = recruitData;
    
    if (!email || !firstName) {
      throw new Error('Recruit email and name are required');
    }
    
    if (!userId) {
      throw new Error('User ID is required for OAuth authentication');
    }
    
    console.log('🔵 ZOOM OAUTH: Scheduling interview for user:', userId);
    
    // Create meeting data
    const meetingData = {
      topic: `${interviewType === 'initial' ? 'Initial' : 'Final'} Interview - ${firstName} ${lastName} - ${position || 'Software Developer'}`,
      start_time: schedulerInfo.startTime,
      duration: schedulerInfo.duration || 60,
      agenda: `${interviewType === 'initial' ? 'Initial' : 'Final'} interview session for ${firstName} ${lastName} applying for ${position || 'Software Developer'} position.`
    };
    
    // Create the Zoom meeting with user authentication
    const meeting = await createZoomMeeting(meetingData, userId);
    
    // Prepare email data
    const emailData = {
      id: meeting.id,
      topic: meeting.topic,
      joinUrl: meeting.joinUrl,
      startUrl: meeting.startUrl,
      password: meeting.password,
      startTime: meeting.startTime,
      duration: meeting.duration,
      meetingId: meeting.meetingId
    };
    
    // Send email invitation
    const { sendInterviewInvitation } = require('./email');
    const emailResult = await sendInterviewInvitation(
      email,
      emailData,
      schedulerInfo.sender,
      `${interviewType === 'initial' ? 'Initial' : 'Final'} Interview`
    );
    
    return {
      meeting: {
        id: meeting.id,
        meetingId: meeting.meetingId,
        joinUrl: meeting.joinUrl,
        startUrl: meeting.startUrl,
        password: meeting.password,
        startTime: meeting.startTime,
        duration: meeting.duration,
        topic: meeting.topic
      },
      email: {
        sent: true,
        messageId: emailResult.messageId,
        recipient: email
      },
      success: true
    };
    
  } catch (error) {
    if (error.message.includes('User not authenticated')) {
      throw new Error(`Zoom authentication required: ${error.message}`);
    }
    throw new Error(`Failed to schedule interview meeting: ${error.message}`);
  }
};

module.exports = {
  // OAuth functions
  getOAuthURL,
  exchangeCodeForToken,
  refreshAccessToken,
  storeUserToken,
  getValidAccessToken,
  
  // API functions
  getZoomHeaders,
  checkZoomConnection,
  formatZoomDateTime,
  createZoomMeeting,
  updateZoomMeeting,
  getZoomMeeting,
  deleteZoomMeeting,
  listZoomMeetings,
  scheduleInterviewMeeting,
  generateMeetingPassword
};
