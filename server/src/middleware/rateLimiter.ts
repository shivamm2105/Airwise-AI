import rateLimit from 'express-rate-limit';

// Standard API rate limiter: 100 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please wait a few minutes before refreshing environmental data.'
  }
});

// Stricter rate limiter for AI conversational queries: 30 requests per 15 minutes
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Assistant message rate limit reached. Please pause a moment before submitting your next question.'
  }
});
