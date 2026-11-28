import { Router } from 'express';
import { getCurrentAirQuality, searchLocations } from '../controllers/airQualityController.js';
import { getDailyPlan, calculateImpact } from '../controllers/recommendationController.js';
import { handleChatMessage } from '../controllers/chatController.js';
import {
  getSavedActions,
  saveAction,
  toggleActionCompletion,
  deleteAction,
  clearAllActions,
  exportSummary,
  getPreferences,
  updatePreferences
} from '../controllers/savedActionsController.js';
import { apiRateLimiter, aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Health Check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    product: 'AirWise AI — Intelligent Urban Air Quality Assistant',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    provider: process.env.AIR_QUALITY_PROVIDER || 'open-meteo',
    genAIEnabled: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Air Quality Endpoints
router.get('/air-quality/current', apiRateLimiter, getCurrentAirQuality);
router.get('/air-quality/search', apiRateLimiter, searchLocations);

// Recommendation & Impact Endpoints
router.post('/recommendations/daily-plan', apiRateLimiter, getDailyPlan);
router.post('/recommendations/calculate-impact', apiRateLimiter, calculateImpact);

// GenAI Chat Assistant Endpoint
router.post('/chat', aiRateLimiter, handleChatMessage);

// Saved Actions & Preferences Endpoints (protected by apiRateLimiter)
router.get('/saved-actions', apiRateLimiter, getSavedActions);
router.post('/saved-actions', apiRateLimiter, saveAction);
router.delete('/saved-actions', apiRateLimiter, clearAllActions);
router.patch('/saved-actions/:id/toggle', apiRateLimiter, toggleActionCompletion);
router.delete('/saved-actions/:id', apiRateLimiter, deleteAction);
router.get('/saved-actions/export', apiRateLimiter, exportSummary);

router.get('/preferences', apiRateLimiter, getPreferences);
router.post('/preferences', apiRateLimiter, updatePreferences);

export default router;

