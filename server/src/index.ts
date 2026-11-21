import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.js';
import { helmetMiddleware, corsMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Core Security & Middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '200kb' }));

// API Routes
app.use('/api', apiRouter);

// Serve Client Static Files in Production (if built)
const clientDistPath = path.resolve(process.cwd(), 'client/dist');
const altDistPath = path.resolve(process.cwd(), 'dist/client');
const staticPath = fs.existsSync(clientDistPath) ? clientDistPath : fs.existsSync(altDistPath) ? altDistPath : null;

// Favicon handler to avoid 404/MIME-type errors
app.get('/favicon.ico', (_req, res) => {
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
  app.use(express.static(staticPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        // Never cache HTML to allow instant hot deployment updates
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('.svg') || filePath.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // Informational fallback when running dev server without built assets
  app.get('/', (_req, res) => {
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

// Listen only when not running inside a test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AirWise AI Server is running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 Air Quality Provider: ${process.env.AIR_QUALITY_PROVIDER || 'open-meteo'}`);
    console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'} (${process.env.GEMINI_API_KEY ? 'Active' : 'Deterministic Fallback Mode'})`);
    console.log(`=======================================================`);
  });
}

export default app;

