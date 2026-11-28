import { HouseholdPreferences } from './types.js';

export const DEFAULT_HOUSEHOLD_PREFERENCES: HouseholdPreferences = {
  householdSize: 3,
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
};

/**
 * Pure TypeScript helper (zero Zod runtime footprint for lightweight frontend bundles)
 * that merges partial updates cleanly onto existing or default HouseholdPreferences.
 */
export function mergeHouseholdPreferences(
  base: Partial<HouseholdPreferences> | null | undefined,
  overrides: Partial<HouseholdPreferences> = {}
): HouseholdPreferences {
  return {
    ...DEFAULT_HOUSEHOLD_PREFERENCES,
    ...(base || {}),
    ...overrides,
    indoorCombustionSources:
      overrides.indoorCombustionSources ??
      base?.indoorCombustionSources ??
      DEFAULT_HOUSEHOLD_PREFERENCES.indoorCombustionSources
  };
}
