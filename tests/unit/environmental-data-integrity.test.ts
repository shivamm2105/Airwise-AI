import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenMeteoProvider } from '../../server/src/providers/OpenMeteoProvider.js';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { AirQualityService } from '../../server/src/services/AirQualityService.js';
import { airQualityCache } from '../../server/src/services/CacheService.js';
import { AirQualityProvider } from '../../server/src/providers/AirQualityProvider.js';
import {
  calculateCPCBSubIndexPM10,
  calculateCPCBSubIndexPM25,
  calculateUSEPASubIndexPM25,
  isIndiaLocation
} from '../../shared/safetyRules.js';

describe('Environmental Data Integrity Unit Tests', () => {
  describe('Shared AQI & Breakpoint Calculations', () => {
    it('identifies Indian locations cleanly without duplicate heuristics', () => {
      expect(isIndiaLocation({ name: 'New Delhi', latitude: 28.61, longitude: 77.21 })).toBe(true);
      expect(isIndiaLocation({ name: 'Custom', country: 'India', latitude: 15, longitude: 75 })).toBe(true);
      expect(isIndiaLocation({ name: 'London', country: 'United Kingdom', latitude: 51.5, longitude: -0.12 })).toBe(false);
    });

    it('computes CPCB and US EPA sub-indices accurately and clamps negative values', () => {
      expect(calculateCPCBSubIndexPM25(30)).toBe(50);
      expect(calculateCPCBSubIndexPM25(60)).toBe(100);
      expect(calculateCPCBSubIndexPM25(-10)).toBe(0);
      expect(calculateCPCBSubIndexPM10(100)).toBe(100);
      expect(calculateUSEPASubIndexPM25(9.0)).toBe(50);
      expect(calculateUSEPASubIndexPM25(35.4)).toBe(100);
      expect(calculateUSEPASubIndexPM25(-5)).toBe(0);
    });
  });

  describe('DemoAirQualityProvider', () => {
    const demo = new DemoAirQualityProvider();

    it('returns compliant criteria pollutants without nulls in demo mode', async () => {
      const data = await demo.getAirQuality({ latitude: 28.6139, longitude: 77.209, name: 'New Delhi' });
      expect(data.isDemo).toBe(true);
      expect(data.aqi).toBeGreaterThan(0);
      expect(data.pollutants.pm2_5).toBeDefined();
      expect(data.pollutants.pm10).toBeDefined();
      expect(data.pollutants.co).toBeDefined();
      expect(data.hourlyForecast.length).toBe(24);
      expect(data.indexStandard).toBe('CPCB_AQI');
    });

    it('identifies international coordinates as US_AQI', async () => {
      const data = await demo.getAirQuality({ latitude: 51.5074, longitude: -0.1278, name: 'London', country: 'UK' });
      expect(data.indexStandard).toBe('US_AQI');
    });

    it('returns structured location search suggestions', async () => {
      const results = await demo.searchLocations('Delhi');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Delhi');
    });
  });

  describe('OpenMeteoProvider Resilience, Units & UTC Timestamps', () => {
    const provider = new OpenMeteoProvider();

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('instantiates cleanly with correct attribution', () => {
      expect(provider.name).toContain('Open-Meteo');
    });

    it('gracefully handles empty or very short geocoding searches', async () => {
      const empty = await provider.searchLocations('');
      const singleChar = await provider.searchLocations('a');
      expect(empty).toEqual([]);
      expect(singleChar).toEqual([]);
    });

    it('requests UTC GMT timezone, preserves missing/negative pollutants as null, and converts CO µg->mg', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-27T09:00:00.000Z'));

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            latitude: 28.61,
            longitude: 77.21,
            timezone: 'GMT',
            current: {
              time: '2026-11-27T09:00',
              pm2_5: 90,
              pm10: 150,
              carbon_monoxide: 1400,
              nitrogen_dioxide: null,
              sulphur_dioxide: -12,
              ozone: 45
            },
            hourly: {
              time: ['2026-11-27T09:00', '2026-11-27T10:00'],
              pm2_5: [90, 120],
              pm10: [150, 260],
              us_aqi: [170, 190]
            }
          }),
          { status: 200 }
        )
      );

      const data = await provider.getAirQuality({ latitude: 28.6139, longitude: 77.209, name: 'New Delhi' });

      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain('timezone=GMT');
      expect(data.observedAt).toBe('2026-11-27T09:00:00.000Z');
      expect(data.pollutants.co).toBe(1.4);
      expect(data.pollutants.no2).toBeNull();
      expect(data.pollutants.so2).toBeNull();
      expect(data.qualityMetadata.missingPollutants).toContain('NO2');
      expect(data.qualityMetadata.missingPollutants).toContain('SO2');
      expect(data.indexStandard).toBe('CPCB_AQI');
      expect(data.hourlyForecast[1].aqi).toBe(calculateCPCBSubIndexPM25(120));
    });

    it('throws informative error on upstream HTTP failure or timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })
      );
      await expect(
        provider.getAirQuality({ latitude: 51.5, longitude: -0.12, name: 'London' })
      ).rejects.toThrow(/HTTP 502/);

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
      await expect(
        provider.getAirQuality({ latitude: 51.5, longitude: -0.12, name: 'London' })
      ).rejects.toThrow(/Open-Meteo/);
    });
  });

  describe('AirQualityService Cache Expiry, Stale Fallback & Request Deduplication', () => {
    beforeEach(() => {
      airQualityCache.clear();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      airQualityCache.clear();
    });

    it('deduplicates concurrent requests for identical coordinates and serves stale cache when upstream fails', async () => {
      let fetchCalls = 0;
      const demo = new DemoAirQualityProvider();

      const flakyProvider: AirQualityProvider = {
        name: 'FlakyTestProvider',
        async getAirQuality(coords) {
          fetchCalls += 1;
          if (fetchCalls > 1) {
            throw new Error('Upstream network timeout');
          }
          const base = await demo.getAirQuality(coords);
          return base;
        },
        async searchLocations(q) {
          return demo.searchLocations(q);
        }
      };

      const service = new AirQualityService(flakyProvider);
      const coords = { latitude: 19.076, longitude: 72.8777, name: 'Mumbai' };

      // Fire 3 concurrent requests on cold cache -> must hit provider only ONCE
      const [r1, r2, r3] = await Promise.all([
        service.getAirQualityByCoordinates(coords),
        service.getAirQualityByCoordinates(coords),
        service.getAirQualityByCoordinates(coords)
      ]);

      expect(fetchCalls).toBe(1);
      expect(r1.isStale).toBe(false);
      expect(r2.location.name).toBe('Mumbai');
      expect(r3.aqi).toBe(r1.aqi);

      // Advance past 15-minute TTL -> cache expires, provider fails -> stale cache returned explicitly
      vi.advanceTimersByTime(16 * 60 * 1000);
      const staleRes = await service.getAirQualityByCoordinates(coords);
      expect(fetchCalls).toBe(2);
      expect(staleRes.isStale).toBe(true);
      expect(staleRes.qualityMetadata.notes).toMatch(/Stale cached data/);
    });
  });
});
