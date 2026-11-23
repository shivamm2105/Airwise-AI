import { z } from 'zod';

export const LocationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().min(1).max(120),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional()
});

export const LocationQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  city: z.string().min(1).max(120).optional()
}).refine(data => (data.latitude !== undefined && data.longitude !== undefined) || data.city !== undefined, {
  message: 'Must provide either latitude & longitude or city name.'
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(100)
});

export const CommuteModeSchema = z.enum([
  'walk',
  'bicycle',
  'public_transit',
  'carpool',
  'car_alone',
  'electric_vehicle',
  'work_from_home'
]);

export const HouseholdPreferencesSchema = z.object({
  householdSize: z.number().int().min(1).max(20).default(3),
  hasChildren: z.boolean().default(false),
  hasElderly: z.boolean().default(false),
  hasRespiratorySensitivity: z.boolean().default(false),
  commuteMode: CommuteModeSchema.default('public_transit'),
  commuteDistanceKm: z.number().min(0).max(200).default(10),
  homeType: z.enum(['apartment', 'detached_house', 'dense_tenement']).default('apartment'),
  ventilationType: z.enum(['natural_cross', 'mechanical_hvac', 'closed_windows']).default('natural_cross'),
  hasAirPurifier: z.boolean().default(false),
  purifierFilterType: z.enum(['HEPA', 'carbon_only', 'basic_mesh', 'none']).default('none'),
  cookingType: z.enum(['induction_electric', 'gas_with_exhaust', 'gas_unvented', 'biomass_chulha']).default('gas_with_exhaust'),
  indoorCombustionSources: z.array(z.enum(['candles', 'incense_agarbatti', 'mosquito_coils', 'tobacco_smoking'])).default([]),
  sustainabilityFocus: z.enum(['transport', 'household_energy', 'exposure_reduction', 'community', 'general']).default('general')
});

export const ChatMessageRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  location: LocationCoordinatesSchema.optional(),
  currentAQI: z.number().nullable().optional(),
  category: z.string().optional(),
  indexStandard: z.string().optional(),
  dominantPollutant: z.string().nullable().optional(),
  preferences: HouseholdPreferencesSchema.partial().optional()
});

export const SavedActionInputSchema = z.object({
  actionId: z.string().min(1),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  locationName: z.string().min(1).max(120),
  aqiAtSave: z.number().nullable()
});
