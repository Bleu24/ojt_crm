const request = require('supertest');
const express = require('express');
const emailRoutes = require('../routes/email.routes');
const { sendPassInitialEmail, sendFailInitialEmail, sendHireEmail, sendRejectEmail } = require('../utils/email');

// Mock the email utility functions
jest.mock('../utils/email');
jest.mock('../models/Recruit.model');

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com'
  };
  next();
});

app.use('/api/email', emailRoutes);

describe('Email Controller - Recruitment Status Emails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/email/pass-initial', () => {
    it('should send pass initial email successfully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        position: 'Software Developer'
      };

      const mockEmailResult = {
        messageId: 'mock-message-id',
        accepted: ['john.doe@example.com'],
        rejected: []
      };

      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(mockRecruit);
      Recruit.findByIdAndUpdate.mockResolvedValue(mockRecruit);
      sendPassInitialEmail.mockResolvedValue(mockEmailResult);

      const response = await request(app)
        .post('/api/email/pass-initial')
        .send({
          recruitId: 'recruit-id',
          message: 'Congratulations on passing!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pass initial email sent successfully');
      expect(sendPassInitialEmail).toHaveBeenCalledWith(
        'john.doe@example.com',
        {
          firstName: 'John',
          lastName: 'Doe',
          position: 'Software Developer',
          email: 'john.doe@example.com'
        },
        {
          name: 'Test User',
          email: 'test@example.com'
        }
      );
    });

    it('should return error when recruitId is missing', async () => {
      const response = await request(app)
        .post('/api/email/pass-initial')
        .send({
          message: 'Missing recruit ID'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recruit ID is required');
    });

    it('should return error when recruit is not found', async () => {
      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/email/pass-initial')
        .send({
          recruitId: 'non-existent-id'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recruit not found');
    });
  });

  describe('POST /api/email/fail-initial', () => {
    it('should send fail initial email successfully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        position: 'Web Developer'
      };

      const mockEmailResult = {
        messageId: 'mock-message-id',
        accepted: ['jane.smith@example.com'],
        rejected: []
      };

      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(mockRecruit);
      Recruit.findByIdAndUpdate.mockResolvedValue(mockRecruit);
      sendFailInitialEmail.mockResolvedValue(mockEmailResult);

      const response = await request(app)
        .post('/api/email/fail-initial')
        .send({
          recruitId: 'recruit-id',
          message: 'Thank you for your time'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fail initial email sent successfully');
      expect(sendFailInitialEmail).toHaveBeenCalled();
    });
  });

  describe('POST /api/email/hire', () => {
    it('should send hire email successfully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        position: 'Senior Developer'
      };

      const mockEmailResult = {
        messageId: 'mock-message-id',
        accepted: ['alice.johnson@example.com'],
        rejected: []
      };

      const jobDetails = {
        startDate: '2025-09-01',
        salary: '$80,000',
        benefits: 'Health, Dental, 401k',
        workLocation: 'Remote',
        workArrangement: 'Full-time'
      };

      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(mockRecruit);
      Recruit.findByIdAndUpdate.mockResolvedValue(mockRecruit);
      sendHireEmail.mockResolvedValue(mockEmailResult);

      const response = await request(app)
        .post('/api/email/hire')
        .send({
          recruitId: 'recruit-id',
          jobDetails
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Hire email sent successfully');
      expect(sendHireEmail).toHaveBeenCalledWith(
        'alice.johnson@example.com',
        expect.any(Object),
        expect.any(Object),
        jobDetails
      );
    });
  });

  describe('POST /api/email/reject', () => {
    it('should send reject email successfully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob.wilson@example.com',
        position: 'Frontend Developer'
      };

      const mockEmailResult = {
        messageId: 'mock-message-id',
        accepted: ['bob.wilson@example.com'],
        rejected: []
      };

      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(mockRecruit);
      Recruit.findByIdAndUpdate.mockResolvedValue(mockRecruit);
      sendRejectEmail.mockResolvedValue(mockEmailResult);

      const response = await request(app)
        .post('/api/email/reject')
        .send({
          recruitId: 'recruit-id',
          message: 'Thank you for your interest'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reject email sent successfully');
      expect(sendRejectEmail).toHaveBeenCalled();
    });
  });

  describe('GET /api/email/history/:recruitId', () => {
    it('should get email history successfully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        lastEmailSent: 'pass_initial',
        lastEmailDate: new Date('2025-08-08'),
        status: 'active',
        initialInterviewStatus: 'passed',
        finalInterviewStatus: 'pending'
      };

      const Recruit = require('../models/Recruit.model');
      const mockSelect = jest.fn().mockResolvedValue(mockRecruit);
      Recruit.findById.mockReturnValue({ select: mockSelect });

      const response = await request(app)
        .get('/api/email/history/recruit-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.emailHistory).toEqual({
        candidateName: 'John Doe',
        email: 'john.doe@example.com',
        lastEmailSent: 'pass_initial',
        lastEmailDate: mockRecruit.lastEmailDate,
        currentStatus: 'active',
        initialInterviewStatus: 'passed',
        finalInterviewStatus: 'pending'
      });
    });

    it('should return error when recruit is not found for email history', async () => {
      const Recruit = require('../models/Recruit.model');
      const mockSelect = jest.fn().mockResolvedValue(null);
      Recruit.findById.mockReturnValue({ select: mockSelect });

      const response = await request(app)
        .get('/api/email/history/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recruit not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle email service errors gracefully', async () => {
      const mockRecruit = {
        _id: 'recruit-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        position: 'Software Developer'
      };

      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockResolvedValue(mockRecruit);
      sendPassInitialEmail.mockRejectedValue(new Error('SMTP connection failed'));

      const response = await request(app)
        .post('/api/email/pass-initial')
        .send({
          recruitId: 'recruit-id'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to send pass initial email');
    });

    it('should handle database errors', async () => {
      const Recruit = require('../models/Recruit.model');
      Recruit.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/email/hire')
        .send({
          recruitId: 'recruit-id'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to send hire email');
    });
  });
});
