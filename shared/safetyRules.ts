/**
 * AirWise AI — Deterministic Safety Engine & AQI Classifier
 * Evaluates verified environmental readings independently of GenAI.
 * Ensures health advisories follow official environmental health standards.
 */

import {
  AQICategory,
  AQIStandard,
  HouseholdPreferences,
  LocationCoordinates,
  PollutantMeasurements,
  RespiratorRecommendation,
  SafetyEvaluation
} from './types.js';

interface BreakpointSegment {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const US_EPA_PM25_BREAKPOINTS: readonly BreakpointSegment[] = [
  { cLow: 0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 500.4, iLow: 301, iHigh: 500 }
];

const CPCB_PM25_BREAKPOINTS: readonly BreakpointSegment[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 250, cHigh: 400, iLow: 401, iHigh: 500 }
];

const CPCB_PM10_BREAKPOINTS: readonly BreakpointSegment[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 430, cHigh: 500, iLow: 401, iHigh: 500 }
];

function interpolateSubIndex(concentration: number, segments: readonly BreakpointSegment[]): number {
  const clamped = Math.max(0, concentration);
  for (const seg of segments) {
    if (clamped <= seg.cHigh) {
      if (seg.cHigh === seg.cLow) return seg.iLow;
      const ratio = (clamped - seg.cLow) / (seg.cHigh - seg.cLow);
      return Math.round(seg.iLow + ratio * (seg.iHigh - seg.iLow));
    }
  }
  return 500;
}

/**
 * Calculates Indian CPCB NAQI sub-index for PM2.5 (µg/m³)
 */
export function calculateCPCBSubIndexPM25(pm25: number): number {
  return interpolateSubIndex(pm25, CPCB_PM25_BREAKPOINTS);
}

/**
 * Calculates Indian CPCB NAQI sub-index for PM10 (µg/m³)
 */
export function calculateCPCBSubIndexPM10(pm10: number): number {
  return interpolateSubIndex(pm10, CPCB_PM10_BREAKPOINTS);
}

/**
 * Calculates US EPA AQI sub-index for PM2.5 (µg/m³) using official 2024 breakpoints
 */
export function calculateUSEPASubIndexPM25(pm25: number): number {
  const truncated = Math.floor(Math.max(0, pm25) * 10) / 10;
  return interpolateSubIndex(truncated, US_EPA_PM25_BREAKPOINTS);
}

const INDIAN_CITY_HINTS = ['delhi', 'mumbai', 'bengaluru', 'bangalore', 'kolkata', 'chennai', 'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow'];

/**
 * Single authoritative detector determining whether coordinates/location apply CPCB NAQI standards.
 */
export function isIndiaLocation(
  coords: Pick<LocationCoordinates, 'name' | 'country' | 'latitude' | 'longitude'>
): boolean {
  const countryLower = coords.country?.trim().toLowerCase();
  if (countryLower === 'india' || countryLower === 'in') {
    return true;
  }

  const nameLower = (coords.name || '').toLowerCase();
  if (INDIAN_CITY_HINTS.some(hint => nameLower.includes(hint))) {
    return true;
  }

  return coords.latitude >= 8.0 && coords.latitude <= 37.0 && coords.longitude >= 68.0 && coords.longitude <= 97.5;
}

/**
 * Standard classification tables
 * US EPA AQI breakpoints:
 * 0-50: Good
 * 51-100: Moderate
 * 101-150: Unhealthy for Sensitive Groups
 * 151-200: Unhealthy
 * 201-300: Very Unhealthy
 * 301+: Hazardous
 *
 * Indian CPCB NAQI breakpoints:
 * 0-50: Good
 * 51-100: Satisfactory (maps to Good/Moderate)
 * 101-200: Moderate
 * 201-300: Poor (maps to Unhealthy)
 * 301-400: Very Poor (maps to Very Unhealthy)
 * 401-500: Severe (maps to Hazardous)
 */

