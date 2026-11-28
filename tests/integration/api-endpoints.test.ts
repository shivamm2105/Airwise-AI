// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { app } from '../../server/src/index.js';
import { ProviderFactory } from '../../server/src/providers/ProviderFactory.js';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { airQualityService } from '../../server/src/services/AirQualityService.js';
import { storageService } from '../../server/src/services/StorageService.js';
import { isOriginAllowed } from '../../server/src/middleware/security.js';
import { errorHandler } from '../../server/src/middleware/errorHandler.js';
import { staticRateLimiter } from '../../server/src/middleware/rateLimiter.js';

describe('Server API Integration Tests', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.GEMINI_API_KEY;
    const demo = new DemoAirQualityProvider();
    ProviderFactory.getProvider = () => demo;
    airQualityService.setProvider(demo);
    await storageService.clearAllActions();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ENABLE_RATE_LIMIT_IN_TEST;
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

  describe('Security Controls, SEO Routes & Middleware', () => {
    it('allows explicit trusted production and Vercel hosts while rejecting untrusted origins and localhost on cloud prod', () => {
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('https://airwiseaibot.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://evil-attacker.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://phishing.example.com')).toBe(false);

      const prevVercel = process.env.VERCEL;
      const prevEnv = process.env.NODE_ENV;
      const prevVercelUrl = process.env.VERCEL_URL;
      process.env.VERCEL = '1';
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_URL = 'preview-airwise.vercel.app';
      expect(isOriginAllowed('https://preview-airwise.vercel.app')).toBe(true);
      expect(isOriginAllowed('http://localhost:5173')).toBe(false);
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      process.env.NODE_ENV = prevEnv;
      if (prevVercelUrl === undefined) delete process.env.VERCEL_URL;
      else process.env.VERCEL_URL = prevVercelUrl;
    });

    it('enforces CORS read protections and blocks untrusted cross-origin state-changing requests with 403', async () => {
      const getRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://untrusted-site.vercel.app');
      expect(getRes.status).toBe(200);
      expect(getRes.headers['access-control-allow-origin']).toBeUndefined();
      expect(getRes.headers['x-powered-by']).toBeUndefined();
      expect(getRes.headers['x-content-type-options']).toBe('nosniff');

      const postRes = await request(app)
        .post('/api/saved-actions')
        .set('Origin', 'https://untrusted-site.vercel.app')
        .send({ actionId: 'x', title: 'Test', category: 'indoor', locationName: 'Delhi', aqiAtSave: 100 });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error).toBe('Forbidden');
    });

    it('echoes Access-Control-Allow-Origin for trusted production deployment origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://airwiseaibot.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://airwiseaibot.vercel.app');
      expect(res.body.env).toBeUndefined();
    });

    it('serves SEO /robots.txt, handles /favicon.ico, and returns JSON 404 on unknown /api paths', async () => {
      const robotsRes = await request(app).get('/robots.txt');
      expect(robotsRes.status).toBe(200);
      expect(robotsRes.text).toContain('Sitemap: https://airwiseaibot.vercel.app/sitemap.xml');

      const favRes = await request(app).get('/favicon.ico');
      expect([200, 204]).toContain(favRes.status);

      const unknownApiRes = await request(app).get('/api/nonexistent-endpoint');
      expect(unknownApiRes.status).toBe(404);
      expect(unknownApiRes.body.error).toBe('Not Found');
    });

    it('returns clean 400 on malformed JSON and redacts leaked secrets inside 500 error responses', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const badJsonRes = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{"message": broken json');
      expect(badJsonRes.status).toBe(400);
      expect(badJsonRes.body.error).toBe('Bad Request');
      expect(badJsonRes.body.stack).toBeUndefined();

      const leakTestApp = express();
      const syntheticKey = ['AIza', 'SySecretLeakTestKeyValue12345678'].join('');
      leakTestApp.get('/boom', (_req, _res, next) => {
        next(new Error(`Upstream error with key ${syntheticKey}`));
      });
      leakTestApp.use(errorHandler);

      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodErrRes = await request(leakTestApp).get('/boom');
      expect(prodErrRes.status).toBe(500);
      expect(prodErrRes.body.message).toBe('An unexpected server error occurred. Please try again.');

      process.env.NODE_ENV = 'development';
      const devErrRes = await request(leakTestApp).get('/boom');
      expect(devErrRes.status).toBe(500);
      expect(devErrRes.body.message).toContain('[REDACTED_API_KEY]');
      expect(devErrRes.body.message).not.toContain(syntheticKey);
      process.env.NODE_ENV = prevEnv;
      expect(errSpy).toHaveBeenCalled();
    });

    it('exposes configured rate-limit headers when rate limiting is active', async () => {
      process.env.ENABLE_RATE_LIMIT_IN_TEST = 'true';
      const limitedApp = express();
      limitedApp.get('/ping', staticRateLimiter, (_req, res) => res.json({ ok: true }));
      const res = await request(limitedApp).get('/ping');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('GET /api/health & /api/air-quality/*', () => {
    it('returns healthy status with system metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBe('1.0.0');
    });

    it('returns air quality for coordinates or city fallback, 404 for unknown city, and 400 on invalid query', async () => {
      const coordRes = await request(app)
        .get('/api/air-quality/current')
        .query({ lat: 28.6139, lon: 77.209, city: 'New Delhi' });
      expect(coordRes.status).toBe(200);
      expect(coordRes.body.isDemo).toBe(true);

      const cityRes = await request(app).get('/api/air-quality/current').query({ city: 'New Delhi' });
      expect(cityRes.status).toBe(200);
      expect(cityRes.body.location.name).toContain('Delhi');

      const unknownRes = await request(app).get('/api/air-quality/current').query({ city: 'NonExistentStationXYZ999' });
      expect(unknownRes.status).toBe(404);

      const searchRes = await request(app).get('/api/air-quality/search').query({ q: 'London' });
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.results[0].name).toBe('London');

      const missingRes = await request(app).get('/api/air-quality/current');
      expect(missingRes.status).toBe(400);

      const invalidCoords = await request(app).get('/api/air-quality/current').query({ lat: 'not-a-number', lon: 77.2 });
      expect(invalidCoords.status).toBe(400);
    });
  });

  describe('Recommendations, Chat & Saved Actions CRUD Endpoints', () => {
    let createdId: string;

    it('generates daily plan, calculates impact, and responds to grounded chat', async () => {
      const planRes = await request(app)
        .post('/api/recommendations/daily-plan')
        .send({
          latitude: 28.6139,
          longitude: 77.209,
          locationName: 'New Delhi',
          country: null,
          region: null,
          preferences: { householdSize: 4, hasChildren: true, commuteMode: 'public_transit' }
        });
      expect(planRes.status).toBe(200);
      expect(planRes.body.actions.length).toBeGreaterThan(0);

      const impactRes = await request(app)
        .post('/api/recommendations/calculate-impact')
        .send({ distanceKm: 20, originalMode: 'car_alone', alternativeMode: 'public_transit' });
      expect(impactRes.status).toBe(200);
      expect(impactRes.body.avoidedKgCO2e).toBe(2.2);

      const chatRes = await request(app)
        .post('/api/chat')
        .send({
          message: 'Is it safe to run outdoors today?',
          location: { latitude: 28.6139, longitude: 77.209, name: 'New Delhi' }
        });
      expect(chatRes.status).toBe(200);
      expect(chatRes.body.groundedInContext).toBe(true);
    });

    it('handles saved actions CRUD, preferences, parameter validation 400s, and missing 404s', async () => {
      const badParam = await request(app).patch('/api/saved-actions/bad$id!/toggle');
      expect(badParam.status).toBe(400);

      expect((await request(app).patch('/api/saved-actions/missing_act_99/toggle')).status).toBe(404);
      expect((await request(app).delete('/api/saved-actions/missing_act_99')).status).toBe(404);

      const postPref = await request(app)
        .post('/api/preferences')
        .send({ householdSize: 4, hasChildren: true, commuteMode: 'public_transit', commuteDistanceKm: 12 });
      expect(postPref.status).toBe(200);
      expect((await request(app).get('/api/preferences')).body.preferences.householdSize).toBe(4);

      const saveRes = await request(app)
        .post('/api/saved-actions')
        .send({
          actionId: 'test-act-1',
          title: 'Equip N95 Respirator for Morning Commute',
          category: 'commute',
          locationName: 'New Delhi',
          aqiAtSave: 350
        });
      expect(saveRes.status).toBe(201);
      createdId = saveRes.body.id;

      const listRes = await request(app).get('/api/saved-actions');
      expect(listRes.body.actions.some((a: { id: string }) => a.id === createdId)).toBe(true);

      const toggleRes = await request(app).patch(`/api/saved-actions/${createdId}/toggle`);
      expect(toggleRes.body.completed).toBe(true);

      const exportRes = await request(app).get('/api/saved-actions/export');
      expect(exportRes.body.statistics.totalActionsSaved).toBeGreaterThan(0);

      expect((await request(app).delete(`/api/saved-actions/${createdId}`)).status).toBe(200);
      expect((await request(app).delete('/api/saved-actions')).status).toBe(200);
      expect((await request(app).get('/api/saved-actions')).body.actions.length).toBe(0);
    });
  });
});
