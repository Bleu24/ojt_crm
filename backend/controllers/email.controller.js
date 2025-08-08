const { checkEmailConnection: checkConnection, sendInterviewInvitation, testEmailDeliverability } = require('../utils/email');

// Check email service connection status
const checkEmailConnection = async (req, res) => {
  try {
    const result = await checkConnection();
    res.json({
      success: true,
      message: 'Email service is operational',
      details: result
    });
  } catch (error) {
    console.error('❌ EMAIL CONNECTION ERROR:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Email service connection failed',
      details: error.message 
    });
  }
};

// Send interview invitation email
const sendInvitationEmail = async (req, res) => {
  try {
    const { email, senderName, interviewPhase } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Recipient email address is required' 
      });
    }

    // Sample meeting details for demonstration
    const sampleMeetingDetails = {
      id: Date.now(),
      topic: 'Interview - Software Developer Position',
      joinUrl: 'https://zoom.us/j/123456789',
      startUrl: 'https://zoom.us/s/123456789',
      password: 'DEMO123',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 60,
      meetingId: Date.now().toString()
    };

    // Prepare sender information
    const senderInfo = {
      name: senderName || req.user?.name || 'HR Team',
      email: req.user?.email || process.env.EMAIL_USER
    };

    const result = await sendInterviewInvitation(
      email, 
      sampleMeetingDetails, 
      senderInfo,
      interviewPhase || 'Interview'
    );

    res.json({
      success: true,
      message: 'Interview invitation sent successfully',
      recipient: email,
      sender: senderInfo.name,
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ EMAIL SEND ERROR:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send interview invitation',
      details: error.message 
    });
  }
};

// Test email deliverability across providers
const testDeliverability = async (req, res) => {
  try {
    const { emails } = req.body; // Array of test email addresses
    
    const result = await testEmailDeliverability(emails);
    
    res.json({
      success: true,
      message: 'Email deliverability test completed',
      ...result
    });
    
  } catch (error) {
    console.error('❌ EMAIL DELIVERABILITY TEST ERROR:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test email deliverability',
      details: error.message 
    });
  }
};

module.exports = {
  checkEmailConnection,
  sendInvitationEmail,
  testDeliverability
};
