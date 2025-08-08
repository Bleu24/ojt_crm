const {
  generateZoomToken,
  checkZoomConnection,
  formatZoomDateTime,
  createZoomMeeting,
  updateZoomMeeting,
  getZoomMeeting,
  deleteZoomMeeting,
  listZoomMeetings,
  scheduleInterviewMeeting,
  generateMeetingPassword
} = require('../utils/zoom');

// Mock axios and jwt for testing
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('../utils/email');

const axios = require('axios');
const jwt = require('jsonwebtoken');
const emailUtils = require('../utils/email');

describe('Zoom Utility Tests', () => {
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.ZOOM_CLIENT_ID = 'test_client_id';
    process.env.ZOOM_CLIENT_SECRET = 'test_client_secret';
    process.env.ZOOM_ACCOUNT_ID = 'test_account_id';
    process.env.EMAIL_USER = 'test@example.com';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateZoomToken', () => {
    // ✅ Correct case
    test('should successfully generate Zoom token', async () => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValue({
        data: { access_token: 'mock_access_token' }
      });

      const token = await generateZoomToken();

      expect(token).toBe('mock_access_token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: 'test_client_id'
        }),
        'test_client_secret',
        { algorithm: 'HS256' }
      );
      expect(axios.post).toHaveBeenCalledWith(
        'https://zoom.us/oauth/token',
        null,
        expect.objectContaining({
          params: {
            grant_type: 'account_credentials',
            account_id: 'test_account_id'
          }
        })
      );
    });

    // ❌ Wrong case
    test('should throw error when token generation fails', async () => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      });

      await expect(generateZoomToken()).rejects.toThrow('Failed to generate Zoom token: Invalid credentials');
    });

    // 🔍 Edge case - missing response data
    test('should handle missing response data', async () => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockRejectedValue(new Error('Network error'));

      await expect(generateZoomToken()).rejects.toThrow('Failed to generate Zoom token: Network error');
    });
  });

  describe('checkZoomConnection', () => {
    // ✅ Correct case
    test('should successfully check Zoom connection', async () => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValue({
        data: { access_token: 'mock_access_token' }
      });
      axios.get.mockResolvedValue({
        data: {
          account_id: 'test_account',
          email: 'test@zoom.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      });

      const result = await checkZoomConnection();

      expect(result).toHaveProperty('status', 'connected');
      expect(result).toHaveProperty('accountId', 'test_account');
      expect(result).toHaveProperty('userEmail', 'test@zoom.com');
      expect(result).toHaveProperty('userName', 'John Doe');
      expect(result).toHaveProperty('timestamp');
    });

    // ❌ Wrong case
    test('should throw error when connection check fails', async () => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValue({
        data: { access_token: 'mock_access_token' }
      });
      axios.get.mockRejectedValue({
        response: { data: { message: 'Unauthorized' } }
      });

      await expect(checkZoomConnection()).rejects.toThrow('Zoom API connection failed: Unauthorized');
    });
  });

  describe('formatZoomDateTime', () => {
    // ✅ Correct cases
    test('should format date and time strings correctly', () => {
      const result = formatZoomDateTime('2024-12-25', '10:30');
      expect(result).toBe('2024-12-25T10:30:00.000Z');
    });

    test('should format Date object correctly', () => {
      const date = new Date('2024-12-25T10:30:00Z');
      const result = formatZoomDateTime(date);
      expect(result).toBe('2024-12-25T10:30:00.000Z');
    });

    test('should format ISO string correctly', () => {
      const result = formatZoomDateTime('2024-12-25T10:30:00Z');
      expect(result).toBe('2024-12-25T10:30:00.000Z');
    });

    // ❌ Wrong cases
    test('should throw error for invalid date format', () => {
      expect(() => formatZoomDateTime('invalid-date')).toThrow('Date formatting error');
    });

    test('should throw error for null/undefined input', () => {
      expect(() => formatZoomDateTime(null)).toThrow('Date formatting error');
      expect(() => formatZoomDateTime(undefined)).toThrow('Date formatting error');
    });

    // 🔍 Edge cases
    test('should handle edge date values', () => {
      // Test leap year
      const leapYear = formatZoomDateTime('2024-02-29', '12:00');
      expect(leapYear).toBe('2024-02-29T12:00:00.000Z');

      // Test year boundaries
      const newYear = formatZoomDateTime('2024-01-01', '00:00');
      expect(newYear).toBe('2024-01-01T00:00:00.000Z');

      const endYear = formatZoomDateTime('2024-12-31', '23:59');
      expect(endYear).toBe('2024-12-31T23:59:00.000Z');
    });
  });

  describe('createZoomMeeting', () => {
    beforeEach(() => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock_access_token' }
      });
    });

    // ✅ Correct case
    test('should successfully create Zoom meeting', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: 'Test Meeting',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: 'Test agenda',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const meetingData = {
        topic: 'Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 60,
        agenda: 'Test agenda'
      };

      const result = await createZoomMeeting(meetingData);

      expect(result).toHaveProperty('id', 123456789);
      expect(result).toHaveProperty('meetingId', '123456789');
      expect(result).toHaveProperty('topic', 'Test Meeting');
      expect(result).toHaveProperty('joinUrl');
      expect(result).toHaveProperty('startUrl');
      expect(result).toHaveProperty('password');
    });

    // ❌ Wrong cases
    test('should throw error for missing required fields', async () => {
      const incompleteMeetingData = {
        topic: 'Test Meeting'
        // Missing start_time and duration
      };

      await expect(createZoomMeeting(incompleteMeetingData))
        .rejects.toThrow('Missing required fields: topic, start_time, and duration are required');
    });

    test('should handle Zoom API error response', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Meeting limit exceeded' }
        }
      });

      const meetingData = {
        topic: 'Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 60
      };

      await expect(createZoomMeeting(meetingData))
        .rejects.toThrow('Zoom API Error: Meeting limit exceeded');
    });

    // 🔍 Edge cases
    test('should handle minimum duration meeting', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: 'Quick Meeting',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 1,
          timezone: 'UTC',
          agenda: '',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const meetingData = {
        topic: 'Quick Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 1 // Minimum duration
      };

      const result = await createZoomMeeting(meetingData);
      expect(result.duration).toBe(1);
    });

    test('should handle very long meeting topics', async () => {
      const longTopic = 'A'.repeat(200);
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: longTopic,
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: '',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const meetingData = {
        topic: longTopic,
        start_time: '2024-12-25T10:00:00Z',
        duration: 60
      };

      const result = await createZoomMeeting(meetingData);
      expect(result.topic).toBe(longTopic);
    });
  });

  describe('scheduleInterviewMeeting', () => {
    beforeEach(() => {
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValue({
        data: { access_token: 'mock_access_token' }
      });

      emailUtils.sendInterviewInvitation.mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 OK'
      });
    });

    // ✅ Correct case
    test('should successfully schedule interview meeting with email', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: 'Initial Interview - John Doe - Software Developer',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: 'Initial interview session',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const recruitData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        position: 'Software Developer'
      };

      const schedulerInfo = {
        startTime: '2024-12-25T10:00:00Z',
        duration: 60,
        sender: {
          name: 'HR Manager',
          email: 'hr@example.com'
        }
      };

      const result = await scheduleInterviewMeeting(recruitData, 'initial', schedulerInfo);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('meeting');
      expect(result).toHaveProperty('email');
      expect(result.meeting).toHaveProperty('joinUrl');
      expect(result.email).toHaveProperty('sent', true);
      expect(emailUtils.sendInterviewInvitation).toHaveBeenCalledTimes(1);
    });

    // ❌ Wrong cases
    test('should throw error for missing recruit data', async () => {
      await expect(scheduleInterviewMeeting(null, 'initial', {}))
        .rejects.toThrow('Recruit email and name are required');
    });

    test('should throw error for missing email', async () => {
      const recruitData = {
        firstName: 'John',
        lastName: 'Doe'
        // Missing email
      };

      await expect(scheduleInterviewMeeting(recruitData, 'initial', {}))
        .rejects.toThrow('Recruit email and name are required');
    });

    test('should throw error for missing firstName', async () => {
      const recruitData = {
        email: 'john.doe@example.com',
        lastName: 'Doe'
        // Missing firstName
      };

      await expect(scheduleInterviewMeeting(recruitData, 'initial', {}))
        .rejects.toThrow('Recruit email and name are required');
    });

    // 🔍 Edge cases
    test('should handle missing position in recruit data', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: 'Initial Interview - John Doe - Software Developer',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: 'Initial interview session',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const recruitData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
        // Missing position - should default to 'Software Developer'
      };

      const schedulerInfo = {
        startTime: '2024-12-25T10:00:00Z',
        duration: 60,
        sender: {
          name: 'HR Manager',
          email: 'hr@example.com'
        }
      };

      const result = await scheduleInterviewMeeting(recruitData, 'initial', schedulerInfo);

      expect(result.success).toBe(true);
      expect(result.meeting.topic).toContain('Software Developer'); // Default position
    });

    test('should handle final interview type', async () => {
      const mockMeetingResponse = {
        data: {
          id: 123456789,
          topic: 'Final Interview - John Doe - Software Developer',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: 'Final interview session',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      };

      axios.post.mockResolvedValueOnce(mockMeetingResponse);

      const recruitData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        position: 'Software Developer'
      };

      const schedulerInfo = {
        startTime: '2024-12-25T10:00:00Z',
        duration: 60,
        sender: {
          name: 'HR Manager',
          email: 'hr@example.com'
        }
      };

      const result = await scheduleInterviewMeeting(recruitData, 'final', schedulerInfo);

      expect(result.success).toBe(true);
      expect(result.meeting.topic).toContain('Final Interview');
      expect(emailUtils.sendInterviewInvitation).toHaveBeenCalledWith(
        'john.doe@example.com',
        expect.any(Object),
        schedulerInfo.sender,
        'Final Interview'
      );
    });
  });

  describe('generateMeetingPassword', () => {
    // ✅ Correct case
    test('should generate password with correct length', () => {
      const password = generateMeetingPassword();
      expect(password).toHaveLength(6);
    });

    test('should generate different passwords on multiple calls', () => {
      const password1 = generateMeetingPassword();
      const password2 = generateMeetingPassword();
      expect(password1).not.toBe(password2);
    });

    // 🔍 Edge case
    test('should generate password with valid characters only', () => {
      const password = generateMeetingPassword();
      const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/;
      expect(password).toMatch(validChars);
    });

    test('should not contain confusing characters', () => {
      const password = generateMeetingPassword();
      // Should not contain 0, O, 1, I, l
      expect(password).not.toMatch(/[0O1Il]/);
    });
  });

  describe('Integration Tests', () => {
    // 🔍 Edge case - missing environment variables
    test('should handle missing environment variables', async () => {
      delete process.env.ZOOM_CLIENT_ID;
      delete process.env.ZOOM_CLIENT_SECRET;
      delete process.env.ZOOM_ACCOUNT_ID;

      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockRejectedValue(new Error('Missing credentials'));

      await expect(generateZoomToken()).rejects.toThrow('Failed to generate Zoom token: Missing credentials');
    });

    // ✅ Correct case - full workflow
    test('should handle complete Zoom workflow', async () => {
      // Mock token generation
      jwt.sign.mockReturnValue('mock_jwt_token');
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock_access_token' }
      });

      // Mock connection check
      axios.get.mockResolvedValueOnce({
        data: {
          account_id: 'test_account',
          email: 'test@zoom.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      });

      // Mock meeting creation
      axios.post.mockResolvedValueOnce({
        data: {
          id: 123456789,
          topic: 'Workflow Test Meeting',
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          start_time: '2024-12-25T10:00:00Z',
          duration: 60,
          timezone: 'UTC',
          agenda: 'Test workflow',
          status: 'waiting',
          created_at: '2024-12-24T10:00:00Z'
        }
      });

      // Check connection
      const connectionResult = await checkZoomConnection();
      expect(connectionResult.status).toBe('connected');

      // Create meeting
      const meetingResult = await createZoomMeeting({
        topic: 'Workflow Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 60
      });
      expect(meetingResult.topic).toBe('Workflow Test Meeting');

      // Verify all API calls were made correctly
      expect(axios.post).toHaveBeenCalledTimes(2); // Token + meeting creation
      expect(axios.get).toHaveBeenCalledTimes(1); // Connection check
    });
  });
});
