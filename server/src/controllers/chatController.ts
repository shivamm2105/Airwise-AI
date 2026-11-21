import { Request, Response, NextFunction } from 'express';
import { geminiService } from '../services/GeminiService.js';
import { airQualityService } from '../services/AirQualityService.js';
import { ChatMessageRequestSchema } from '../../../shared/schemas.js';
import { AirQualityData } from '../../../shared/types.js';

export async function handleChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = ChatMessageRequestSchema.parse(req.body);

    let airQuality: AirQualityData | null = null;
    if (payload.location) {
      try {
        airQuality = await airQualityService.getAirQualityByCoordinates(payload.location);
      } catch (err) {
        console.warn('Failed to fetch live context for chat, continuing with partial context:', err);
      }
    }

    const aiResult = await geminiService.chatWithContext(
      payload.message,
      airQuality,
      payload.preferences
    );

    res.json(aiResult);
  } catch (err) {
    next(err);
  }
}

