// Test Zoom API connection
const { createZoomMeeting, formatZoomDateTime } = require('../utils/zoom');

exports.testZoomConnection = async (req, res) => {
  try {
    // Test creating a simple meeting
    const testMeetingData = {
      topic: 'Zoom API Test Meeting',
      startTime: formatZoomDateTime(
        new Date().toISOString().split('T')[0], // Today's date
        '15:00' // 3 PM
      ),
      duration: 30,
      agenda: 'Testing Zoom API integration for CRM system'
    };

    const meeting = await createZoomMeeting(testMeetingData);

    res.json({
      success: true,
      message: 'Zoom API connection successful!',
      testMeeting: {
        topic: meeting.topic,
        joinUrl: meeting.joinUrl,
        meetingId: meeting.meetingId,
        password: meeting.password,
        startTime: meeting.startTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Zoom API connection failed',
      error: error.message
    });
  }
};
