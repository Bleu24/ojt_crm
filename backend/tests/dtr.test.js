const request = require('supertest');
const app = require('../server'); // export your Express app in server.js
const mongoose = require('mongoose');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODVjYTM1ODU0YWZiNzZkZTFjZGRhNmIiLCJyb2xlIjoiaW50ZXJuIiwiaWF0IjoxNzUwOTAxNjMwLCJleHAiOjE3NTE1MDY0MzB9.YfeOX5lwz0oT13MVDCHIReKvfKNs1jqxUBSsTEAsIsQ';
const fakeToken = 'fakeToken';
describe('DTR API', () => {
  beforeAll(async () => {
    // optional: connect to a test DB or mock DB
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should reject time out if no time in exists', async () => {
    const res = await request(app)
      .patch('/api/dtr/timeout')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.statusCode).toBe(400);
  });

  it('should reject if insufficient permissions/credentials', async () => {
    const res = await request(app)
      .patch('/api/dtr/timeout')
      .set('Authorization', `Bearer ${fakeToken}`)
      .send();
      
    expect(res.status).toBe(403)
  });
});
