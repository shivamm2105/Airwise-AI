// @vitest-environment node
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

  const moderatePollutants: PollutantMeasurements = {
    pm2_5: 25.0,
    pm10: 60.0,
    no2: 30.0,
    so2: 10.0,
    o3: 40.0,
    co: 0.8
  };

  const hazardousPollutants: PollutantMeasurements = {
    pm2_5: 220.0,
    pm10: 380.0,
    no2: 85.0,
    so2: 30.0,
    o3: 25.0,
    co: 3.2
  };

  it('allows outdoor exercise and natural ventilation when AQI is Good', () => {
    const safety = evaluateSafetyRules(35, cleanPollutants);
    expect(safety.outdoorExerciseSafe).toBe(true);
    expect(safety.severeSmogAlert).toBe(false);
    expect(safety.respiratorTier).toBe('NOT_NEEDED');
    expect(safety.ventilationDecision.recommended).toBe(true);
  });

  it('provides Moderate ventilation advisory when AQI is Moderate', () => {
    const safety = evaluateSafetyRules(75, moderatePollutants);
    expect(safety.outdoorExerciseSafe).toBe(true);
    expect(safety.ventilationDecision.recommended).toBe(true);
    expect(safety.ventilationDecision.reason).toContain('Moderate outdoor air');
  });

  it('restricts outdoor exercise during Hazardous pollution and mandates N95', () => {
    const safety = evaluateSafetyRules(350, hazardousPollutants);
    expect(safety.outdoorExerciseSafe).toBe(false);
    expect(safety.severeSmogAlert).toBe(true);
    expect(safety.respiratorTier).toBe('ESSENTIAL_N95_STRICT');
    expect(safety.ventilationDecision.recommended).toBe(false);
    expect(safety.deterministicRulesApplied).toContain('RULE_SEVERE_SMOG_ALERT');
    expect(safety.deterministicRulesApplied).toContain('RULE_OUTDOOR_EXERCISE_RESTRICTED');
  });

  it('restricts outdoor exercise for sensitive households at AQI 125 and limits ventilation', () => {
    const sensitivePollutants: PollutantMeasurements = { ...moderatePollutants, pm2_5: 45.0 };
    const safety = evaluateSafetyRules(125, sensitivePollutants, {
      hasChildren: true,
      hasRespiratorySensitivity: true
    });

    expect(safety.outdoorExerciseSafe).toBe(false);
    expect(safety.childrenOutdoorPlaySafe).toBe(false);
    expect(safety.respiratorTier).toBe('OPTIONAL_SENSITIVE');
    expect(safety.ventilationDecision.recommended).toBe(false);
    expect(safety.deterministicRulesApplied).toContain('RULE_VENTILATION_LIMITED');
  });

  it('strictly warns against ozone generators, debunks houseplant myths, and notes cloth mask limits', () => {
    const safety = evaluateSafetyRules(250, hazardousPollutants);
    expect(safety.airPurifierAdvice.ozoneWarning).toContain('Do not use ozone generators');
    expect(safety.airPurifierAdvice.houseplantRealityCheck).toContain('houseplants cannot measurably lower');
    expect(safety.clothMaskWarning).toContain('Ordinary cloth masks, surgical masks, bandanas, or scarves do NOT seal');
    expect(safety.urgentMedicalAdvisory).toContain('AirWise AI provides environmental health education');
  });
});
