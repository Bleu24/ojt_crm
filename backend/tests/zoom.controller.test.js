const request = require('supertest');
const express = require('express');
const zoomController = require('../controllers/zoom.controller');

// Mock the zoom utility
jest.mock('../utils/zoom');
jest.mock('../models/Recruit.model');

const zoomUtils = require('../utils/zoom');
const Recruit = require('../models/Recruit.model');

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { 
    id: 'test-user-id', 
    name: 'Test User', 
    email: 'test@example.com' 
  };
  next();
};

// Setup routes with mocked auth
app.get('/test/zoom/status', mockAuth, zoomController.checkConnection);
app.post('/test/zoom/meetings', mockAuth, zoomController.createMeeting);
app.get('/test/zoom/meetings/:meetingId', mockAuth, zoomController.getMeeting);
app.patch('/test/zoom/meetings/:meetingId', mockAuth, zoomController.updateMeeting);
app.delete('/test/zoom/meetings/:meetingId', mockAuth, zoomController.deleteMeeting);
app.get('/test/zoom/meetings', mockAuth, zoomController.listMeetings);
app.post('/test/zoom/schedule-interview', mockAuth, zoomController.scheduleInterviewWithEmail);
app.patch('/test/zoom/recruit-meeting', mockAuth, zoomController.updateRecruitMeetingDetails);

