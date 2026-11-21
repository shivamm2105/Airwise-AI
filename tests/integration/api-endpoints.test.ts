import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.js';
import { ProviderFactory } from '../../server/src/providers/ProviderFactory.js';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { airQualityService } from '../../server/src/services/AirQualityService.js';

describe('Server API Integration Tests', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    // Use demo provider for reliable deterministic integration testing
    const demo = new DemoAirQualityProvider();
    ProviderFactory.getProvider = () => demo;
    airQualityService.setProvider(demo);
  });

  describe('GET /api/health', () => {
    it('returns healthy status with system metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.product).toContain('AirWise AI');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('GET /api/air-quality/current', () => {
    it('returns air quality reading for valid coordinates', async () => {
      const res = await request(app)
        .get('/api/air-quality/current')
        .query({ lat: 28.6139, lon: 77.2090, city: 'New Delhi' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('aqi');
      expect(res.body).toHaveProperty('category');
      expect(res.body).toHaveProperty('categoryLabel');
      expect(res.body).toHaveProperty('pollutants');
      expect(res.body.pollutants).toHaveProperty('pm2_5');
      expect(res.body).toHaveProperty('indexStandard');
      expect(res.body.isDemo).toBe(true);
    });

    it('returns 400 when missing both coordinates and city', async () => {
      const res = await request(app).get('/api/air-quality/current');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/recommendations/daily-plan', () => {
    it('generates a full evidence-aware action plan', async () => {
      const res = await request(app)
        .post('/api/recommendations/daily-plan')
        .send({
          latitude: 28.6139,
          longitude: 77.2090,
          locationName: 'New Delhi',
          country: 'India',
          preferences: {
            householdSize: 4,
            hasChildren: true,
            commuteMode: 'public_transit'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('actions');
      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('safetyEvaluation');
      expect(res.body.safetyEvaluation.urgentMedicalAdvisory).toBeDefined();
    });
  });

  describe('POST /api/recommendations/calculate-impact', () => {
    it('calculates avoided transport emissions accurately', async () => {
      const res = await request(app)
        .post('/api/recommendations/calculate-impact')
        .send({
          distanceKm: 20,
          originalMode: 'car_alone',
          alternativeMode: 'public_transit'
        });

      expect(res.status).toBe(200);
      expect(res.body.avoidedKgCO2e).toBe(2.2);
      expect(res.body.methodology).toBeDefined();
      expect(res.body.uncertaintyRange).toBeDefined();
    });
  });

  describe('POST /api/chat', () => {
    it('handles conversational queries with deterministic grounding fallback', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          message: 'Is it safe to run outdoors today?',
          location: {
            latitude: 28.6139,
            longitude: 77.2090,
            name: 'New Delhi'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('response');
      expect(res.body.groundedInContext).toBe(true);
      expect(res.body.response).toContain('Outdoor');
    });
  });

  describe('Saved Actions CRUD Endpoints', () => {
    let createdId: string;

    it('saves a new action item', async () => {
      const res = await request(app)
        .post('/api/saved-actions')
        .send({
          actionId: 'test-act-1',
          title: 'Equip N95 Respirator for Morning Commute',
          category: 'commute',
          locationName: 'New Delhi',
          aqiAtSave: 350
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.completed).toBe(false);
      createdId = res.body.id;
    });

    it('lists saved actions including the created item', async () => {
      const res = await request(app).get('/api/saved-actions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions.some((a: { id: string }) => a.id === createdId)).toBe(true);
    });

    it('toggles action completion status', async () => {
      const res = await request(app).patch(`/api/saved-actions/${createdId}/toggle`);
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.completedAt).toBeDefined();
    });

    it('exports a summary report', async () => {
      const res = await request(app).get('/api/saved-actions/export');
      expect(res.status).toBe(200);
      expect(res.body.title).toContain('AirWise AI');
      expect(res.body.statistics.totalActionsSaved).toBeGreaterThan(0);
    });

    it('deletes the created action', async () => {
      const res = await request(app).delete(`/api/saved-actions/${createdId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
