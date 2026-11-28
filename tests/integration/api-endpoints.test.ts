import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../server/src/index.js';
import { ProviderFactory } from '../../server/src/providers/ProviderFactory.js';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { airQualityService } from '../../server/src/services/AirQualityService.js';
import { storageService } from '../../server/src/services/StorageService.js';
import { isOriginAllowed } from '../../server/src/middleware/security.js';

describe('Server API Integration Tests', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.GEMINI_API_KEY;
    const demo = new DemoAirQualityProvider();
    ProviderFactory.getProvider = () => demo;
    airQualityService.setProvider(demo);
    storageService.clearAllActions();
  });

  afterAll(() => {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
    const testStore = path.resolve(process.cwd(), `server/data/airwise-test-store-${process.pid}.json`);
    if (fs.existsSync(testStore)) {
      fs.unlinkSync(testStore);
    }
  });

  describe('Security Controls (CORS, Headers, Validation & Error Sanitization)', () => {
    it('allows explicit trusted production origin and rejects untrusted third-party vercel origins', () => {
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('https://airwiseaibot.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://evil-attacker.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://phishing.example.com')).toBe(false);
    });

    it('rejects untrusted Origin headers cleanly without crashing server (no Access-Control-Allow-Origin)', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://untrusted-site.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('echoes Access-Control-Allow-Origin for trusted production deployment origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://airwiseaibot.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://airwiseaibot.vercel.app');
    });

    it('returns clean 400 error on malformed JSON request body without leaking stack traces', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{"message": broken json');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.stack).toBeUndefined();
    });
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
        .query({ lat: 28.6139, lon: 77.209, city: 'New Delhi' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('aqi');
      expect(res.body).toHaveProperty('category');
      expect(res.body).toHaveProperty('categoryLabel');
      expect(res.body).toHaveProperty('pollutants');
      expect(res.body.pollutants).toHaveProperty('pm2_5');
      expect(res.body).toHaveProperty('indexStandard');
      expect(res.body.isDemo).toBe(true);
    });

    it('returns air quality via city geocoding fallback and 404 when city is unknown', async () => {
      const cityRes = await request(app)
        .get('/api/air-quality/current')
        .query({ city: 'New Delhi' });
      expect(cityRes.status).toBe(200);
      expect(cityRes.body.location.name).toContain('Delhi');

      const unknownRes = await request(app)
        .get('/api/air-quality/current')
        .query({ city: 'NonExistentStationXYZ999' });
      expect(unknownRes.status).toBe(404);

      const searchRes = await request(app).get('/api/air-quality/search').query({ q: 'London' });
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.results[0].name).toBe('London');
    });

    it('returns 400 when missing both coordinates and city or providing non-numeric coordinates', async () => {
      const missingRes = await request(app).get('/api/air-quality/current');
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.error).toBe('Validation Error');

      const invalidCoords = await request(app)
        .get('/api/air-quality/current')
        .query({ lat: 'not-a-number', lon: 77.2 });
      expect(invalidCoords.status).toBe(400);
    });
  });

  describe('POST /api/recommendations/daily-plan', () => {
    it('generates a full evidence-aware action plan and accepts nullable region/country', async () => {
      const res = await request(app)
        .post('/api/recommendations/daily-plan')
        .send({
          latitude: 28.6139,
          longitude: 77.209,
          locationName: 'New Delhi',
          country: null,
          region: null,
          preferences: {
            householdSize: 4,
            hasChildren: true,
            commuteMode: 'public_transit'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions.length).toBeGreaterThan(0);
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
            longitude: 77.209,
            name: 'New Delhi'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('response');
      expect(res.body.groundedInContext).toBe(true);
      expect(res.body.response).toContain('Outdoor');
    });
  });

  describe('Saved Actions CRUD Endpoints & Route Validation', () => {
    let createdId: string;

    it('rejects invalid action ID route parameter with HTTP 400 and returns 404 for unknown valid IDs', async () => {
      const res = await request(app).patch('/api/saved-actions/bad$id!/toggle');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');

      const missingToggle = await request(app).patch('/api/saved-actions/missing_act_99/toggle');
      expect(missingToggle.status).toBe(404);

      const missingDel = await request(app).delete('/api/saved-actions/missing_act_99');
      expect(missingDel.status).toBe(404);
    });

    it('gets and saves household preferences via /api/preferences', async () => {
      const postRes = await request(app)
        .post('/api/preferences')
        .send({ householdSize: 4, hasChildren: true, commuteMode: 'public_transit', commuteDistanceKm: 12 });
      expect(postRes.status).toBe(200);
      expect(postRes.body.preferences.hasChildren).toBe(true);

      const getRes = await request(app).get('/api/preferences');
      expect(getRes.status).toBe(200);
      expect(getRes.body.preferences.householdSize).toBe(4);
    });

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

    it('clears all actions', async () => {
      await request(app)
        .post('/api/saved-actions')
        .send({
          actionId: 'test-act-clear',
          title: 'Temporary Action to be Cleared',
          category: 'indoor',
          locationName: 'London',
          aqiAtSave: 45
        });

      const clearRes = await request(app).delete('/api/saved-actions');
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.success).toBe(true);

      const listRes = await request(app).get('/api/saved-actions');
      expect(listRes.status).toBe(200);
      expect(listRes.body.actions.length).toBe(0);
    });
  });
});
