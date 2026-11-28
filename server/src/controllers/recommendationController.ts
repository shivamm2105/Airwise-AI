import { Request, Response, NextFunction } from 'express';
import { geminiService } from '../services/GeminiService.js';
import { airQualityService } from '../services/AirQualityService.js';
import { DailyPlanRequestSchema, ImpactCalcRequestSchema } from '../../../shared/schemas.js';
import { calculateAvoidedTransportEmissions } from '../../../shared/impact.js';

export async function getDailyPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = DailyPlanRequestSchema.parse(req.body);

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

export function calculateImpact(req: Request, res: Response, next: NextFunction): void {
  try {
    const params = ImpactCalcRequestSchema.parse(req.body);
    const result = calculateAvoidedTransportEmissions(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
