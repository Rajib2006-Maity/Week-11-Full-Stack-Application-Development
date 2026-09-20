require('./setup');
const request = require('supertest');
const app = require('../src/server');

describe('Auth flow', () => {
  const user = { username: 'alice', email: 'alice@example.com', password: 'password123' };

  test('registers a new user and returns an access token + refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=/);
  });

  test('rejects registration with a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(user);

    const good = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(good.status).toBe(200);
    expect(good.body.accessToken).toBeDefined();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  test('blocks /api/auth/me without a token and allows it with one', async () => {
    const register = await request(app).post('/api/auth/register').send(user);
    const { accessToken } = register.body;

    const unauthorized = await request(app).get('/api/auth/me');
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(authorized.status).toBe(200);
    expect(authorized.body.user.username).toBe(user.username);
  });

  test('refresh-token cookie issues a new access token', async () => {
    const register = await request(app).post('/api/auth/register').send(user);
    const cookie = register.headers['set-cookie'];

    const refreshed = await request(app).post('/api/auth/refresh-token').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeDefined();
  });
});
