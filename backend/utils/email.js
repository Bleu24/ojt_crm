const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

// Create transporter with improved anti-spam configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
    },
    // Anti-spam configurations
    secure: true,
    tls: {
      rejectUnauthorized: false
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });
};

// Check email service connection
const checkEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      status: 'connected',
      timestamp: new Date().toISOString(),
      service: 'Gmail'
    };
  } catch (error) {
    throw new Error(`Email service connection failed: ${error.message}`);
  }
};

// Send interview invitation with Zoom meeting details
const sendInterviewInvitation = async (recipientEmail, meetingDetails, senderInfo, interviewPhase = 'Interview') => {
  try {
    const transporter = createTransporter();

    // Let Nodemailer manage MIME headers to avoid mis-encoded plain-text
    const mailOptions = {
      from: `${senderInfo.name || 'HR Team - Skyline Summit'} <${process.env.EMAIL_USER || 'hrskyelinesummit@gmail.com'}>`,
      to: recipientEmail,
      replyTo: senderInfo.email || process.env.EMAIL_USER,
      subject: `${interviewPhase} Invitation - ${meetingDetails.topic}`,
      headers: {
        'X-Mailer': 'Skyline Summit CRM',
        'List-Unsubscribe': `<mailto:unsubscribe@${process.env.EMAIL_DOMAIN || 'skyelinesummit.com'}>`
      },
      html: generateInvitationEmailHTML(meetingDetails, senderInfo, interviewPhase),
      text: generateInvitationEmailText(meetingDetails, senderInfo, interviewPhase)
    };

    const result = await transporter.sendMail(mailOptions);
    
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    };
    
  } catch (error) {
    throw new Error(`Failed to send interview invitation: ${error.message}`);
  }
};

