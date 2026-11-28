/**
 * AirWise AI — Deterministic Indoor Clean Air Zone Sizing & Hygiene Helpers
 */

import { CookingType } from './types.js';

export interface IndoorAirSizingResult {
  roomVolumeCuFt: number;
  recommendedCadrCfm: number;
  recommendedCadrM3PerHour: number;
  roomAreaSqM: number;
}

export const COOKING_TYPE_DESCRIPTIONS: Record<CookingType, string> = {
  induction_electric: 'Zero combustion byproducts',
  gas_with_exhaust: 'Generates NO2 & aerosols; vent externally',
  gas_unvented: 'Generates high NO2 and fine soot indoors',
  biomass_chulha: 'Critical smoke & PM2.5 hazard indoors'
};

export function isCookingType(value: string): value is CookingType {
  return value in COOKING_TYPE_DESCRIPTIONS;
}

/**
 * Calculates target HEPA Clear Air Delivery Rate (CADR) for 4 Air Changes per Hour (ACH)
 * assuming a standard 8-foot residential ceiling height.
 */
export function calculateIndoorAirSizing(roomSizeSqFt: number, ceilingHeightFt: number = 8): IndoorAirSizingResult {
  const safeArea = Number.isFinite(roomSizeSqFt) ? Math.min(2000, Math.max(50, roomSizeSqFt)) : 200;
  const safeHeight = Number.isFinite(ceilingHeightFt) ? Math.min(20, Math.max(6, ceilingHeightFt)) : 8;
  const roomVolumeCuFt = Math.round(safeArea * safeHeight);
  const recommendedCadrCfm = Math.round((roomVolumeCuFt * 4) / 60);

  return {
    roomVolumeCuFt,
    recommendedCadrCfm,
    recommendedCadrM3PerHour: Math.round(recommendedCadrCfm * 1.7),
    roomAreaSqM: Math.round(safeArea * 0.093)
  };
}
