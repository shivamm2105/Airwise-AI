import { describe, it, expect } from 'vitest';
import { DemoAirQualityProvider } from '../../server/src/providers/DemoAirQualityProvider.js';
import { OpenMeteoProvider } from '../../server/src/providers/OpenMeteoProvider.js';

describe('Environmental Data Integrity Unit Tests', () => {
  describe('DemoAirQualityProvider', () => {
    const demo = new DemoAirQualityProvider();

    it('returns compliant criteria pollutants without nulls in demo mode', async () => {
      const data = await demo.getAirQuality({ latitude: 28.6139, longitude: 77.2090, name: 'New Delhi' });
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

  describe('OpenMeteoProvider Logic', () => {
    const provider = new OpenMeteoProvider();

    it('instantiates cleanly with correct attribution', () => {
      expect(provider.name).toContain('Open-Meteo');
    });

    it('gracefully handles empty or very short geocoding searches', async () => {
      const empty = await provider.searchLocations('');
      const singleChar = await provider.searchLocations('a');
      expect(empty).toEqual([]);
      expect(singleChar).toEqual([]);
    });
  });
});