// Generate HTML email template
const generateInvitationEmailHTML = (meetingDetails, senderInfo, interviewPhase) => {
  const tz = meetingDetails.timezone || process.env.ZOOM_DEFAULT_TIMEZONE || 'Asia/Manila';
  // Interpret startTime as an ISO string; if it includes a zone, respect it, then render in tz
  let dt = DateTime.fromISO(meetingDetails.startTime, { setZone: true });
  if (!dt.isValid) {
    // Fallback for naive strings
    dt = DateTime.fromISO(meetingDetails.startTime, { zone: tz });
  }
  const formattedDate = dt.setZone(tz).toFormat('EEEE, LLLL d, yyyy');
  const formattedTime = dt.setZone(tz).toFormat('hh:mm a (ZZZZ)');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${interviewPhase} Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .meeting-details { background-color: #e9f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .warning { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 ${interviewPhase} Invitation</h1>
        <p><strong>Hello!</strong></p>
        <p>You are invited to attend a ${interviewPhase.toLowerCase()} session. Please review the details below and join us at the scheduled time.</p>
      </div>

      <div class="meeting-details">
        <h2>📅 Meeting Details</h2>
        <p><strong>Topic:</strong> ${meetingDetails.topic}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
  <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Duration:</strong> ${meetingDetails.duration} minutes</p>
        <p><strong>Meeting ID:</strong> ${meetingDetails.meetingId}</p>
        ${meetingDetails.password ? `<p><strong>Password:</strong> ${meetingDetails.password}</p>` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${meetingDetails.joinUrl}" class="button">🔗 Join Zoom Meeting</a>
      </div>

      <div class="warning">
        <h3>⚠️ Important Notes:</h3>
        <ul>
          <li>Please join the meeting 5-10 minutes early to test your audio and video</li>
          <li>Ensure you have a stable internet connection</li>
          <li>Find a quiet, well-lit space for the interview</li>
          <li>Have your resume and any relevant documents ready</li>
        </ul>
      </div>

      <div class="footer">
        <p><strong>Contact Information:</strong></p>
        <p>If you have any questions or need to reschedule, please contact:</p>
        <p><strong>${senderInfo.name}</strong><br>
        Email: <a href="mailto:${senderInfo.email}">${senderInfo.email}</a></p>
        
        <hr>
        <p><em>This is an automated message from Skyline Summit CRM. Please do not reply to this email directly.</em></p>
        <p><small>© ${new Date().getFullYear()} Skyline Summit. All rights reserved.</small></p>
      </div>
    </body>
    </html>
  `;
};

// Generate plain text email template
const generateInvitationEmailText = (meetingDetails, senderInfo, interviewPhase) => {
  const tz = meetingDetails.timezone || process.env.ZOOM_DEFAULT_TIMEZONE || 'Asia/Manila';
  let dt = DateTime.fromISO(meetingDetails.startTime, { setZone: true });
  if (!dt.isValid) {
    dt = DateTime.fromISO(meetingDetails.startTime, { zone: tz });
  }
  const formattedDate = dt.setZone(tz).toFormat('EEEE, LLLL d, yyyy');
  const formattedTime = dt.setZone(tz).toFormat('hh:mm a (ZZZZ)');

  // Plain-text only, no emojis; simple lines to prevent quoted-printable artifacts
  return [
    `${interviewPhase} Invitation`,
    '',
    'Hello!',
    '',
    `You are invited to attend a ${interviewPhase.toLowerCase()} session. Please review the details below and join us at the scheduled time.`,
    '',
    'MEETING DETAILS:',
    `- Topic: ${meetingDetails.topic}`,
    `- Date: ${formattedDate}`,
    `- Time: ${formattedTime}`,
    `- Duration: ${meetingDetails.duration} minutes`,
    `- Meeting ID: ${meetingDetails.meetingId}`,
    meetingDetails.password ? `- Password: ${meetingDetails.password}` : '',
    '',
    `Join Zoom Meeting: ${meetingDetails.joinUrl}`,
    '',
    'IMPORTANT NOTES:',
    '- Please join the meeting 5-10 minutes early to test your audio and video',
    '- Ensure you have a stable internet connection',
    '- Find a quiet, well-lit space for the interview',
    '- Have your resume and any relevant documents ready',
    '',
    'CONTACT INFORMATION:',
    'If you have any questions or need to reschedule, please contact:',
    senderInfo.name || 'HR Team',
    `Email: ${senderInfo.email || (process.env.EMAIL_USER || '')}`,
    '',
    '---',
    'This is an automated message from Skyline Summit CRM. Please do not reply to this email directly.',
    `© ${new Date().getFullYear()} Skyline Summit. All rights reserved.`
  ].filter(Boolean).join('\n');
};

// Test email deliverability across providers
const testEmailDeliverability = async (testEmails = []) => {
  try {
    const transporter = createTransporter();
    const results = [];
    
    for (const email of testEmails) {
      try {
        const testResult = await transporter.sendMail({
          from: {
            name: 'Skyline Summit CRM - Test',
            address: process.env.EMAIL_USER
          },
          to: email,
          subject: 'Email Deliverability Test',
          html: `
            <h2>Email Deliverability Test</h2>
            <p>This is a test email to verify deliverability.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <p>If you received this email, the deliverability test was successful.</p>
          `,
          headers: {
            'X-Mailer': 'Skyline Summit CRM - Test',
            'X-Priority': '3'
          }
        });
        
        results.push({
          email,
          status: 'sent',
          messageId: testResult.messageId,
          response: testResult.response
        });
        
      } catch (error) {
        results.push({
          email,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      totalTested: testEmails.length,
      successful: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    };
    
  } catch (error) {
    throw new Error(`Email deliverability test failed: ${error.message}`);
  }
};

// Send email for passing initial interview
const sendPassInitialEmail = async (recipientEmail, candidateData, senderInfo) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
  from: `${senderInfo.name || 'HR Team'} <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: senderInfo.email || process.env.EMAIL_USER,
      subject: `🎉 Congratulations! Initial Interview Results - ${candidateData.position}`,
      
  headers: { 'X-Mailer': 'CRM System' },
      
      html: generatePassInitialHTML(candidateData, senderInfo),
      text: generatePassInitialText(candidateData, senderInfo)
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    };
  } catch (error) {
    throw new Error(`Failed to send pass initial email: ${error.message}`);
  }
};

// Send email for failing initial interview
const sendFailInitialEmail = async (recipientEmail, candidateData, senderInfo) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
  from: `${senderInfo.name || 'HR Team'} <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: senderInfo.email || process.env.EMAIL_USER,
      subject: `Initial Interview Results - ${candidateData.position}`,
      
  headers: { 'X-Mailer': 'CRM System' },
      
      html: generateFailInitialHTML(candidateData, senderInfo),
      text: generateFailInitialText(candidateData, senderInfo)
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    };
  } catch (error) {
    throw new Error(`Failed to send fail initial email: ${error.message}`);
  }
};

// Send email for hiring decision
const sendHireEmail = async (recipientEmail, candidateData, senderInfo, jobDetails = {}) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
  from: `${senderInfo.name || 'HR Team'} <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: senderInfo.email || process.env.EMAIL_USER,
      subject: `🎊 Welcome to the Team! Job Offer - ${candidateData.position}`,
      
  headers: { 'X-Mailer': 'CRM System' },
      
      html: generateHireHTML(candidateData, senderInfo, jobDetails),
      text: generateHireText(candidateData, senderInfo, jobDetails)
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    };
  } catch (error) {
    throw new Error(`Failed to send hire email: ${error.message}`);
  }
};

