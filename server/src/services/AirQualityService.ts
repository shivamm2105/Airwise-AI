import { AirQualityProvider } from '../providers/AirQualityProvider.js';
import { ProviderFactory } from '../providers/ProviderFactory.js';
import { airQualityCache } from './CacheService.js';
import { AirQualityData, LocationCoordinates } from '../../../shared/types.js';

export class AirQualityService {
  private provider: AirQualityProvider;

  constructor(provider?: AirQualityProvider) {
    this.provider = provider || ProviderFactory.getProvider();
  }

  public setProvider(provider: AirQualityProvider): void {
    this.provider = provider;
  }

  private generateCacheKey(lat: number, lon: number): string {
    return `aq_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  }

  public async getAirQualityByCoordinates(coords: LocationCoordinates): Promise<AirQualityData> {
    const cacheKey = this.generateCacheKey(coords.latitude, coords.longitude);
    const cached = airQualityCache.get<AirQualityData>(cacheKey);

    // If fresh in cache, return immediately
    if (cached && !cached.isStale) {
      return {
        ...cached.data,
        isStale: false
      };
    }

    try {
      const freshData = await this.provider.getAirQuality(coords);
      airQualityCache.set(cacheKey, freshData);
      return freshData;
    } catch (err: unknown) {
      // If network fails or provider errors, but we have a stale entry, serve with explicit stale indicators
      if (cached) {
        return {
          ...cached.data,
          isStale: true,
          qualityMetadata: {
            ...cached.data.qualityMetadata,
            notes: `Stale cached data from ${cached.ageSeconds}s ago. Live update temporarily failed.`
          }
        };
      }
      // Otherwise throw error
      throw err;
    }
  }

  public async searchLocations(query: string): Promise<LocationCoordinates[]> {
    return this.provider.searchLocations(query);
  }
}

export const airQualityService = new AirQualityService();
