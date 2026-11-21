import { describe, it, expect } from 'vitest';
import { evaluateSafetyRules } from '../../shared/safetyRules.js';
import { PollutantMeasurements } from '../../shared/types.js';

describe('Safety Rules Engine Unit Tests', () => {
  const cleanPollutants: PollutantMeasurements = {
    pm2_5: 12.0,
    pm10: 25.0,
    no2: 15.0,
    so2: 5.0,
    o3: 35.0,
    co: 0.5
  };

  const hazardousPollutants: PollutantMeasurements = {
    pm2_5: 220.0,
    pm10: 380.0,
    no2: 85.0,
    so2: 30.0,
    o3: 25.0,
    co: 3.2
  };

  it('allows outdoor exercise when AQI is Good and PM2.5 is low', () => {
    const safety = evaluateSafetyRules(35, cleanPollutants);
    expect(safety.outdoorExerciseSafe).toBe(true);
    expect(safety.severeSmogAlert).toBe(false);
    expect(safety.respiratorTier).toBe('NOT_NEEDED');
    expect(safety.ventilationDecision.recommended).toBe(true);
  });

  it('restricts outdoor exercise during Hazardous pollution and requires N95', () => {
    const safety = evaluateSafetyRules(350, hazardousPollutants);
    expect(safety.outdoorExerciseSafe).toBe(false);
    expect(safety.severeSmogAlert).toBe(true);
    expect(safety.respiratorTier).toBe('ESSENTIAL_N95_STRICT');
    expect(safety.ventilationDecision.recommended).toBe(false);
    expect(safety.deterministicRulesApplied).toContain('RULE_SEVERE_SMOG_ALERT');
    expect(safety.deterministicRulesApplied).toContain('RULE_OUTDOOR_EXERCISE_RESTRICTED');
  });

  it('restricts outdoor exercise for sensitive households at AQI 125', () => {
    const moderatePollutants: PollutantMeasurements = {
      pm2_5: 45.0,
      pm10: 80.0,
      no2: 30.0,
      so2: 10.0,
      o3: 40.0,
      co: 0.8
    };

    const safety = evaluateSafetyRules(125, moderatePollutants, {
      hasChildren: true,
      hasRespiratorySensitivity: true
    });

    expect(safety.outdoorExerciseSafe).toBe(false);
    expect(safety.childrenOutdoorPlaySafe).toBe(false);
    expect(safety.respiratorTier).toBe('OPTIONAL_SENSITIVE');
  });

  it('strictly warns against ozone generators and debunking houseplant myths', () => {
    const safety = evaluateSafetyRules(250, hazardousPollutants);
    expect(safety.airPurifierAdvice.ozoneWarning).toContain('Do not use ozone generators');
    expect(safety.airPurifierAdvice.houseplantRealityCheck).toContain('houseplants cannot measurably lower fine particulate matter');
  });

  it('includes clear cloth mask limitation warning', () => {
    const safety = evaluateSafetyRules(180, hazardousPollutants);
    expect(safety.clothMaskWarning).toContain('Ordinary cloth masks, surgical masks, bandanas, or scarves do NOT seal');
  });

  it('always provides non-medical emergency disclaimer', () => {
    const safety = evaluateSafetyRules(35, cleanPollutants);
    expect(safety.urgentMedicalAdvisory).toContain('AirWise AI provides environmental health education and general wellness guidance only');
  });
});