// Send email for final rejection
const sendRejectEmail = async (recipientEmail, candidateData, senderInfo) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
  from: `${senderInfo.name || 'HR Team'} <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: senderInfo.email || process.env.EMAIL_USER,
      subject: `Application Update - ${candidateData.position}`,
      
  headers: { 'X-Mailer': 'CRM System' },
      
      html: generateRejectHTML(candidateData, senderInfo),
      text: generateRejectText(candidateData, senderInfo)
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    };
  } catch (error) {
    throw new Error(`Failed to send reject email: ${error.message}`);
  }
};

// HTML template for passing initial interview
const generatePassInitialHTML = (candidateData, senderInfo) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Initial Interview Results</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-steps { background-color: #e2f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Congratulations, ${candidateData.firstName}!</h1>
        <p><strong>Great news!</strong> You have successfully passed your initial interview.</p>
      </div>

      <div class="content">
        <h2>📋 Interview Results</h2>
        <p>We're pleased to inform you that you have performed well in your initial interview for the <strong>${candidateData.position}</strong> position.</p>
        <p>Your skills, experience, and enthusiasm have impressed our interview panel.</p>
      </div>

      <div class="next-steps">
        <h3>🚀 Next Steps</h3>
        <ul>
          <li>You will be contacted soon for the final interview round</li>
          <li>Please keep your schedule flexible for the upcoming week</li>
          <li>Continue to review the job requirements and company information</li>
          <li>Prepare for more technical/behavioral questions in the final round</li>
        </ul>
      </div>

      <div class="footer">
        <p><strong>Contact Information:</strong></p>
        <p>If you have any questions, please contact:</p>
        <p><strong>${senderInfo.name}</strong><br>
        Email: <a href="mailto:${senderInfo.email}">${senderInfo.email}</a></p>
        <p>Thank you for your interest in joining our team!</p>
      </div>
    </body>
    </html>
  `;
};

// HTML template for failing initial interview
const generateFailInitialHTML = (candidateData, senderInfo) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Initial Interview Results</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .encouragement { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Thank you for your time, ${candidateData.firstName}</h1>
        <p>We appreciate your interest in the <strong>${candidateData.position}</strong> position.</p>
      </div>

      <div class="content">
        <h2>📋 Interview Results</h2>
        <p>After careful consideration of your initial interview, we have decided not to proceed with your application for this particular role at this time.</p>
        <p>This decision was difficult as we had many qualified candidates to choose from.</p>
      </div>

      <div class="encouragement">
        <h3>💪 Keep Going!</h3>
        <p>We encourage you to:</p>
        <ul>
          <li>Continue developing your skills and experience</li>
          <li>Apply for future opportunities that match your profile</li>
          <li>Stay connected with us through our careers page</li>
          <li>Consider this as valuable interview experience</li>
        </ul>
      </div>

      <div class="footer">
        <p><strong>Contact Information:</strong></p>
        <p>If you have any questions, please contact:</p>
        <p><strong>${senderInfo.name}</strong><br>
        Email: <a href="mailto:${senderInfo.email}">${senderInfo.email}</a></p>
        <p>We wish you the best in your career journey!</p>
      </div>
    </body>
    </html>
  `;
};

// HTML template for hiring decision
const generateHireHTML = (candidateData, senderInfo, jobDetails) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Offer</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #17a2b8; }
        .offer-details { background-color: #e2f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-steps { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .highlight { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎊 Welcome to the Team, ${candidateData.firstName}!</h1>
        <p><strong>Congratulations!</strong> We're excited to offer you the position of <strong>${candidateData.position}</strong>.</p>
      </div>

      <div class="offer-details">
        <h2>📄 Job Offer Details</h2>
        <p><strong>Position:</strong> ${candidateData.position}</p>
        ${jobDetails.startDate ? `<p><strong>Start Date:</strong> ${jobDetails.startDate}</p>` : ''}
        ${jobDetails.salary ? `<p><strong>Salary:</strong> ${jobDetails.salary}</p>` : ''}
        ${jobDetails.benefits ? `<p><strong>Benefits:</strong> ${jobDetails.benefits}</p>` : ''}
        ${jobDetails.workLocation ? `<p><strong>Work Location:</strong> ${jobDetails.workLocation}</p>` : ''}
        ${jobDetails.workArrangement ? `<p><strong>Work Arrangement:</strong> ${jobDetails.workArrangement}</p>` : ''}
      </div>

      <div class="highlight">
        <p><strong>🕐 Response Required:</strong> Please respond to this offer within 5 business days.</p>
      </div>

      <div class="next-steps">
        <h3>📋 Next Steps</h3>
        <ol>
          <li>Review the complete offer package attached (if any)</li>
          <li>Contact us if you have any questions about the offer</li>
          <li>Confirm your acceptance by replying to this email</li>
          <li>Complete any required paperwork and background checks</li>
          <li>Prepare for your onboarding process</li>
        </ol>
      </div>

      <div class="footer">
        <p><strong>Contact Information:</strong></p>
        <p>For any questions regarding this offer, please contact:</p>
        <p><strong>${senderInfo.name}</strong><br>
        Email: <a href="mailto:${senderInfo.email}">${senderInfo.email}</a></p>
        <p>We're thrilled to have you join our team!</p>
      </div>
    </body>
    </html>
  `;
};

