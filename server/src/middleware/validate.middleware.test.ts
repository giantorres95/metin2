import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import { validate } from './validate.middleware';

function createApp() {
  const app = express();
  app.use(express.json());

  app.post(
    '/test',
    validate([
      body('email').notEmpty().withMessage('email is required'),
      body('password').notEmpty().withMessage('password is required'),
    ]),
    (_req, res) => {
      res.status(200).json({ ok: true });
    }
  );

  return app;
}

describe('validate middleware', () => {
  const app = createApp();

  it('should return 400 with missing fields listed', async () => {
    const res = await request(app).post('/test').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('email');
    expect(res.body.error.message).toContain('password');
  });

  it('should pass through when all fields are valid', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'a@b.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should list only the missing field', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('password');
    expect(res.body.error.message).not.toContain('email');
  });
});
