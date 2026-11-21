import { Request, Response, NextFunction } from 'express';
import { geminiService } from '../services/GeminiService.js';
import { airQualityService } from '../services/AirQualityService.js';
import { HouseholdPreferencesSchema } from '../../../shared/schemas.js';
import { calculateAvoidedTransportEmissions } from '../../../shared/impact.js';
import { z } from 'zod';

const PlanRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().default('Current Location'),
  country: z.string().optional(),
  region: z.string().optional(),
  preferences: HouseholdPreferencesSchema.partial().optional()
});

export async function getDailyPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = PlanRequestSchema.parse(req.body);

    const airQuality = await airQualityService.getAirQualityByCoordinates({
      latitude: payload.latitude,
      longitude: payload.longitude,
      name: payload.locationName,
      country: payload.country,
      region: payload.region
    });

    const plan = await geminiService.generateDailyPlan(airQuality, payload.preferences);
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

const ImpactCalcRequestSchema = z.object({
  distanceKm: z.number().min(0.5).max(300),
  originalMode: z.literal('car_alone'),
  alternativeMode: z.enum(['public_transit', 'carpool', 'bicycle', 'walk', 'work_from_home'])
});

export function calculateImpact(req: Request, res: Response, next: NextFunction): void {
  try {
    const params = ImpactCalcRequestSchema.parse(req.body);
    const result = calculateAvoidedTransportEmissions(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