export function classifyAQI(aqi: number | null, standard: AQIStandard = 'US_AQI'): {
  category: AQICategory;
  label: string;
  healthImplications: string;
} {
  if (aqi === null || aqi === undefined || isNaN(aqi) || !isFinite(aqi) || aqi < 0) {
    return {
      category: 'UNKNOWN',
      label: 'Data Unavailable',
      healthImplications: 'Air quality index value is not currently available for this location.'
    };
  }

  if (standard === 'CPCB_AQI') {
    if (aqi <= 50) {
      return {
        category: 'GOOD',
        label: 'Good (CPCB)',
        healthImplications: 'Minimal impact. Air quality is considered safe for outdoor activities.'
      };
    } else if (aqi <= 100) {
      return {
        category: 'GOOD',
        label: 'Satisfactory (CPCB)',
        healthImplications: 'Minor breathing discomfort to sensitive people possible.'
      };
    } else if (aqi <= 200) {
      return {
        category: 'MODERATE',
        label: 'Moderate (CPCB)',
        healthImplications: 'Breathing discomfort to people with lungs, asthma and heart diseases.'
      };
    } else if (aqi <= 300) {
      return {
        category: 'UNHEALTHY',
        label: 'Poor (CPCB)',
        healthImplications: 'Breathing discomfort to most people on prolonged exposure.'
      };
    } else if (aqi <= 400) {
      return {
        category: 'VERY_UNHEALTHY',
        label: 'Very Poor (CPCB)',
        healthImplications: 'Respiratory illness on prolonged exposure. Significant risk for vulnerable groups.'
      };
    } else {
      return {
        category: 'HAZARDOUS',
        label: 'Severe (CPCB)',
        healthImplications: 'Affects healthy people and seriously impacts those with existing diseases.'
      };
    }
  }

  // Default to US_AQI standard
  if (aqi <= 50) {
    return {
      category: 'GOOD',
      label: 'Good',
      healthImplications: 'Air quality is satisfactory, and air pollution poses little or no risk.'
    };
  } else if (aqi <= 100) {
    return {
      category: 'MODERATE',
      label: 'Moderate',
      healthImplications: 'Air quality is acceptable; however, there may be a risk for some people, particularly those unusually sensitive to air pollution.'
    };
  } else if (aqi <= 150) {
    return {
      category: 'UNHEALTHY_SENSITIVE',
      label: 'Unhealthy for Sensitive Groups',
      healthImplications: 'Members of sensitive groups (children, elderly, respiratory conditions) may experience health effects. General public is less likely to be affected.'
    };
  } else if (aqi <= 200) {
    return {
      category: 'UNHEALTHY',
      label: 'Unhealthy',
      healthImplications: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
    };
  } else if (aqi <= 300) {
    return {
      category: 'VERY_UNHEALTHY',
      label: 'Very Unhealthy',
      healthImplications: 'Health alert: The risk of health effects is increased for everyone.'
    };
  } else {
    return {
      category: 'HAZARDOUS',
      label: 'Hazardous',
      healthImplications: 'Health warning of emergency conditions: Everyone is more likely to be affected.'
    };
  }
}

/**
 * Deterministic safety rule evaluator
 * Strictly checks outdoor pollution thresholds before generating or displaying advice.
 */
