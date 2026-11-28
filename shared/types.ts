/**
 * AirWise AI — Shared Domain Types
 * Robust types for environmental data, safety constraints, recommendations, and user context.
 */

export type AQIStandard = 'US_AQI' | 'CPCB_AQI' | 'EU_AQI';

export type AQICategory =
  | 'GOOD'
  | 'MODERATE'
  | 'UNHEALTHY_SENSITIVE'
  | 'UNHEALTHY'
  | 'VERY_UNHEALTHY'
  | 'HAZARDOUS'
  | 'UNKNOWN';

export interface PollutantMeasurements {
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  co: number | null;
}

export interface HourlyForecastPoint {
  time: string;
  aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  category: AQICategory;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
  region?: string;
  country?: string;
  timezone?: string;
}

export interface DataQualityMetadata {
  isReliable: boolean;
  missingPollutants: string[];
  attribution: string;
  notes?: string;
}

export interface AirQualityData {
  location: LocationCoordinates;
  aqi: number | null;
  category: AQICategory;
  categoryLabel: string;
  healthImplications: string;
  indexStandard: AQIStandard;
  dominantPollutant: string | null;
  pollutants: PollutantMeasurements;
  hourlyForecast: HourlyForecastPoint[];
  provider: string;
  observedAt: string; // ISO 8601 string
  fetchedAt: string;  // ISO 8601 string
  isStale: boolean;
  isDemo: boolean;
  qualityMetadata: DataQualityMetadata;
}

export type CommuteMode =
  | 'walk'
  | 'bicycle'
  | 'public_transit'
  | 'carpool'
  | 'car_alone'
  | 'electric_vehicle'
  | 'work_from_home';

export type CookingType =
  | 'induction_electric'
  | 'gas_with_exhaust'
  | 'gas_unvented'
  | 'biomass_chulha';

export interface HouseholdPreferences {
  householdSize: number;
  hasChildren: boolean;
  hasElderly: boolean;
  hasRespiratorySensitivity: boolean;
  commuteMode: CommuteMode;
  commuteDistanceKm: number;
  homeType: 'apartment' | 'detached_house' | 'dense_tenement';
  ventilationType: 'natural_cross' | 'mechanical_hvac' | 'closed_windows';
  hasAirPurifier: boolean;
  purifierFilterType: 'HEPA' | 'carbon_only' | 'basic_mesh' | 'none';
  cookingType: CookingType;
  indoorCombustionSources: ('candles' | 'incense_agarbatti' | 'mosquito_coils' | 'tobacco_smoking')[];
  sustainabilityFocus: 'transport' | 'household_energy' | 'exposure_reduction' | 'community' | 'general';
}

export type RespiratorRecommendation =
  | 'NOT_NEEDED'
  | 'OPTIONAL_SENSITIVE'
  | 'RECOMMENDED_N95'
  | 'ESSENTIAL_N95_STRICT';

export interface SafetyEvaluation {
  severeSmogAlert: boolean;
  outdoorExerciseSafe: boolean;
  childrenOutdoorPlaySafe: boolean;
  respiratorTier: RespiratorRecommendation;
  respiratorGuidance: string;
  clothMaskWarning: string;
  ventilationDecision: {
    recommended: boolean;
    reason: string;
    safestWindowHours?: string;
  };
  airPurifierAdvice: {
    hepaRecommended: boolean;
    ozoneWarning: string;
    houseplantRealityCheck: string;
    diyFilterSafetyWarning: string;
  };
  urgentMedicalAdvisory: string;
  deterministicRulesApplied: string[];
}

export interface ImpactAssessment {
  personalExposureBenefit: {
    rating: 'Minimal' | 'Moderate' | 'Substantial' | 'Critical';
    explanation: string;
    pathways: string[];
    evidenceStatus: 'Established Environmental Health Principle' | 'Observational Evidence';
  };
  environmentalEmissionBenefit: {
    rating: 'None (Self-protection)' | 'Minor Personal Footprint' | 'Tangible Household Reduction' | 'Significant Clean Alternative';
    explanation: string;
    isCommunityScaled: boolean;
    estimatedKgCO2eAvoided?: number;
    methodology: string;
    uncertaintyNotice: string;
  };
}

export interface RecommendationActionItem {
  id: string;
  title: string;
  category: 'morning' | 'outdoor' | 'commute' | 'workplace_school' | 'indoor' | 'evening' | 'household_sustainability';
  timeframe: string;
  whatToDo: string;
  whyItMatters: string;
  steps: string[];
  expectedBenefit: string;
  impact: ImpactAssessment;
  confidence: 'High (Verified Guidelines)' | 'Medium (Adaptive Heuristic)' | 'Contextual AI';
  safetyVerified: boolean;
}

export interface AISynthesisResponse {
  summary: string;
  airQualityContext: {
    source: string;
    indexStandard: AQIStandard;
    observedAt: string;
    aqi: number | null;
    category: AQICategory;
  };
  safetyEvaluation: SafetyEvaluation;
  actions: RecommendationActionItem[];
  indoorGuidance: {
    ventilationTiming: string;
    hepaRecommendations: string;
    cookingExhaustGuidance: string;
    dustAndCleaningTips: string[];
    combustionAvoidance: string[];
    sensorNotice: string;
  };
  sustainableAlternatives: {
    transportOption: string;
    idlingAdvice: string;
    tripConsolidationTips: string;
    householdEnergyAction: string;
  };
  communityTips: string[];
  limitationsAndDisclaimers: string[];
}

export interface SavedActionRecord {
  id: string;
  actionId: string;
  title: string;
  category: string;
  savedAt: string;
  completed: boolean;
  completedAt?: string;
  locationName: string;
  aqiAtSave: number | null;
}

export interface ChatMessageResponse {
  response: string;
  usedModel: string;
  groundedInContext: boolean;
}

export interface ImpactCalculationResult {
  avoidedKgCO2e: number;
  avoidedGramsExhaustPM: number;
  methodology: string;
  assumptions: string;
  uncertaintyRange: string;
}

export interface ExportSummaryReport {
  title: string;
  generatedAt: string;
  statistics: {
    totalActionsSaved: number;
    actionsCompleted: number;
    completionRatePercentage: number;
  };
  householdPreferences: HouseholdPreferences | null;
  actionsList: SavedActionRecord[];
}
