import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: 'Troppe richieste, riprova più tardi', code: 'RATE_LIMITED' },
  },
});

export const createUserRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: 'Troppe richieste, riprova più tardi', code: 'RATE_LIMITED' },
  },
});
