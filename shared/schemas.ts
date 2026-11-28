import { z } from 'zod';
export { DEFAULT_HOUSEHOLD_PREFERENCES, mergeHouseholdPreferences } from './preferences.js';

const OptionalLocationMetadataSchema = z
  .string()
  .max(120)
  .nullable()
  .optional()
  .transform(value => (value ? value : undefined));

export const LocationCoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  name: z.string().trim().min(1).max(120),
  region: OptionalLocationMetadataSchema,
  country: OptionalLocationMetadataSchema,
  timezone: OptionalLocationMetadataSchema
});

export const LocationQuerySchema = z
  .object({
    latitude: z.coerce.number().finite().min(-90).max(90).optional(),
    longitude: z.coerce.number().finite().min(-180).max(180).optional(),
    city: z.string().trim().min(1).max(120).optional()
  })
  .refine(
    data =>
      (data.latitude !== undefined && data.longitude !== undefined) ||
      (data.city !== undefined && data.city.length > 0),
    {
      message: 'Must provide either latitude & longitude or city name.'
    }
  );

export const SearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100)
});

const CommuteModeSchema = z.enum([
  'walk',
  'bicycle',
  'public_transit',
  'carpool',
  'car_alone',
  'electric_vehicle',
  'work_from_home'
]);

const AlternativeCommuteModeSchema = z.enum([
  'public_transit',
  'carpool',
  'bicycle',
  'walk',
  'work_from_home'
]);

const ActionCategorySchema = z.enum([
  'morning',
  'outdoor',
  'commute',
  'workplace_school',
  'indoor',
  'evening',
  'household_sustainability'
]);

export const HouseholdPreferencesSchema = z.object({
  householdSize: z.number().int().min(1).max(20).default(3),
  hasChildren: z.boolean().default(false),
  hasElderly: z.boolean().default(false),
  hasRespiratorySensitivity: z.boolean().default(false),
  commuteMode: CommuteModeSchema.default('public_transit'),
  commuteDistanceKm: z.number().finite().min(0).max(200).default(10),
  homeType: z.enum(['apartment', 'detached_house', 'dense_tenement']).default('apartment'),
  ventilationType: z.enum(['natural_cross', 'mechanical_hvac', 'closed_windows']).default('natural_cross'),
  hasAirPurifier: z.boolean().default(false),
  purifierFilterType: z.enum(['HEPA', 'carbon_only', 'basic_mesh', 'none']).default('none'),
  cookingType: z
    .enum(['induction_electric', 'gas_with_exhaust', 'gas_unvented', 'biomass_chulha'])
    .default('gas_with_exhaust'),
  indoorCombustionSources: z
    .array(z.enum(['candles', 'incense_agarbatti', 'mosquito_coils', 'tobacco_smoking']))
    .default([]),
  sustainabilityFocus: z
    .enum(['transport', 'household_energy', 'exposure_reduction', 'community', 'general'])
    .default('general')
});

export const ChatMessageRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  location: LocationCoordinatesSchema.optional(),
  currentAQI: z.number().finite().nullable().optional(),
  category: z.string().max(80).optional(),
  indexStandard: z.string().max(40).optional(),
  dominantPollutant: z.string().max(40).nullable().optional(),
  preferences: HouseholdPreferencesSchema.partial().optional()
});

export const DailyPlanRequestSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  locationName: z.string().trim().min(1).max(120).default('Current Location'),
  country: OptionalLocationMetadataSchema,
  region: OptionalLocationMetadataSchema,
  preferences: HouseholdPreferencesSchema.partial().optional()
});

export const ImpactCalcRequestSchema = z.object({
  distanceKm: z.number().finite().min(0.5).max(300),
  originalMode: z.literal('car_alone'),
  alternativeMode: AlternativeCommuteModeSchema
});

export const SavedActionInputSchema = z.object({
  actionId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(50),
  locationName: z.string().trim().min(1).max(120),
  aqiAtSave: z.number().finite().nullable()
});

export const SavedActionIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid action identifier format.')
});

const GeminiActionOutputSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(1).max(200),
  category: ActionCategorySchema.catch('indoor'),
  timeframe: z.string().trim().min(1).max(80).default('Scheduled'),
  whatToDo: z.string().trim().min(1).max(1200),
  whyItMatters: z.string().trim().min(1).max(1200).default('Supports respiratory protection and clean living.'),
  steps: z.array(z.string().trim().min(1).max(400)).max(10).default([]),
  expectedBenefit: z.string().trim().min(1).max(600).default('Reduces airborne particulate inhalation.')
});

export const GeminiDailyPlanOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1000).optional(),
  actions: z.array(GeminiActionOutputSchema).min(3).max(10),
  sustainableAlternatives: z
    .object({
      transportOption: z.string().trim().max(500).optional(),
      idlingAdvice: z.string().trim().max(500).optional(),
      tripConsolidationTips: z.string().trim().max(500).optional(),
      householdEnergyAction: z.string().trim().max(500).optional()
    })
    .optional(),
  communityTips: z.array(z.string().trim().min(1).max(400)).max(6).optional()
});
