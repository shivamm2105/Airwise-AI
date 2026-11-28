import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

const EXPLICIT_PRODUCTION_ORIGINS = ['https://airwiseaibot.vercel.app'];
const MUTATING_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getTrustedOrigins(): Set<string> {
  const origins = new Set<string>(EXPLICIT_PRODUCTION_ORIGINS);

  const isCloudVercel = Boolean(process.env.VERCEL) && process.env.NODE_ENV === 'production';
  const configuredOrigin = process.env.CLIENT_ORIGIN;
  if (configuredOrigin) {
    for (const part of configuredOrigin.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (isCloudVercel && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
        continue;
      }
      origins.add(trimmed);
    }
  }

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
      styleSrc: process.env.NODE_ENV === 'production' ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        'https://air-quality-api.open-meteo.com',
        'https://geocoding-api.open-meteo.com'
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"]
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
  credentials: false,
  maxAge: 86400
});

/**
 * Rejects state-changing requests sent from untrusted cross-origin browser contexts.
 */
export const blockUntrustedCrossOriginWrites: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && MUTATING_HTTP_METHODS.has(req.method) && !isOriginAllowed(origin)) {
    res.status(403).json({
      status: 403,
      error: 'Forbidden',
      message: 'Cross-origin request blocked by security policy.'
    });
    return;
  }
  next();
};