// HTML template for rejection
const generateRejectHTML = (candidateData, senderInfo) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #6c757d; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .encouragement { background-color: #e2f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Thank you, ${candidateData.firstName}</h1>
        <p>We appreciate your interest in the <strong>${candidateData.position}</strong> position and the time you invested in our interview process.</p>
      </div>

      <div class="content">
        <h2>📋 Application Update</h2>
        <p>After thorough consideration and evaluation of all candidates, we have decided to move forward with another candidate whose background more closely aligns with our current needs.</p>
        <p>This was a very competitive process, and your qualifications and experience are impressive.</p>
      </div>

      <div class="encouragement">
        <h3>🌟 Stay Connected</h3>
        <p>We encourage you to:</p>
        <ul>
          <li>Keep an eye on our careers page for future opportunities</li>
          <li>Consider applying for other roles that match your skills</li>
          <li>Connect with us on professional networks</li>
          <li>Continue building your professional experience</li>
        </ul>
        <p>We'll keep your information on file for future opportunities that may be a better fit.</p>
      </div>

      <div class="footer">
        <p><strong>Contact Information:</strong></p>
        <p>If you have any questions, please contact:</p>
        <p><strong>${senderInfo.name}</strong><br>
        Email: <a href="mailto:${senderInfo.email}">${senderInfo.email}</a></p>
        <p>Thank you again for your interest, and we wish you success in your career journey!</p>
      </div>
    </body>
    </html>
  `;
};

// Text versions of the emails (simplified)
const generatePassInitialText = (candidateData, senderInfo) => {
  return `
Congratulations, ${candidateData.firstName}!

Great news! You have successfully passed your initial interview for the ${candidateData.position} position.

Your skills, experience, and enthusiasm have impressed our interview panel.

Next Steps:
- You will be contacted soon for the final interview round
- Please keep your schedule flexible for the upcoming week
- Continue to review the job requirements and company information
- Prepare for more technical/behavioral questions in the final round

If you have any questions, please contact:
${senderInfo.name}
Email: ${senderInfo.email}

Thank you for your interest in joining our team!
  `;
};

const generateFailInitialText = (candidateData, senderInfo) => {
  return `
Dear ${candidateData.firstName},

Thank you for your interest in the ${candidateData.position} position.

After careful consideration of your initial interview, we have decided not to proceed with your application for this particular role at this time.

We encourage you to:
- Continue developing your skills and experience
- Apply for future opportunities that match your profile
- Stay connected with us through our careers page
- Consider this as valuable interview experience

If you have any questions, please contact:
${senderInfo.name}
Email: ${senderInfo.email}

We wish you the best in your career journey!
  `;
};

const generateHireText = (candidateData, senderInfo, jobDetails) => {
  return `
Welcome to the Team, ${candidateData.firstName}!

Congratulations! We're excited to offer you the position of ${candidateData.position}.

Job Offer Details:
Position: ${candidateData.position}
${jobDetails.startDate ? `Start Date: ${jobDetails.startDate}` : ''}
${jobDetails.salary ? `Salary: ${jobDetails.salary}` : ''}
${jobDetails.benefits ? `Benefits: ${jobDetails.benefits}` : ''}

Response Required: Please respond to this offer within 5 business days.

Next Steps:
1. Review the complete offer package
2. Contact us if you have any questions about the offer
3. Confirm your acceptance by replying to this email
4. Complete any required paperwork and background checks
5. Prepare for your onboarding process

For any questions regarding this offer, please contact:
${senderInfo.name}
Email: ${senderInfo.email}

We're thrilled to have you join our team!
  `;
};

const generateRejectText = (candidateData, senderInfo) => {
  return `
Dear ${candidateData.firstName},

Thank you for your interest in the ${candidateData.position} position and the time you invested in our interview process.

After thorough consideration and evaluation of all candidates, we have decided to move forward with another candidate whose background more closely aligns with our current needs.

Stay Connected:
- Keep an eye on our careers page for future opportunities
- Consider applying for other roles that match your skills
- Connect with us on professional networks
- Continue building your professional experience

We'll keep your information on file for future opportunities that may be a better fit.

If you have any questions, please contact:
${senderInfo.name}
Email: ${senderInfo.email}

Thank you again for your interest, and we wish you success in your career journey!
  `;
};

module.exports = {
  checkEmailConnection,
  sendInterviewInvitation,
  testEmailDeliverability,
  createTransporter,
  sendPassInitialEmail,
  sendFailInitialEmail,
  sendHireEmail,
  sendRejectEmail
};
