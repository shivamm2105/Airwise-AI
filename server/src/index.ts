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

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
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

