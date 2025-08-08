const { 
  checkEmailConnection, 
  sendInterviewInvitation, 
  testEmailDeliverability 
} = require('../utils/email');

// Mock nodemailer for testing
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn(),
    sendMail: jest.fn()
  }))
}));

const nodemailer = require('nodemailer');

describe('Email Utility Tests', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      verify: jest.fn(),
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        envelope: {
          from: 'test@example.com',
          to: ['test@example.com']
        }
      })
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Set up environment variables for testing
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'testpassword';
    process.env.EMAIL_DOMAIN = 'example.com';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEmailConnection', () => {
    // ✅ Correct case
    test('should successfully verify email connection', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await checkEmailConnection();

      expect(result).toHaveProperty('status', 'connected');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'Gmail');
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    // ❌ Wrong case
    test('should throw error when email connection fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      await expect(checkEmailConnection()).rejects.toThrow('Email service connection failed: Connection failed');
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    // 🔍 Edge case
    test('should handle undefined error message', async () => {
      mockTransporter.verify.mockRejectedValue({});

      await expect(checkEmailConnection()).rejects.toThrow('Email service connection failed: undefined');
    });
  });

  describe('sendInterviewInvitation', () => {
    const mockMeetingDetails = {
      id: 123456789,
      topic: 'Test Interview',
      joinUrl: 'https://zoom.us/j/123456789',
      startUrl: 'https://zoom.us/s/123456789',
      password: 'TEST123',
      startTime: '2024-12-25T10:00:00.000Z',
      duration: 60,
      meetingId: '123456789'
    };

    const mockSenderInfo = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    // ✅ Correct case
    test('should successfully send interview invitation', async () => {
      const mockEmailResult = {
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await sendInterviewInvitation(
        'test@example.com',
        mockMeetingDetails,
        mockSenderInfo,
        'Initial Interview'
      );

      expect(result).toHaveProperty('messageId', 'test-message-id');
      expect(result).toHaveProperty('accepted');
      expect(result).toHaveProperty('rejected');
      expect(result).toHaveProperty('response');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    // ❌ Wrong case - missing recipient email
    test('should handle missing recipient email gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('No recipients'));

      await expect(sendInterviewInvitation(
        '',
        mockMeetingDetails,
        mockSenderInfo
      )).rejects.toThrow('Failed to send interview invitation: No recipients');
    });

    // ❌ Wrong case - invalid meeting details
    test('should handle invalid meeting details', async () => {
      const invalidMeetingDetails = {
        ...mockMeetingDetails,
        startTime: 'invalid-date'
      };

      const result = await sendInterviewInvitation(
        'test@example.com',
        invalidMeetingDetails,
        mockSenderInfo
      );

      // Should still attempt to send email even with invalid date
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    // 🔍 Edge case - missing sender info
    test('should use default sender info when not provided', async () => {
      const mockEmailResult = {
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await sendInterviewInvitation(
        'test@example.com',
        mockMeetingDetails,
        {} // Empty sender info
      );

      expect(result).toHaveProperty('messageId');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      
      const sentMailOptions = mockTransporter.sendMail.mock.calls[0][0];
      const fromField = sentMailOptions.from;
      if (typeof fromField === 'string') {
        expect(fromField).toContain('HR Team');
      } else {
        expect(fromField.name).toContain('HR Team');
      }
    });

    // 🔍 Edge case - missing meeting password
    test('should handle missing meeting password', async () => {
      const meetingWithoutPassword = {
        ...mockMeetingDetails,
        password: undefined
      };
      
      const mockEmailResult = {
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await sendInterviewInvitation(
        'test@example.com',
        meetingWithoutPassword,
        mockSenderInfo
      );

      expect(result).toHaveProperty('messageId');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    // 🔍 Edge case - very long meeting topic
    test('should handle very long meeting topics', async () => {
      const longTopicMeeting = {
        ...mockMeetingDetails,
        topic: 'A'.repeat(500) // Very long topic
      };
      
      const mockEmailResult = {
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await sendInterviewInvitation(
        'test@example.com',
        longTopicMeeting,
        mockSenderInfo
      );

      expect(result).toHaveProperty('messageId');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('testEmailDeliverability', () => {
    // ✅ Correct case
    test('should test email deliverability successfully', async () => {
      const testEmails = ['test1@example.com', 'test2@example.com'];
      const mockEmailResult = {
        messageId: 'test-message-id',
        response: '250 OK'
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await testEmailDeliverability(testEmails);

      expect(result).toHaveProperty('totalTested', 2);
      expect(result).toHaveProperty('successful', 2);
      expect(result).toHaveProperty('failed', 0);
      expect(result.results).toHaveLength(2);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    // ❌ Wrong case - some emails fail
    test('should handle mixed success and failure', async () => {
      const testEmails = ['valid@example.com', 'invalid@example.com'];
      
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'success-id', response: '250 OK' })
        .mockRejectedValueOnce(new Error('Invalid email'));

      const result = await testEmailDeliverability(testEmails);

      expect(result).toHaveProperty('totalTested', 2);
      expect(result).toHaveProperty('successful', 1);
      expect(result).toHaveProperty('failed', 1);
      expect(result.results[0]).toHaveProperty('status', 'sent');
      expect(result.results[1]).toHaveProperty('status', 'failed');
    });

    // 🔍 Edge case - empty email array
    test('should handle empty email array', async () => {
      const result = await testEmailDeliverability([]);

      expect(result).toHaveProperty('totalTested', 0);
      expect(result).toHaveProperty('successful', 0);
      expect(result).toHaveProperty('failed', 0);
      expect(result.results).toHaveLength(0);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    // 🔍 Edge case - undefined email array
    test('should handle undefined email array', async () => {
      const result = await testEmailDeliverability();

      expect(result).toHaveProperty('totalTested', 0);
      expect(result).toHaveProperty('successful', 0);
      expect(result).toHaveProperty('failed', 0);
      expect(result.results).toHaveLength(0);
    });

    // ❌ Wrong case - transporter creation fails
    test('should throw error when transporter creation fails', async () => {
      nodemailer.createTransport.mockImplementation(() => {
        throw new Error('Transporter creation failed');
      });

      await expect(testEmailDeliverability(['test@example.com']))
        .rejects.toThrow('Email deliverability test failed: Transporter creation failed');
    });
  });

  describe('Integration Tests', () => {
    // 🔍 Edge case - missing environment variables
    test('should handle missing environment variables', async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      mockTransporter.verify.mockRejectedValue(new Error('Authentication failed'));

      await expect(checkEmailConnection())
        .rejects.toThrow('Email service connection failed: Authentication failed');
    });

    // ✅ Correct case - full workflow
    test('should handle complete email workflow', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'workflow-test-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      });

      // Check connection
      const connectionResult = await checkEmailConnection();
      expect(connectionResult.status).toBe('connected');

      // Send invitation
      const invitationResult = await sendInterviewInvitation(
        'test@example.com',
        {
          topic: 'Workflow Test',
          startTime: new Date().toISOString(),
          duration: 30,
          joinUrl: 'https://zoom.us/j/test',
          meetingId: 'test-id'
        },
        { name: 'Test User', email: 'user@example.com' }
      );
      expect(invitationResult.messageId).toBe('workflow-test-id');

      // Test deliverability
      const deliverabilityResult = await testEmailDeliverability(['test@example.com']);
      expect(deliverabilityResult.successful).toBe(1);
    });
  });
});
