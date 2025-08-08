const { 
  checkEmailConnection: checkConnection, 
  sendInterviewInvitation, 
  testEmailDeliverability,
  sendPassInitialEmail,
  sendFailInitialEmail,
  sendHireEmail,
  sendRejectEmail
} = require('../utils/email');
const Recruit = require('../models/Recruit.model');

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

// Send pass initial interview email
const sendPassInitial = async (req, res) => {
  try {
    const { recruitId, message } = req.body;
    
    if (!recruitId) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID is required'
      });
    }
    
    // Get recruit information
    const recruit = await Recruit.findById(recruitId);
    if (!recruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    // Derive names safely from fullName if individual fields are missing
    const [firstName = '', lastName = ''] = (recruit.fullName || '').split(' ');
    const candidateData = {
      firstName: recruit.firstName || firstName || 'Candidate',
      lastName: recruit.lastName || lastName || '',
      position: recruit.position || 'the role',
      email: recruit.email
    };
    
    const senderInfo = {
      name: (req.user?.name || [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || 'HR Team').trim(),
      email: req.user?.email || process.env.EMAIL_USER
    };
    
    const emailResult = await sendPassInitialEmail(
      recruit.email,
      candidateData,
      senderInfo
    );
    
    // Update recruit status
    await Recruit.findByIdAndUpdate(recruitId, {
      initialInterviewStatus: 'passed',
      initialInterviewNotes: message || 'Passed initial interview',
      lastEmailSent: 'pass_initial',
      lastEmailDate: new Date()
    });
    
    console.log('✅ EMAIL SUCCESS: Pass initial email sent to:', recruit.email);
    
    res.json({
      success: true,
      message: 'Pass initial email sent successfully',
      emailResult: {
        messageId: emailResult.messageId,
        recipient: recruit.email
      }
    });
    
  } catch (error) {
    console.error('❌ EMAIL ERROR: Failed to send pass initial email:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send pass initial email',
      details: error.message
    });
  }
};

// Send fail initial interview email
const sendFailInitial = async (req, res) => {
  try {
    const { recruitId, message } = req.body;
    
    if (!recruitId) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID is required'
      });
    }
    
    // Get recruit information
    const recruit = await Recruit.findById(recruitId);
    if (!recruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    const [firstName2 = '', lastName2 = ''] = (recruit.fullName || '').split(' ');
    const candidateData = {
      firstName: recruit.firstName || firstName2 || 'Candidate',
      lastName: recruit.lastName || lastName2 || '',
      position: recruit.position || 'the role',
      email: recruit.email
    };
    
    const senderInfo = {
      name: (req.user?.name || [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || 'HR Team').trim(),
      email: req.user?.email || process.env.EMAIL_USER
    };
    
    const emailResult = await sendFailInitialEmail(
      recruit.email,
      candidateData,
      senderInfo
    );
    
    // Update recruit status
    await Recruit.findByIdAndUpdate(recruitId, {
      initialInterviewStatus: 'failed',
      initialInterviewNotes: message || 'Did not pass initial interview',
      status: 'rejected',
      lastEmailSent: 'fail_initial',
      lastEmailDate: new Date()
    });
    
    console.log('✅ EMAIL SUCCESS: Fail initial email sent to:', recruit.email);
    
    res.json({
      success: true,
      message: 'Fail initial email sent successfully',
      emailResult: {
        messageId: emailResult.messageId,
        recipient: recruit.email
      }
    });
    
  } catch (error) {
    console.error('❌ EMAIL ERROR: Failed to send fail initial email:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send fail initial email',
      details: error.message
    });
  }
};

