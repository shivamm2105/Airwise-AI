import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://air-quality-api.open-meteo.com',
        'https://geocoding-api.open-meteo.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ]
    }
  },
  crossOriginEmbedderPolicy: false
});

const allowedOrigin = process.env.CLIENT_ORIGIN;

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (e.g. mobile apps, curl, server-to-server, SSR)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow explicitly configured client origin
    if (allowedOrigin && origin === allowedOrigin) {
      return callback(null, true);
    }

    // 3. Allow localhost and 127.0.0.1 on any port during local development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // 4. Allow any Vercel production or preview deployment (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Reject other unauthorized origins safely without crashing
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
});

