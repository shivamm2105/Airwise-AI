import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

const EXPLICIT_PRODUCTION_ORIGINS = ['https://airwiseaibot.vercel.app'];

function getTrustedOrigins(): Set<string> {
  const origins = new Set<string>(EXPLICIT_PRODUCTION_ORIGINS);

  const configuredOrigin = process.env.CLIENT_ORIGIN;
  if (configuredOrigin) {
    for (const part of configuredOrigin.split(',')) {
      const trimmed = part.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  // Vercel automatically sets exact deployment URLs for production & preview branches
  for (const vercelHost of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ]) {
    if (vercelHost?.trim()) {
      const normalized = vercelHost.trim().replace(/^https?:\/\//, '');
      origins.add(`https://${normalized}`);
    }
  }

  return origins;
}

/**
 * Evaluates whether an incoming Origin header belongs to an explicitly trusted origin.
 * Never allows arbitrary wildcard *.vercel.app domains or unverified external origins.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const trustedOrigins = getTrustedOrigins();
  if (trustedOrigins.has(origin)) {
    return true;
  }

  // Allow localhost development servers only outside cloud Vercel production runtime
  const isCloudVercel = Boolean(process.env.VERCEL) && process.env.NODE_ENV === 'production';
  if (!isCloudVercel) {
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return true;
    }
  }

  return false;
}

export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://air-quality-api.open-meteo.com',
        'https://geocoding-api.open-meteo.com'
      ]
    }
  },
  crossOriginEmbedderPolicy: false
});

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
});
