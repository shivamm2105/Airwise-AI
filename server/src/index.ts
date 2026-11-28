import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.js';
import {
  helmetMiddleware,
  corsMiddleware,
  blockUntrustedCrossOriginWrites
} from './middleware/security.js';
import { staticRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Core Security & Compression Middleware
app.use(compression());
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(blockUntrustedCrossOriginWrites);
app.use(express.json({ limit: '200kb' }));

// API Routes
app.use('/api', apiRouter);

// Serve Client Static Files in Production (if built)
const distClientPath = path.resolve(process.cwd(), 'dist/client');
const legacyDistPath = path.resolve(process.cwd(), 'client/dist');
const staticPath = fs.existsSync(distClientPath)
  ? distClientPath
  : fs.existsSync(legacyDistPath)
  ? legacyDistPath
  : null;

// Robots.txt handler to ensure valid plain-text SEO response
app.get('/robots.txt', staticRateLimiter, (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send('User-agent: *\nAllow: /\nSitemap: https://airwiseaibot.vercel.app/sitemap.xml\n');
});

// Favicon handler to avoid 404/MIME-type errors
app.get('/favicon.ico', staticRateLimiter, (_req, res) => {
  const faviconSvgPath = staticPath ? path.join(staticPath, 'favicon.svg') : null;
  if (faviconSvgPath && fs.existsSync(faviconSvgPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(faviconSvgPath);
  } else {
    res.status(204).end();
  }
});

if (staticPath) {
  app.use(
    express.static(staticPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.svg') || filePath.endsWith('.webmanifest')) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    })
  );
  app.get('*', staticRateLimiter, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  app.get('/', staticRateLimiter, (_req, res) => {
    res.json({
      product: 'AirWise AI — Intelligent Urban Air Quality Assistant',
      status: 'API server active',
      endpoints: {
        health: '/api/health',
        currentAirQuality: '/api/air-quality/current?city=New%20Delhi',
        dailyPlan: '/api/recommendations/daily-plan',
        assistant: '/api/chat',
        savedActions: '/api/saved-actions'
      },
      note: 'Frontend client is running via Vite or can be compiled using "npm run build".'
    });
  });
}

// 404 Route Handler for unmatched API paths
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(
      `[AirWise Server] Listening on port ${PORT} | provider=${process.env.AIR_QUALITY_PROVIDER || 'open-meteo'} | genAI=${process.env.GEMINI_API_KEY ? 'active' : 'fallback'}`
    );
  });
}

export default app;