// Send hire email
const sendHire = async (req, res) => {
  try {
    const { recruitId, jobDetails } = req.body;
    
    if (!recruitId) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID is required'
      });
    }
    
    // Get recruit information
    const recruit = await Recruit.findById(recruitId);
    if (!recruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    const [firstName3 = '', lastName3 = ''] = (recruit.fullName || '').split(' ');
    const candidateData = {
      firstName: recruit.firstName || firstName3 || 'Candidate',
      lastName: recruit.lastName || lastName3 || '',
      position: recruit.position || 'the role',
      email: recruit.email
    };
    
    const senderInfo = {
      name: (req.user?.name || [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || 'HR Team').trim(),
      email: req.user?.email || process.env.EMAIL_USER
    };
    
    const emailResult = await sendHireEmail(
      recruit.email,
      candidateData,
      senderInfo,
      jobDetails || {}
    );
    
    // Update recruit status
    await Recruit.findByIdAndUpdate(recruitId, {
      status: 'hired',
      finalInterviewStatus: 'passed',
      hireDate: new Date(),
      jobDetails: jobDetails,
      lastEmailSent: 'hire',
      lastEmailDate: new Date()
    });
    
    console.log('✅ EMAIL SUCCESS: Hire email sent to:', recruit.email);
    
    res.json({
      success: true,
      message: 'Hire email sent successfully',
      emailResult: {
        messageId: emailResult.messageId,
        recipient: recruit.email
      }
    });
    
  } catch (error) {
    console.error('❌ EMAIL ERROR: Failed to send hire email:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send hire email',
      details: error.message
    });
  }
};

// Send reject email
const sendReject = async (req, res) => {
  try {
    const { recruitId, message } = req.body;
    
    if (!recruitId) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID is required'
      });
    }
    
    // Get recruit information
    const recruit = await Recruit.findById(recruitId);
    if (!recruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    const [firstName4 = '', lastName4 = ''] = (recruit.fullName || '').split(' ');
    const candidateData = {
      firstName: recruit.firstName || firstName4 || 'Candidate',
      lastName: recruit.lastName || lastName4 || '',
      position: recruit.position || 'the role',
      email: recruit.email
    };
    
    const senderInfo = {
      name: (req.user?.name || [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || 'HR Team').trim(),
      email: req.user?.email || process.env.EMAIL_USER
    };
    
    const emailResult = await sendRejectEmail(
      recruit.email,
      candidateData,
      senderInfo
    );
    
    // Update recruit status
    await Recruit.findByIdAndUpdate(recruitId, {
      status: 'rejected',
      finalInterviewStatus: 'failed',
      rejectionReason: message || 'Did not meet requirements',
      lastEmailSent: 'reject',
      lastEmailDate: new Date()
    });
    
    console.log('✅ EMAIL SUCCESS: Reject email sent to:', recruit.email);
    
    res.json({
      success: true,
      message: 'Reject email sent successfully',
      emailResult: {
        messageId: emailResult.messageId,
        recipient: recruit.email
      }
    });
    
  } catch (error) {
    console.error('❌ EMAIL ERROR: Failed to send reject email:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send reject email',
      details: error.message
    });
  }
};

// Get email history for a recruit
const getEmailHistory = async (req, res) => {
  try {
    const { recruitId } = req.params;
    
    if (!recruitId) {
      return res.status(400).json({
        success: false,
        error: 'Recruit ID is required'
      });
    }
    
    const recruit = await Recruit.findById(recruitId).select(
      'firstName lastName email lastEmailSent lastEmailDate initialInterviewStatus finalInterviewStatus status'
    );
    
    if (!recruit) {
      return res.status(404).json({
        success: false,
        error: 'Recruit not found'
      });
    }
    
    res.json({
      success: true,
      emailHistory: {
        candidateName: `${recruit.firstName} ${recruit.lastName}`,
        email: recruit.email,
        lastEmailSent: recruit.lastEmailSent,
        lastEmailDate: recruit.lastEmailDate,
        currentStatus: recruit.status,
        initialInterviewStatus: recruit.initialInterviewStatus,
        finalInterviewStatus: recruit.finalInterviewStatus
      }
    });
    
  } catch (error) {
    console.error('❌ EMAIL HISTORY ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get email history',
      details: error.message
    });
  }
};

module.exports = {
  checkEmailConnection,
  sendInvitationEmail,
  testDeliverability,
  sendPassInitial,
  sendFailInitial,
  sendHire,
  sendReject,
  getEmailHistory
};
