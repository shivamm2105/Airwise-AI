import { describe, it, expect } from 'vitest';
import {
  calculateAvoidedTransportEmissions,
  getStandardImpact
} from '../../shared/impact.js';

describe('Direct Impact Engine Unit Tests', () => {
  describe('calculateAvoidedTransportEmissions', () => {
    it('calculates avoided emissions for 15 km transit mode switch', () => {
      const res = calculateAvoidedTransportEmissions({
        distanceKm: 15,
        originalMode: 'car_alone',
        alternativeMode: 'public_transit'
      });

      expect(res.avoidedKgCO2e).toBe(1.65); // 15 km * 110 g / 1000 = 1.65 kg
      expect(res.avoidedGramsExhaustPM).toBe(0.3); // 15 km * 0.02 = 0.30 g
      expect(res.methodology).toContain('standard passenger transport emission factors');
      expect(res.uncertaintyRange).toContain('±25%');
    });

    it('calculates 100% tailpipe avoidance for walking / active travel', () => {
      const res = calculateAvoidedTransportEmissions({
        distanceKm: 5,
        originalMode: 'car_alone',
        alternativeMode: 'bicycle'
      });

      expect(res.avoidedKgCO2e).toBe(0.85); // 5 km * 170 g / 1000 = 0.85 kg
      expect(res.avoidedGramsExhaustPM).toBe(0.15); // 5 * 0.03 = 0.15 g
    });
  });

  describe('getStandardImpact Personal vs Emission Dual Separation', () => {
    it('correctly categorizes N95 respirator as Personal Shield with Zero Emission Benefit', () => {
      const impact = getStandardImpact('wear_n95_respirator');
      expect(impact.personalExposureBenefit.rating).toBe('Substantial');
      expect(impact.environmentalEmissionBenefit.rating).toBe('None (Self-protection)');
      expect(impact.environmentalEmissionBenefit.explanation).toContain('Respirators are personal protective equipment (PPE)');
    });

    it('correctly categorizes HEPA purifier as Personal Exposure Shield', () => {
      const impact = getStandardImpact('use_hepa_purifier');
      expect(impact.personalExposureBenefit.rating).toBe('Substantial');
      expect(impact.personalExposureBenefit.explanation).toContain('True HEPA air filtration removes at least 99.97%');
    });

    it('correctly categorizes transit mode switch as tangible Emission Reduction', () => {
      const impact = getStandardImpact('switch_to_transit', 20);
      expect(impact.environmentalEmissionBenefit.rating).toBe('Significant Clean Alternative');
      expect(impact.environmentalEmissionBenefit.estimatedKgCO2eAvoided).toBeGreaterThan(0);
      expect(impact.environmentalEmissionBenefit.isCommunityScaled).toBe(true);
    });
  });
});

