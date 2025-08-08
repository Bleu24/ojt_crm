const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Enhanced configuration for better deliverability
    requireTLS: true,
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    // Debugging options
    debug: false,
    logger: false
  });
};

// Check email connection
const checkEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email service is working' };
  } catch (error) {
    throw new Error(`Email connection failed: ${error.message}`);
  }
};

// Send interview invitation
const sendInterviewInvitation = async (email, meetingDetails, senderInfo = null, interviewPhase = 'Interview', candidateName = null) => {
  try {
    const transporter = createTransporter();
    
    const fromName = senderInfo?.name || 'HR Team';
    const replyTo = senderInfo?.email || process.env.EMAIL_USER;
    const greeting = candidateName ? `Dear ${candidateName},` : 'Dear Candidate,';
    
    const subject = `${interviewPhase} Invitation - ${meetingDetails.topic}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>🏢 Skyline Summit</h1>
          <p>Human Resources Department</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2>Interview Invitation</h2>
          <p>${greeting}</p>
          <p>You are invited to participate in the <strong>${interviewPhase.toLowerCase()}</strong> for the position you applied for.</p>
          
          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Meeting Details</h3>
            <p><strong>Position:</strong> ${meetingDetails.topic}</p>
            <p><strong>Date & Time:</strong> ${new Date(meetingDetails.startTime).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${meetingDetails.duration} minutes</p>
            <p><strong>Meeting ID:</strong> ${meetingDetails.meetingId}</p>
            <p><strong>Password:</strong> ${meetingDetails.password}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetingDetails.joinUrl}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Join Interview
            </a>
          </div>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 5px;">
            <h4>Contact Information</h4>
            <p><strong>Contact Person:</strong> ${fromName}</p>
            <p><strong>Email:</strong> ${replyTo}</p>
          </div>
          
          <p style="margin-top: 20px;">Best regards,<br><strong>${fromName}</strong><br>Skyline Summit HR</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${fromName} - Skyline Summit HR" <${process.env.EMAIL_USER}>`,
      replyTo: replyTo,
      to: email,
      subject: subject,
      html: htmlContent,
      // Anti-spam headers to mimic manual sending
      headers: {
        'X-Priority': '3', // Normal priority (not high like spam)
        'X-MSMail-Priority': 'Normal',
        'Importance': 'normal',
        'X-Mailer': 'Gmail', // Mimic Gmail web interface
        'User-Agent': 'Mozilla/5.0 (compatible; Gmail)',
        'X-Originating-IP': '[127.0.0.1]',
        'X-Source': 'Skyline Summit HR Department',
        'References': `<interview-${Date.now()}@skyelinesummit.com>`,
        'In-Reply-To': `<recruitment-${Date.now()}@skyelinesummit.com>`,
        'Thread-Topic': `Interview Invitation - ${meetingDetails.topic}`,
        'Content-Language': 'en-US',
        'X-Auto-Response-Suppress': 'All',
        'Precedence': 'bulk',
        'List-Unsubscribe': '<mailto:hr@skyelinesummit.com?subject=unsubscribe>',
        'List-Id': 'Skyline Summit Interview Notifications <interviews.skyelinesummit.com>'
      },
      // Text version for better deliverability
      text: `
        Interview Invitation - ${meetingDetails.topic}
        
        ${greeting}
        
        You are invited to participate in the ${interviewPhase.toLowerCase()} for the position you applied for.
        
        Meeting Details:
        - Position: ${meetingDetails.topic}
        - Date & Time: ${new Date(meetingDetails.startTime).toLocaleString()}
        - Duration: ${meetingDetails.duration} minutes
        - Meeting ID: ${meetingDetails.meetingId}
        - Password: ${meetingDetails.password}
        - Join URL: ${meetingDetails.joinUrl}
        
        Contact Information:
        - Contact Person: ${fromName}
        - Email: ${replyTo}
        
        Best regards,
        ${fromName}
        Skyline Summit HR
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      recipient: email
    };

  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Test email deliverability across different providers
const testEmailDeliverability = async (testEmails = []) => {
  try {
    console.log('🧪 EMAIL TEST: Testing deliverability across providers...');
    
    const results = [];
    const transporter = createTransporter();
    
    const testEmailAddresses = testEmails.length > 0 ? testEmails : [
      // Add your test emails here
      'test@gmail.com',
      'test@outlook.com', 
      'test@yahoo.com'
    ];
    
    for (const email of testEmailAddresses) {
      try {
        const testContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Deliverability Test</h2>
            <p>This is a test email to verify deliverability to ${email.split('@')[1]}.</p>
            <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
            <p><strong>From:</strong> Skyline Summit CRM System</p>
          </div>
        `;
        
        const mailOptions = {
          from: `"Skyline Summit HR Test" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Email Deliverability Test - Skyline Summit',
          html: testContent,
          headers: {
            'X-Mailer': 'Skyline Summit CRM System',
            'Organization': 'Skyline Summit'
          }
        };
        
        const result = await transporter.sendMail(mailOptions);
        results.push({
          email,
          status: 'success',
          messageId: result.messageId,
          provider: email.split('@')[1]
        });
        
        console.log(`✅ Test email sent to ${email}`);
        
      } catch (error) {
        results.push({
          email,
          status: 'failed',
          error: error.message,
          provider: email.split('@')[1]
        });
        
        console.log(`❌ Test email failed to ${email}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    };
    
  } catch (error) {
    throw new Error(`Email deliverability test failed: ${error.message}`);
  }
};

module.exports = {
  checkEmailConnection,
  sendInterviewInvitation,
  testEmailDeliverability
};
