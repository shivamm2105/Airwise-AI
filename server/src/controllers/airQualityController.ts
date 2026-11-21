import { Request, Response, NextFunction } from 'express';
import { airQualityService } from '../services/AirQualityService.js';
import { LocationQuerySchema, SearchQuerySchema } from '../../../shared/schemas.js';

export async function getCurrentAirQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedQuery = LocationQuerySchema.parse({
      latitude: req.query.latitude ? Number(req.query.latitude) : req.query.lat ? Number(req.query.lat) : undefined,
      longitude: req.query.longitude ? Number(req.query.longitude) : req.query.lon ? Number(req.query.lon) : undefined,
      city: typeof req.query.city === 'string' ? req.query.city : undefined
    });

    let lat = parsedQuery.latitude;
    let lon = parsedQuery.longitude;
    let locationName = parsedQuery.city || 'Custom Location';
    let country: string | undefined;
    let region: string | undefined;

    // If city name is provided instead of coordinates, geocode first
    if (lat === undefined || lon === undefined) {
      const searchResults = await airQualityService.searchLocations(parsedQuery.city!);
      if (!searchResults.length) {
        res.status(404).json({
          status: 404,
          error: 'Not Found',
          message: `Could not resolve geographic coordinates for location "${parsedQuery.city}". Please check spelling or select from suggestions.`
        });
        return;
      }
      lat = searchResults[0].latitude;
      lon = searchResults[0].longitude;
      locationName = searchResults[0].name;
      country = searchResults[0].country;
      region = searchResults[0].region;
    }

    const data = await airQualityService.getAirQualityByCoordinates({
      latitude: lat,
      longitude: lon,
      name: locationName,
      country,
      region
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function searchLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = SearchQuerySchema.parse({ query: req.query.q });
    const results = await airQualityService.searchLocations(query);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
