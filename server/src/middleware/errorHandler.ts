import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function redactSecrets(message: string): string {
  return message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/AQ\.[0-9A-Za-z_-]{15,}/g, '[REDACTED_TOKEN]');
}

export const errorHandler: ErrorRequestHandler = (err: HttpError, req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof ZodError) {
    res.status(400).json({
      status: 400,
      error: 'Validation Error',
      message: 'Invalid request parameters or payload.',
      details: err.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  // Handle malformed JSON request bodies cleanly as 400 Bad Request
  const rawStatus =
    err instanceof SyntaxError && err.type === 'entity.parse.failed'
      ? 400
      : typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;

  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  let userFacingMessage = 'An unexpected server error occurred. Please try again.';

  if (status < 500) {
    userFacingMessage = status === 400 && err.type === 'entity.parse.failed'
      ? 'Malformed JSON payload.'
      : redactSecrets(err.message || userFacingMessage);
  } else if (isDev) {
    userFacingMessage = redactSecrets(err.message || userFacingMessage);
  }

  console.error(`[API Error] [${req.method} ${req.url}]:`, {
    status,
    message: redactSecrets(err.message || 'Unknown error'),
    ...(isDev && err.stack ? { stack: redactSecrets(err.stack) } : {})
  });

  res.status(status).json({
    status,
    error: status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Internal Server Error',
    message: userFacingMessage,
    timestamp: new Date().toISOString()
  });
};
