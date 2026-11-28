import rateLimit from 'express-rate-limit';

function shouldSkipRateLimit(): boolean {
  return process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_IN_TEST !== 'true';
}

// Standard API rate limiter: 120 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please wait a few minutes before refreshing environmental data.'
  }
});

// Stricter rate limiter for AI conversational queries: 40 requests per 15 minutes
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Assistant message rate limit reached. Please pause a moment before submitting your next question.'
  }
});

// Static/SPA file-serving rate limiter: prevents file-system enumeration or excessive static serving
export const staticRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many document requests. Please try again shortly.'
  }
});