describe('Zoom Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConnection', () => {
    // ✅ Correct case
    test('should return successful connection status', async () => {
      const mockConnectionResult = {
        status: 'connected',
        accountId: 'test-account',
        userEmail: 'test@zoom.com',
        userName: 'Test User',
        timestamp: '2024-12-25T10:00:00Z'
      };

      zoomUtils.checkZoomConnection.mockResolvedValue(mockConnectionResult);

      const response = await request(app)
        .get('/test/zoom/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Zoom API is operational',
        details: mockConnectionResult
      });
    });

    // ❌ Wrong case
    test('should return error when connection fails', async () => {
      zoomUtils.checkZoomConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/test/zoom/status');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Zoom API connection failed',
        details: 'Connection failed'
      });
    });
  });

  describe('createMeeting', () => {
    // ✅ Correct case
    test('should successfully create a meeting', async () => {
      const mockMeeting = {
        id: 123456789,
        meetingId: '123456789',
        topic: 'Test Meeting',
        joinUrl: 'https://zoom.us/j/123456789',
        startUrl: 'https://zoom.us/s/123456789',
        password: 'TEST123',
        startTime: '2024-12-25T10:00:00Z',
        duration: 60
      };

      zoomUtils.createZoomMeeting.mockResolvedValue(mockMeeting);

      const meetingData = {
        topic: 'Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 60,
        agenda: 'Test agenda'
      };

      const response = await request(app)
        .post('/test/zoom/meetings')
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Zoom meeting created successfully',
        meeting: mockMeeting
      });
      expect(zoomUtils.createZoomMeeting).toHaveBeenCalledWith(meetingData);
    });

    // ❌ Wrong cases
    test('should return error for missing required fields', async () => {
      const incompleteData = {
        topic: 'Test Meeting'
        // Missing start_time and duration
      };

      const response = await request(app)
        .post('/test/zoom/meetings')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Missing required fields: topic, start_time, and duration are required'
      });
    });

    test('should handle creation error', async () => {
      zoomUtils.createZoomMeeting.mockRejectedValue(new Error('Creation failed'));

      const meetingData = {
        topic: 'Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: 60
      };

      const response = await request(app)
        .post('/test/zoom/meetings')
        .send(meetingData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create Zoom meeting',
        details: 'Creation failed'
      });
    });

    // 🔍 Edge cases
    test('should handle string duration conversion', async () => {
      const mockMeeting = {
        id: 123456789,
        duration: 30
      };

      zoomUtils.createZoomMeeting.mockResolvedValue(mockMeeting);

      const meetingData = {
        topic: 'Test Meeting',
        start_time: '2024-12-25T10:00:00Z',
        duration: '30' // String duration
      };

      const response = await request(app)
        .post('/test/zoom/meetings')
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(zoomUtils.createZoomMeeting).toHaveBeenCalledWith({
        ...meetingData,
        duration: 30 // Should be converted to number
      });
    });
  });

  describe('getMeeting', () => {
    // ✅ Correct case
    test('should successfully get meeting details', async () => {
      const mockMeeting = {
        id: 123456789,
        meetingId: '123456789',
        topic: 'Test Meeting',
        joinUrl: 'https://zoom.us/j/123456789'
      };

      zoomUtils.getZoomMeeting.mockResolvedValue(mockMeeting);

      const response = await request(app)
        .get('/test/zoom/meetings/123456789');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Meeting details retrieved successfully',
        meeting: mockMeeting
      });
      expect(zoomUtils.getZoomMeeting).toHaveBeenCalledWith('123456789');
    });

    // ❌ Wrong case
    test('should return error when meeting not found', async () => {
      zoomUtils.getZoomMeeting.mockRejectedValue(new Error('Meeting not found'));

      const response = await request(app)
        .get('/test/zoom/meetings/999999999');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve meeting details',
        details: 'Meeting not found'
      });
    });
  });

  describe('scheduleInterviewWithEmail', () => {
    // ✅ Correct case
    test('should successfully schedule interview with email', async () => {
      const mockResult = {
        meeting: {
          id: 123456789,
          meetingId: '123456789',
          joinUrl: 'https://zoom.us/j/123456789',
          startUrl: 'https://zoom.us/s/123456789',
          password: 'TEST123',
          startTime: '2024-12-25T10:00:00Z',
          duration: 60,
          topic: 'Initial Interview - John Doe'
        },
        email: {
          sent: true,
          messageId: 'test-message-id',
          recipient: 'john@example.com'
        },
        success: true
      };

      zoomUtils.scheduleInterviewMeeting.mockResolvedValue(mockResult);

      const requestData = {
        recruitData: {
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          position: 'Software Developer'
        },
        interviewType: 'initial',
        startTime: '2024-12-25T10:00:00Z',
        duration: 60,
        senderName: 'HR Manager'
      };

      const response = await request(app)
        .post('/test/zoom/schedule-interview')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'initial interview scheduled and invitation sent successfully',
        ...mockResult
      });
    });

    // ❌ Wrong cases
    test('should return error for missing recruit data', async () => {
      const requestData = {
        startTime: '2024-12-25T10:00:00Z'
        // Missing recruitData
      };

      const response = await request(app)
        .post('/test/zoom/schedule-interview')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Recruit data with email and firstName is required'
      });
    });

    test('should return error for missing start time', async () => {
      const requestData = {
        recruitData: {
          email: 'john@example.com',
          firstName: 'John'
        }
        // Missing startTime
      };

      const response = await request(app)
        .post('/test/zoom/schedule-interview')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Start time is required'
      });
    });

    test('should return error for incomplete recruit data', async () => {
      const requestData = {
        recruitData: {
          email: 'john@example.com'
          // Missing firstName
        },
        startTime: '2024-12-25T10:00:00Z'
      };

      const response = await request(app)
        .post('/test/zoom/schedule-interview')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Recruit data with email and firstName is required'
      });
    });

    // 🔍 Edge cases
    test('should use default values for optional fields', async () => {
      const mockResult = {
        meeting: { id: 123456789 },
        email: { sent: true },
        success: true
      };

      zoomUtils.scheduleInterviewMeeting.mockResolvedValue(mockResult);

      const requestData = {
        recruitData: {
          email: 'john@example.com',
          firstName: 'John'
        },
        startTime: '2024-12-25T10:00:00Z'
        // Missing optional fields: interviewType, duration, senderName
      };

      const response = await request(app)
        .post('/test/zoom/schedule-interview')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(zoomUtils.scheduleInterviewMeeting).toHaveBeenCalledWith(
        requestData.recruitData,
        'initial', // Default interview type
        {
          startTime: requestData.startTime,
          duration: 60, // Default duration
          sender: {
            name: 'Test User', // From req.user
            email: 'test@example.com' // From req.user
          }
        }
      );
    });
  });

  describe('updateRecruitMeetingDetails', () => {
    // ✅ Correct case
    test('should successfully update recruit meeting details', async () => {
      const mockUpdatedRecruit = {
        _id: 'recruit-123',
        firstName: 'John',
        lastName: 'Doe',
        initialInterviewZoomMeetingId: '123456789',
        initialInterviewZoomJoinUrl: 'https://zoom.us/j/123456789',
        initialInterviewZoomStartUrl: 'https://zoom.us/s/123456789',
        initialInterviewZoomPassword: 'TEST123'
      };

      Recruit.findByIdAndUpdate.mockResolvedValue(mockUpdatedRecruit);

      const requestData = {
        recruitId: 'recruit-123',
        meetingDetails: {
          meetingId: '123456789',
          joinUrl: 'https://zoom.us/j/123456789',
          startUrl: 'https://zoom.us/s/123456789',
          password: 'TEST123'
        },
        interviewType: 'initial'
      };

      const response = await request(app)
        .patch('/test/zoom/recruit-meeting')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Recruit meeting details updated successfully',
        recruit: mockUpdatedRecruit
      });

      expect(Recruit.findByIdAndUpdate).toHaveBeenCalledWith(
        'recruit-123',
        {
          initialInterviewZoomMeetingId: '123456789',
          initialInterviewZoomJoinUrl: 'https://zoom.us/j/123456789',
          initialInterviewZoomStartUrl: 'https://zoom.us/s/123456789',
          initialInterviewZoomPassword: 'TEST123'
        },
        { new: true, runValidators: true }
      );
    });

    // ❌ Wrong cases
    test('should return error for missing recruit ID', async () => {
      const requestData = {
        meetingDetails: {
          meetingId: '123456789'
        }
        // Missing recruitId
      };

      const response = await request(app)
        .patch('/test/zoom/recruit-meeting')
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Recruit ID and meeting details are required'
      });
    });

    test('should return error when recruit not found', async () => {
      Recruit.findByIdAndUpdate.mockResolvedValue(null);

      const requestData = {
        recruitId: 'non-existent-id',
        meetingDetails: {
          meetingId: '123456789'
        }
      };

      const response = await request(app)
        .patch('/test/zoom/recruit-meeting')
        .send(requestData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Recruit not found'
      });
    });

    // 🔍 Edge case
    test('should handle final interview type', async () => {
      const mockUpdatedRecruit = {
        _id: 'recruit-123',
        finalInterviewZoomMeetingId: '123456789'
      };

      Recruit.findByIdAndUpdate.mockResolvedValue(mockUpdatedRecruit);

      const requestData = {
        recruitId: 'recruit-123',
        meetingDetails: {
          meetingId: '123456789',
          joinUrl: 'https://zoom.us/j/123456789',
          startUrl: 'https://zoom.us/s/123456789',
          password: 'TEST123'
        },
        interviewType: 'final'
      };

      const response = await request(app)
        .patch('/test/zoom/recruit-meeting')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(Recruit.findByIdAndUpdate).toHaveBeenCalledWith(
        'recruit-123',
        {
          finalInterviewZoomMeetingId: '123456789',
          finalInterviewZoomJoinUrl: 'https://zoom.us/j/123456789',
          finalInterviewZoomStartUrl: 'https://zoom.us/s/123456789',
          finalInterviewZoomPassword: 'TEST123'
        },
        { new: true, runValidators: true }
      );
    });
  });

  describe('deleteMeeting', () => {
    // ✅ Correct case
    test('should successfully delete meeting', async () => {
      const mockResult = {
        success: true,
        message: 'Meeting deleted successfully',
        meetingId: '123456789'
      };

      zoomUtils.deleteZoomMeeting.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete('/test/zoom/meetings/123456789');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Meeting deleted successfully',
        result: mockResult
      });
      expect(zoomUtils.deleteZoomMeeting).toHaveBeenCalledWith('123456789');
    });

    // ❌ Wrong case
    test('should return error when deletion fails', async () => {
      zoomUtils.deleteZoomMeeting.mockRejectedValue(new Error('Deletion failed'));

      const response = await request(app)
        .delete('/test/zoom/meetings/123456789');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to delete meeting',
        details: 'Deletion failed'
      });
    });
  });

  describe('listMeetings', () => {
    // ✅ Correct case
    test('should successfully list meetings', async () => {
      const mockMeetings = {
        meetings: [
          {
            id: 123456789,
            meetingId: '123456789',
            topic: 'Meeting 1',
            joinUrl: 'https://zoom.us/j/123456789'
          }
        ],
        page_count: 1,
        page_size: 30,
        total_records: 1
      };

      zoomUtils.listZoomMeetings.mockResolvedValue(mockMeetings);

      const response = await request(app)
        .get('/test/zoom/meetings');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Meetings retrieved successfully',
        ...mockMeetings
      });
      expect(zoomUtils.listZoomMeetings).toHaveBeenCalledWith('scheduled', 30);
    });

    // 🔍 Edge case
    test('should handle query parameters', async () => {
      const mockMeetings = {
        meetings: [],
        page_count: 0,
        page_size: 10,
        total_records: 0
      };

      zoomUtils.listZoomMeetings.mockResolvedValue(mockMeetings);

      const response = await request(app)
        .get('/test/zoom/meetings?type=live&page_size=10');

      expect(response.status).toBe(200);
      expect(zoomUtils.listZoomMeetings).toHaveBeenCalledWith('live', 10);
    });

    // ❌ Wrong case
    test('should return error when listing fails', async () => {
      zoomUtils.listZoomMeetings.mockRejectedValue(new Error('Listing failed'));

      const response = await request(app)
        .get('/test/zoom/meetings');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve meetings',
        details: 'Listing failed'
      });
    });
  });

  describe('updateMeeting', () => {
    // ✅ Correct case
    test('should successfully update meeting', async () => {
      const mockUpdatedMeeting = {
        id: 123456789,
        meetingId: '123456789',
        topic: 'Updated Meeting',
        duration: 90
      };

      zoomUtils.updateZoomMeeting.mockResolvedValue(mockUpdatedMeeting);

      const updateData = {
        topic: 'Updated Meeting',
        duration: 90
      };

      const response = await request(app)
        .patch('/test/zoom/meetings/123456789')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Meeting updated successfully',
        meeting: mockUpdatedMeeting
      });
      expect(zoomUtils.updateZoomMeeting).toHaveBeenCalledWith('123456789', updateData);
    });

    // ❌ Wrong case
    test('should return error when update fails', async () => {
      zoomUtils.updateZoomMeeting.mockRejectedValue(new Error('Update failed'));

      const updateData = {
        topic: 'Updated Meeting'
      };

      const response = await request(app)
        .patch('/test/zoom/meetings/123456789')
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update meeting',
        details: 'Update failed'
      });
    });
  });
});
