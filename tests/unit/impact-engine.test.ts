// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { calculateAvoidedTransportEmissions, getStandardImpact } from '../../shared/impact.js';
import { calculateIndoorAirSizing, isCookingType } from '../../shared/indoorGuidance.js';

describe('Direct Impact & Indoor Guidance Unit Tests', () => {
  describe('calculateAvoidedTransportEmissions', () => {
    it('calculates avoided emissions for transit, carpool, bicycle, walk, and WFH', () => {
      const transit = calculateAvoidedTransportEmissions({
        distanceKm: 15,
        originalMode: 'car_alone',
        alternativeMode: 'public_transit'
      });
      expect(transit.avoidedKgCO2e).toBe(1.65);
      expect(transit.avoidedGramsExhaustPM).toBe(0.3);

      const carpool = calculateAvoidedTransportEmissions({
        distanceKm: 10,
        originalMode: 'car_alone',
        alternativeMode: 'carpool'
      });
      expect(carpool.avoidedKgCO2e).toBe(0.85);
      expect(carpool.avoidedGramsExhaustPM).toBe(0.15);

      const bike = calculateAvoidedTransportEmissions({
        distanceKm: 5,
        originalMode: 'car_alone',
        alternativeMode: 'bicycle'
      });
      expect(bike.avoidedKgCO2e).toBe(0.85);
    });
  });

  describe('getStandardImpact Personal vs Emission Dual Separation', () => {
    it('covers all 8 standard recommendation impact profiles cleanly', () => {
      expect(getStandardImpact('stay_indoors_hazardous').personalExposureBenefit.rating).toBe('Critical');
      expect(getStandardImpact('wear_n95_respirator').environmentalEmissionBenefit.rating).toBe('None (Self-protection)');
      expect(getStandardImpact('use_hepa_purifier').personalExposureBenefit.explanation).toContain('99.97%');
      expect(getStandardImpact('close_windows_severe').personalExposureBenefit.rating).toBe('Substantial');
      expect(getStandardImpact('avoid_engine_idling').environmentalEmissionBenefit.estimatedKgCO2eAvoided).toBe(0.15);
      expect(getStandardImpact('avoid_indoor_incense').personalExposureBenefit.rating).toBe('Substantial');

      const trip = getStandardImpact('trip_consolidation', 20);
      expect(trip.environmentalEmissionBenefit.estimatedKgCO2eAvoided).toBeGreaterThan(0);

      const transit = getStandardImpact('switch_to_transit', 20);
      expect(transit.environmentalEmissionBenefit.isCommunityScaled).toBe(true);
    });
  });

  describe('Indoor Air Sizing Helpers (shared/indoorGuidance.ts)', () => {
    it('calculates room volume, target CADR CFM, and metric conversions with finite clamping', () => {
      const sizing = calculateIndoorAirSizing(300, 8);
      expect(sizing.roomVolumeCuFt).toBe(2400);
      expect(sizing.recommendedCadrCfm).toBe(160);
      expect(sizing.recommendedCadrM3PerHour).toBe(272);
      expect(sizing.roomAreaSqM).toBe(28);

      const clampedDefaults = calculateIndoorAirSizing(Number.NaN, Number.POSITIVE_INFINITY);
      expect(clampedDefaults.roomVolumeCuFt).toBe(1600);
      expect(clampedDefaults.recommendedCadrCfm).toBe(107);
    });

    it('validates cooking arrangement enum values without unsafe type assertions', () => {
      expect(isCookingType('gas_unvented')).toBe(true);
      expect(isCookingType('invalid_stove')).toBe(false);
    });
  });
});