export function evaluateSafetyRules(
  aqi: number | null,
  pollutants: PollutantMeasurements,
  preferences?: Partial<HouseholdPreferences>,
  standard: AQIStandard = 'US_AQI'
): SafetyEvaluation {
  const rulesApplied: string[] = [];
  const { category } = classifyAQI(aqi, standard);

  const hasSensitiveMembers = Boolean(
    preferences?.hasChildren ||
    preferences?.hasElderly ||
    preferences?.hasRespiratorySensitivity
  );

  // Check particulate matter severity independently of total AQI
  const pm25Val = pollutants.pm2_5;
  const highPM25 = pm25Val !== null && pm25Val >= 55.5; // US EPA Unhealthy threshold for PM2.5 in µg/m³
  const extremePM25 = pm25Val !== null && pm25Val >= 150.5; // Very Unhealthy / Hazardous threshold

  // 1. Smog alert determination
  const severeSmog = category === 'VERY_UNHEALTHY' || category === 'HAZARDOUS' || extremePM25;
  if (severeSmog) {
    rulesApplied.push('RULE_SEVERE_SMOG_ALERT');
  }

  // 2. Outdoor exercise safety
  let outdoorExerciseSafe = true;
  if (category === 'HAZARDOUS' || category === 'VERY_UNHEALTHY' || category === 'UNHEALTHY' || highPM25) {
    outdoorExerciseSafe = false;
    rulesApplied.push('RULE_OUTDOOR_EXERCISE_RESTRICTED');
  } else if (category === 'UNHEALTHY_SENSITIVE' && hasSensitiveMembers) {
    outdoorExerciseSafe = false;
    rulesApplied.push('RULE_SENSITIVE_OUTDOOR_EXERCISE_RESTRICTED');
  }

  // 3. Children outdoor play safety
  let childrenOutdoorPlaySafe = true;
  if (category === 'HAZARDOUS' || category === 'VERY_UNHEALTHY' || category === 'UNHEALTHY' || category === 'UNHEALTHY_SENSITIVE' || highPM25) {
    childrenOutdoorPlaySafe = false;
    rulesApplied.push('RULE_CHILDREN_OUTDOOR_PLAY_RESTRICTED');
  }

  // 4. Respirator recommendation tiers
  let respiratorTier: RespiratorRecommendation = 'NOT_NEEDED';
  let respiratorGuidance = 'No respiratory protection needed under current clean outdoor conditions.';

  if (category === 'HAZARDOUS' || extremePM25) {
    respiratorTier = 'ESSENTIAL_N95_STRICT';
    respiratorGuidance =
      'Hazardous pollution levels. Avoid all unnecessary outdoor exposure. If you must step outside, wear a properly fitted, certified particle-filtering respirator (N95, FFP2, or KN95). Ensure an airtight seal around the nose and chin.';
    rulesApplied.push('RULE_RESPIRATOR_ESSENTIAL');
  } else if (category === 'VERY_UNHEALTHY' || category === 'UNHEALTHY' || highPM25) {
    respiratorTier = 'RECOMMENDED_N95';
    respiratorGuidance =
      'Unhealthy air quality. A properly fitted N95/FFP2 respirator is recommended for outdoor commutes and errands to reduce fine particulate matter (PM2.5) inhalation.';
    rulesApplied.push('RULE_RESPIRATOR_RECOMMENDED');
  } else if (category === 'UNHEALTHY_SENSITIVE') {
    respiratorTier = 'OPTIONAL_SENSITIVE';
    respiratorGuidance =
      'Sensitive individuals (children, elderly, pregnant individuals, and people with respiratory or cardiac conditions) should consider wearing a fitted N95 respirator during extended outdoor stays.';
    rulesApplied.push('RULE_RESPIRATOR_SENSITIVE_ONLY');
  }

  // 5. Cloth mask reality warning
  const clothMaskWarning =
    'Important safety distinction: Ordinary cloth masks, surgical masks, bandanas, or scarves do NOT seal against the face and cannot reliably filter microscopic fine particulate matter (PM2.5). Use certified particle-filtering respirators (N95, FFP2, KF94) with a verified snug facial seal.';

  // 6. Ventilation decision based on actual outdoor conditions
  let ventilationRecommended = true;
  let ventilationReason = 'Outdoor air quality is currently safe for natural cross-ventilation.';

  if (category === 'HAZARDOUS' || category === 'VERY_UNHEALTHY' || category === 'UNHEALTHY') {
    ventilationRecommended = false;
    ventilationReason =
      'Keep windows and doors securely closed. Outdoor air contains elevated particulate pollution that will degrade indoor air quality if let in. Rely on recirculating indoor HEPA air cleaning.';
    rulesApplied.push('RULE_VENTILATION_WINDOW_CLOSED');
  } else if (category === 'UNHEALTHY_SENSITIVE') {
    ventilationRecommended = false;
    ventilationReason =
      'Limit open-window ventilation. If fresh air exchange is necessary, ventilate only briefly during hours when outdoor traffic and particulate concentrations are at their daily minimum (often early afternoon).';
    rulesApplied.push('RULE_VENTILATION_LIMITED');
  } else if (category === 'MODERATE') {
    ventilationReason =
      'Moderate outdoor air. Natural ventilation is acceptable, but sensitive individuals should monitor indoor comfort and consider closing windows during peak traffic hours.';
  }

  // 7. Indoor purifier & device guidance
  const ozoneWarning =
    'Do not use ozone generators or ionizing cleaners that produce ozone byproducts. Ozone is a lung irritant that damages respiratory tissue, exacerbates asthma, and does not safely remove fine particulate matter.';
  
  const houseplantRealityCheck =
    'Evidence clarification: While houseplants provide psychological benefits, scientific chamber studies confirm that houseplants cannot measurably lower fine particulate matter (PM2.5) or hazardous urban smog in living spaces. Do not rely on plants as a substitute for true mechanical HEPA filtration.';

  const diyFilterSafetyWarning =
    'If using DIY box-fan filtration (Corsi-Rosenthal box), use certified MERV-13 filters and ensure fan motors have thermal overload safety protection. Never leave makeshift electrical devices unattended or operate near flammable materials.';

  const urgentMedicalAdvisory =
    'AirWise AI provides environmental health education and general wellness guidance only. It does not provide medical diagnosis or individualized clinical treatment. If you or someone around you experiences severe shortness of breath, chest pain, wheezing, or persistent dizziness, seek immediate emergency medical care.';

  return {
    severeSmogAlert: severeSmog,
    outdoorExerciseSafe,
    childrenOutdoorPlaySafe,
    respiratorTier,
    respiratorGuidance,
    clothMaskWarning,
    ventilationDecision: {
      recommended: ventilationRecommended,
      reason: ventilationReason
    },
    airPurifierAdvice: {
      hepaRecommended: true,
      ozoneWarning,
      houseplantRealityCheck,
      diyFilterSafetyWarning
    },
    urgentMedicalAdvisory,
    deterministicRulesApplied: rulesApplied
  };
}

