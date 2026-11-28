// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError, isAbortError, primeDefaultAirQuality } from '../../client/src/services/api';
import { ProviderFactory } from '../../server/src/providers/ProviderFactory.js';

describe('Client API Service & ProviderFactory Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    ProviderFactory.resetInstance();
  });

  describe('ProviderFactory', () => {
    it('returns DemoAirQualityProvider or OpenMeteoProvider cleanly and caches singleton instances', () => {
      ProviderFactory.resetInstance();
      const demo = ProviderFactory.getProvider('demo');
      expect(demo.name).toContain('Demo Mode');

      const om1 = ProviderFactory.getProvider();
      const om2 = ProviderFactory.getProvider();
      expect(om1).toBe(om2);
      expect(om1.name).toContain('Open-Meteo');
    });
  });

  describe('Client API Client (fetch wrapper & error propagation)', () => {
    it('supports air quality queries, search, daily plan, impact calc, chat, saved actions, and preferences', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({ aqi: 120 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ name: 'Delhi', latitude: 28.6, longitude: 77.2 }] }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ summary: 'Plan OK', actions: [] }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ avoidedKgCO2e: 1.5 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ response: 'Hi', usedModel: 'gemini', groundedInContext: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ actions: [] }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'a1' }), { status: 201 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'a1', completed: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Summary' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ preferences: null }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, preferences: { householdSize: 4 } }), { status: 200 }));

      await api.getAirQuality({ city: 'Delhi' });
      const searchRes = await api.searchLocations('Delhi');
      expect(searchRes.length).toBe(1);
      expect(await api.searchLocations('   ')).toEqual([]);

      await api.generateDailyPlan({ latitude: 28.6, longitude: 77.2, locationName: 'Delhi' });
      await api.calculateImpact({ distanceKm: 10, originalMode: 'car_alone', alternativeMode: 'carpool' });
      await api.sendChatMessage({ message: 'Hello' });
      await api.getSavedActions();
      await api.saveAction({ actionId: 'a', title: 'T', category: 'indoor', locationName: 'Delhi', aqiAtSave: 100 });
      await api.toggleActionCompletion('a/1');
      await api.deleteAction('a/1');
      await api.clearAllActions();
      await api.exportSummary();
      await api.getPreferences();
      const updatedPrefs = await api.updatePreferences({
        householdSize: 4,
        hasChildren: false,
        hasElderly: false,
        hasRespiratorySensitivity: false,
        commuteMode: 'public_transit',
        commuteDistanceKm: 10,
        homeType: 'apartment',
        ventilationType: 'natural_cross',
        hasAirPurifier: false,
        purifierFilterType: 'none',
        cookingType: 'gas_with_exhaust',
        indoorCombustionSources: [],
        sustainabilityFocus: 'general'
      });
      expect(updatedPrefs.householdSize).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(13);
      expect(String(fetchSpy.mock.calls[7][0])).toContain('a%2F1');
    });

    it('throws structured ApiError on non-OK HTTP, non-JSON error field, network error, and rethrows AbortError intact', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Validation failed' }), { status: 400 })
      );
      await expect(api.getAirQuality({ city: 'X' })).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Validation failed'
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Upstream Error' }), { status: 502 })
      );
      await expect(api.getAirQuality({ city: 'Y' })).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'Upstream Error'
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('not-json', { status: 503 }));
      await expect(api.getAirQuality({ city: 'Z' })).rejects.toMatchObject({
        name: 'ApiError',
        status: 503,
        message: 'Request failed with status 503'
      });

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(api.getSavedActions()).rejects.toBeInstanceOf(ApiError);

      const abortErr = new DOMException('Aborted', 'AbortError');
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortErr);
      try {
        await api.getPreferences();
      } catch (err) {
        expect(isAbortError(err)).toBe(true);
      }

      // Primed initial request is consumed once cleanly without duplicate network call
      const primeSpy = vi.spyOn(globalThis, 'fetch');
      primeSpy.mockClear();
      primeSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ aqi: 88, location: { name: 'Delhi' } }), { status: 200 })
      );
      primeDefaultAirQuality({ latitude: 28.6, longitude: 77.2, city: 'Delhi' });
      const primedData = await api.getAirQuality({ latitude: 28.6, longitude: 77.2, city: 'Delhi' });
      expect(primedData.aqi).toBe(88);
      expect(primeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
