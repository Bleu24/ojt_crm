const request = require('supertest');
const path = require('path');

jest.mock('../middleware/auth.middleware', () => (req, res, next) => {
  req.user = { role: 'unit_manager' };
  next();
});
jest.mock('../middleware/roles.middleware', () => () => (req, res, next) => next());

jest.mock('pdf-parse', () => jest.fn(async () => ({
  text: 'John Doe API 100 CC 5 Credit 50 Lapsed\nJane Smith API 80 CC 4 Credit 40'
})));

jest.mock('exceljs', () => {
  const worksheet = { columns: [], addRow: jest.fn() };
  return {
    Workbook: jest.fn(() => ({
      addWorksheet: jest.fn(() => worksheet),
      xlsx: { writeBuffer: jest.fn(() => Promise.resolve(Buffer.from('excel'))) }
    }))
  };
});
const app = require('../server');
const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});

describe('NAP Report API', () => {
  it('should upload and parse pdf', async () => {
    const res = await request(app)
      .post('/api/nap-report/upload')
      .attach('file', path.join(__dirname, 'files/sample.pdf'));

    expect(res.statusCode).not.toBe(500);
  });

  it('should export excel', async () => {
    await request(app)
      .post('/api/nap-report/upload')
      .attach('file', path.join(__dirname, 'files/sample.pdf'));

    const res = await request(app)
      .get('/api/nap-report/export?month=2024-01');

    expect(res.statusCode).not.toBe(404);
  });
});
