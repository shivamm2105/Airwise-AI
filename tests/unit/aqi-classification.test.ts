// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { classifyAQI } from '../../shared/safetyRules.js';

describe('AQI Classification Unit Tests', () => {
  describe('US EPA Standard Breakpoints', () => {
    it('classifies 0-50 as GOOD', () => {
      const res = classifyAQI(35, 'US_AQI');
      expect(res.category).toBe('GOOD');
      expect(res.label).toBe('Good');
    });

    it('classifies 51-100 as MODERATE', () => {
      const res = classifyAQI(78, 'US_AQI');
      expect(res.category).toBe('MODERATE');
      expect(res.label).toBe('Moderate');
    });

    it('classifies 101-150 as UNHEALTHY_SENSITIVE', () => {
      const res = classifyAQI(135, 'US_AQI');
      expect(res.category).toBe('UNHEALTHY_SENSITIVE');
      expect(res.label).toBe('Unhealthy for Sensitive Groups');
    });

    it('classifies 151-200 as UNHEALTHY', () => {
      const res = classifyAQI(185, 'US_AQI');
      expect(res.category).toBe('UNHEALTHY');
      expect(res.label).toBe('Unhealthy');
    });

    it('classifies 201-300 as VERY_UNHEALTHY', () => {
      const res = classifyAQI(255, 'US_AQI');
      expect(res.category).toBe('VERY_UNHEALTHY');
      expect(res.label).toBe('Very Unhealthy');
    });

    it('classifies 301+ as HAZARDOUS', () => {
      const res = classifyAQI(420, 'US_AQI');
      expect(res.category).toBe('HAZARDOUS');
      expect(res.label).toBe('Hazardous');
    });
  });

  describe('Indian CPCB NAQI Standard Breakpoints', () => {
    it('classifies 0-50 as Good (CPCB)', () => {
      const res = classifyAQI(40, 'CPCB_AQI');
      expect(res.category).toBe('GOOD');
      expect(res.label).toBe('Good (CPCB)');
    });

    it('classifies 51-100 as Satisfactory (CPCB)', () => {
      const res = classifyAQI(85, 'CPCB_AQI');
      expect(res.category).toBe('GOOD');
      expect(res.label).toBe('Satisfactory (CPCB)');
    });

    it('classifies 101-200 as Moderate (CPCB)', () => {
      const res = classifyAQI(160, 'CPCB_AQI');
      expect(res.category).toBe('MODERATE');
      expect(res.label).toBe('Moderate (CPCB)');
    });

    it('classifies 201-300 as Poor (CPCB)', () => {
      const res = classifyAQI(275, 'CPCB_AQI');
      expect(res.category).toBe('UNHEALTHY');
      expect(res.label).toBe('Poor (CPCB)');
    });

    it('classifies 301-400 as Very Poor (CPCB)', () => {
      const res = classifyAQI(365, 'CPCB_AQI');
      expect(res.category).toBe('VERY_UNHEALTHY');
      expect(res.label).toBe('Very Poor (CPCB)');
    });

    it('classifies 401+ as Severe (CPCB)', () => {
      const res = classifyAQI(450, 'CPCB_AQI');
      expect(res.category).toBe('HAZARDOUS');
      expect(res.label).toBe('Severe (CPCB)');
    });
  });

  describe('Exact Boundary & Edge Cases', () => {
    it('accurately differentiates US_AQI boundary thresholds (50, 51, 100, 101, 150, 151, 200, 201, 300, 301)', () => {
      expect(classifyAQI(0, 'US_AQI').category).toBe('GOOD');
      expect(classifyAQI(50, 'US_AQI').category).toBe('GOOD');
      expect(classifyAQI(51, 'US_AQI').category).toBe('MODERATE');
      expect(classifyAQI(100, 'US_AQI').category).toBe('MODERATE');
      expect(classifyAQI(101, 'US_AQI').category).toBe('UNHEALTHY_SENSITIVE');
      expect(classifyAQI(150, 'US_AQI').category).toBe('UNHEALTHY_SENSITIVE');
      expect(classifyAQI(151, 'US_AQI').category).toBe('UNHEALTHY');
      expect(classifyAQI(200, 'US_AQI').category).toBe('UNHEALTHY');
      expect(classifyAQI(201, 'US_AQI').category).toBe('VERY_UNHEALTHY');
      expect(classifyAQI(300, 'US_AQI').category).toBe('VERY_UNHEALTHY');
      expect(classifyAQI(301, 'US_AQI').category).toBe('HAZARDOUS');
    });

    it('accurately differentiates CPCB_AQI boundary thresholds (50, 100, 101, 200, 201, 300, 301, 400, 401)', () => {
      expect(classifyAQI(0, 'CPCB_AQI').label).toBe('Good (CPCB)');
      expect(classifyAQI(50, 'CPCB_AQI').label).toBe('Good (CPCB)');
      expect(classifyAQI(51, 'CPCB_AQI').label).toBe('Satisfactory (CPCB)');
      expect(classifyAQI(100, 'CPCB_AQI').label).toBe('Satisfactory (CPCB)');
      expect(classifyAQI(101, 'CPCB_AQI').category).toBe('MODERATE');
      expect(classifyAQI(200, 'CPCB_AQI').category).toBe('MODERATE');
      expect(classifyAQI(201, 'CPCB_AQI').category).toBe('UNHEALTHY');
      expect(classifyAQI(300, 'CPCB_AQI').category).toBe('UNHEALTHY');
      expect(classifyAQI(301, 'CPCB_AQI').category).toBe('VERY_UNHEALTHY');
      expect(classifyAQI(400, 'CPCB_AQI').category).toBe('VERY_UNHEALTHY');
      expect(classifyAQI(401, 'CPCB_AQI').category).toBe('HAZARDOUS');
    });

    it('handles null, NaN, Infinity, and negative AQI values gracefully as UNKNOWN', () => {
      expect(classifyAQI(null).category).toBe('UNKNOWN');
      expect(classifyAQI(NaN).category).toBe('UNKNOWN');
      expect(classifyAQI(Infinity).category).toBe('UNKNOWN');
      expect(classifyAQI(-5).category).toBe('UNKNOWN');
      expect(classifyAQI(-1, 'CPCB_AQI').label).toBe('Data Unavailable');
    });
  });
});

