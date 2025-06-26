const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const bcrypt = require('bcrypt');

let testUser;

beforeAll(async () => {
  // Create a real user in the DB
  const password = 'validpassword';
  const passwordHash = await bcrypt.hash(password, 10);

  testUser = new User({
    name: 'Jest Tester',
    email: 'jest@example.com',
    role: 'intern',
    passwordHash,
  });

  await testUser.save();
});

afterAll(async () => {
  // Clean up test user and close DB
  await User.deleteOne({ email: 'jest@example.com' });
  await mongoose.connection.close();
});

describe('Auth Routes', () => {
  it('should fail login with invalid user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('User not found');
  });

  it('should succeed login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hrpaolotorio@gmail.com', password: 'vapegodz' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBeDefined(); // JWT token should be returned
  });
});
