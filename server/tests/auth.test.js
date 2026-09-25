/**
 * Auth controller smoke tests.
 * Uses supertest against the Express app with a mock MongoDB connection
 * so no live database is required.
 */
const request = require('supertest');

// ── Minimal mongoose mock ─────────────────────────────────────────────────────
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(1),
}));

jest.mock('../models/Session', () => ({
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  deleteOne: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/tokenService', () => ({
  sign: jest.fn().mockResolvedValue('test.jwt.token'),
  revoke: jest.fn().mockResolvedValue(undefined),
}));

const bcrypt = require('bcryptjs');
const app = require('../app');

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 400 when username or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/required/i);
  });

  it('returns 401 for unknown user', async () => {
    const User = require('../models/User');
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Invalid username or password');
  });

  it('returns 401 for wrong password', async () => {
    const User = require('../models/User');
    User.findOne.mockResolvedValue({ username: 'admin', role: 'admin', password_hash: await bcrypt.hash('correct', 10) });
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns access_token on valid credentials', async () => {
    const User = require('../models/User');
    User.findOne.mockResolvedValue({ _id: '1', username: 'admin', role: 'admin', password_hash: await bcrypt.hash('admin123', 10) });
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('role', 'admin');
  });
});

describe('POST /api/auth/sso', () => {
  it('returns 404 in production', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = await request(app).post('/api/auth/sso').send({});
    process.env.NODE_ENV = original;
    expect(res.status).toBe(404);
  });

  it('returns a token in non-production', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = await request(app).post('/api/auth/sso').send({});
    process.env.NODE_ENV = original;
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
  });
});

describe('Protected routes require auth', () => {
  it('returns 401 on /api/agents without token', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(401);
  });

  it('returns 401 on /api/metrics/command-centre without token', async () => {
    const res = await request(app).get('/api/metrics/command-centre');
    expect(res.status).toBe(401);
  });
});
