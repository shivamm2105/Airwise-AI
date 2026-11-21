import { AirQualityData, LocationCoordinates } from '../../../shared/types.js';

export interface AirQualityProvider {
  readonly name: string;

  /**
   * Fetch current and forecast air quality data for given coordinates
   */
  getAirQuality(coords: LocationCoordinates): Promise<AirQualityData>;

  /**
   * Search for locations matching a query string
   */
  searchLocations(query: string): Promise<LocationCoordinates[]>;
}
