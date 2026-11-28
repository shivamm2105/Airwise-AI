import { AirQualityProvider } from '../providers/AirQualityProvider.js';
import { ProviderFactory } from '../providers/ProviderFactory.js';
import { airQualityCache } from './CacheService.js';
import { AirQualityData, LocationCoordinates } from '../../../shared/types.js';

export class AirQualityService {
  private customProvider: AirQualityProvider | null = null;
  private pendingRequests = new Map<string, Promise<AirQualityData>>();

  constructor(provider?: AirQualityProvider) {
    if (provider) this.customProvider = provider;
  }

  public setProvider(provider: AirQualityProvider | null): void {
    this.customProvider = provider;
  }

  private getProvider(): AirQualityProvider {
    return this.customProvider || ProviderFactory.getProvider();
  }

  private generateCacheKey(lat: number, lon: number): string {
    return `aq_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  }

  private mergeLocation(cachedLoc: LocationCoordinates, requestedLoc: LocationCoordinates): LocationCoordinates {
    return {
      ...cachedLoc,
      ...requestedLoc,
      country: requestedLoc.country ?? cachedLoc.country,
      region: requestedLoc.region ?? cachedLoc.region,
      timezone: requestedLoc.timezone ?? cachedLoc.timezone
    };
  }

  public async getAirQualityByCoordinates(coords: LocationCoordinates): Promise<AirQualityData> {
    const cacheKey = this.generateCacheKey(coords.latitude, coords.longitude);
    const cached = airQualityCache.get<AirQualityData>(cacheKey);

    if (cached && !cached.isStale) {
      return {
        ...cached.data,
        location: this.mergeLocation(cached.data.location, coords),
        isStale: false
      };
    }

    // Deduplicate concurrent upstream fetches for identical coordinates
    const inFlight = this.pendingRequests.get(cacheKey);
    if (inFlight) {
      const data = await inFlight;
      return {
        ...data,
        location: this.mergeLocation(data.location, coords)
      };
    }

    const fetchPromise = (async (): Promise<AirQualityData> => {
      try {
        const provider = this.getProvider();
        const freshData = await provider.getAirQuality(coords);
        airQualityCache.set(cacheKey, freshData);
        return freshData;
      } catch (err: unknown) {
        if (cached) {
          return {
            ...cached.data,
            location: this.mergeLocation(cached.data.location, coords),
            isStale: true,
            qualityMetadata: {
              ...cached.data.qualityMetadata,
              notes: `Stale cached data from ${cached.ageSeconds}s ago. Live update temporarily failed.`
            }
          };
        }
        throw err;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public async searchLocations(query: string): Promise<LocationCoordinates[]> {
    return this.getProvider().searchLocations(query);
  }
}

export const airQualityService = new AirQualityService();
