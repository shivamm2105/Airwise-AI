import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://air-quality-api.open-meteo.com', 'https://geocoding-api.open-meteo.com']
    }
  },
  crossOriginEmbedderPolicy: false
});

const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or localhost in dev
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
});

