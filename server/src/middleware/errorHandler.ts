import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof ZodError) {
    res.status(400).json({
      status: 400,
      error: 'Validation Error',
      message: 'Invalid request parameters or payload.',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
    return;
  }

  // Sanitize internal error messages to prevent credential or file system path leakage
  const status = typeof err.status === 'number' ? err.status : 500;
  let userFacingMessage = 'An unexpected server error occurred. Please try again.';

  if (status < 500) {
    userFacingMessage = err.message || userFacingMessage;
  } else if (isDev) {
    userFacingMessage = err.message || userFacingMessage;
  }

  // Safe logging in server console without revealing secret tokens
  console.error(`[API Error] [${req.method} ${req.url}]:`, {
    status,
    message: err.message,
    ...(isDev && { stack: err.stack })
  });

  res.status(status).json({
    status,
    error: status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Internal Server Error',
    message: userFacingMessage,
    timestamp: new Date().toISOString()
  });
};

