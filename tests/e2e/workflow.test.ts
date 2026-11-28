// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../server/src/index.js';
import { ProviderFactory } from '../../server/src/providers/ProviderFactory.js';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { airQualityService } from '../../server/src/services/AirQualityService.js';
import { storageService } from '../../server/src/services/StorageService.js';

describe('End-to-End User Journey Workflow Test', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.GEMINI_API_KEY;
    const demo = new DemoAirQualityProvider();
    ProviderFactory.getProvider = () => demo;
    airQualityService.setProvider(demo);
    await storageService.clearAllActions();
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

  it('executes full primary user journey: location -> environmental readings -> plan -> save -> complete -> export', async () => {
    // Step 1: Health check
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);

    // Step 2: Search for location
    const searchRes = await request(app).get('/api/air-quality/search').query({ q: 'Delhi' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.results.length).toBeGreaterThan(0);
    const chosenLocation = searchRes.body.results[0];

    // Step 3: Retrieve verified air-quality information
    const aqiRes = await request(app).get('/api/air-quality/current').query({
      lat: chosenLocation.latitude,
      lon: chosenLocation.longitude,
      city: chosenLocation.name
    });

    expect(aqiRes.status).toBe(200);
    expect(aqiRes.body.aqi).toBeDefined();
    expect(aqiRes.body.category).toBeDefined();
    expect(aqiRes.body.pollutants.pm2_5).toBeDefined();
    expect(aqiRes.body.provider).toContain('AirWise');
    expect(aqiRes.body.observedAt).toBeDefined();

    // Step 4: Generate evidence-grounded action plan with household preferences
    const planRes = await request(app)
      .post('/api/recommendations/daily-plan')
      .send({
        latitude: chosenLocation.latitude,
        longitude: chosenLocation.longitude,
        locationName: chosenLocation.name,
        country: chosenLocation.country,
        preferences: {
          householdSize: 4,
          hasChildren: true,
          hasRespiratorySensitivity: true,
          commuteMode: 'public_transit',
          commuteDistanceKm: 15
        }
      });

    expect(planRes.status).toBe(200);
    expect(planRes.body.actions.length).toBeGreaterThan(0);
    expect(planRes.body.safetyEvaluation.urgentMedicalAdvisory).toBeDefined();

    // Verify severe pollution safety restrictions applied
    if (aqiRes.body.aqi > 150) {
      expect(planRes.body.safetyEvaluation.outdoorExerciseSafe).toBe(false);
      expect(planRes.body.safetyEvaluation.respiratorTier).toMatch(/N95/);
    }

    const firstAction = planRes.body.actions[0];
    expect(firstAction.impact).toBeDefined();
    expect(firstAction.impact.personalExposureBenefit).toBeDefined();
    expect(firstAction.impact.environmentalEmissionBenefit).toBeDefined();

    // Step 5: Save a recommendation to persistence store
    const saveRes = await request(app)
      .post('/api/saved-actions')
      .send({
        actionId: firstAction.id,
        title: firstAction.title,
        category: firstAction.category,
        locationName: chosenLocation.name,
        aqiAtSave: aqiRes.body.aqi
      });

    expect(saveRes.status).toBe(201);
    const savedId = saveRes.body.id;
    expect(saveRes.body.completed).toBe(false);

    // Step 6: Mark action as completed
    const toggleRes = await request(app).patch(`/api/saved-actions/${savedId}/toggle`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.completed).toBe(true);

    // Step 7: Export complete summary report
    const exportRes = await request(app).get('/api/saved-actions/export');
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.statistics.actionsCompleted).toBeGreaterThan(0);
    expect(exportRes.body.actionsList.some((a: { id: string }) => a.id === savedId)).toBe(true);

    // Step 8: Verify invalid input handling
    const badReq = await request(app).get('/api/air-quality/current').query({ lat: 200, lon: 300 });
    expect(badReq.status).toBe(400);

    // Cleanup
    await request(app).delete(`/api/saved-actions/${savedId}`);
  });
});

