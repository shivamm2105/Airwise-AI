import { AirQualityProvider } from './AirQualityProvider.js';
import {
  AirQualityData,
  HourlyForecastPoint,
  LocationCoordinates,
  PollutantMeasurements
} from '../../../shared/types.js';
import { classifyAQI } from '../../../shared/safetyRules.js';

export class DemoAirQualityProvider implements AirQualityProvider {
  public readonly name = 'AirWise Simulated Environmental Test Provider (Demo Mode)';

  public async getAirQuality(coords: LocationCoordinates): Promise<AirQualityData> {
    const isIndia =
      coords.country?.toLowerCase() === 'india' ||
      coords.name.toLowerCase().includes('delhi') ||
      (coords.latitude >= 8.0 && coords.latitude <= 37.0 && coords.longitude >= 68.0 && coords.longitude <= 97.5);

    // Provide realistic severe winter smog values for Delhi demo, or moderate values for other cities
    let aqi = 245; // Default Unhealthy
    let pm25 = 118.5;
    let pm10 = 195.0;
    let no2 = 54.2;
    let so2 = 18.0;
    let o3 = 28.5;
    let co = 1.4;
    const standard = isIndia ? 'CPCB_AQI' : 'US_AQI';

    if (coords.name.toLowerCase().includes('delhi')) {
      aqi = 368; // Very Poor / Severe winter inversion
      pm25 = 215.4;
      pm10 = 345.8;
      no2 = 82.1;
      so2 = 24.3;
      o3 = 22.0;
      co = 2.8;
    } else if (coords.name.toLowerCase().includes('london')) {
      aqi = 42; // Good
      pm25 = 9.8;
      pm10 = 16.2;
      no2 = 22.4;
      so2 = 4.1;
      o3 = 45.0;
      co = 0.4;
    } else if (coords.name.toLowerCase().includes('tokyo')) {
      aqi = 35; // Good
      pm25 = 8.2;
      pm10 = 14.0;
      no2 = 18.2;
      so2 = 3.2;
      o3 = 40.1;
      co = 0.3;
    }

    const { category, label, healthImplications } = classifyAQI(aqi, standard);

    const pollutants: PollutantMeasurements = {
      pm2_5: pm25,
      pm10,
      no2,
      so2,
      o3,
      co
    };

    const hourlyPoints: HourlyForecastPoint[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getTime() + i * 3600000);
      // Diurnal variation curve: peak pollution early morning (7-9 AM) and late evening (8-10 PM)
      const hour = d.getHours();
      let factor = 1.0;
      if (hour >= 6 && hour <= 9) factor = 1.25;
      else if (hour >= 13 && hour <= 16) factor = 0.8;
      else if (hour >= 20 && hour <= 23) factor = 1.2;

      const ptAqi = Math.round(aqi * factor);
      const ptPm25 = Number((pm25 * factor).toFixed(1));
      const ptPm10 = Number((pm10 * factor).toFixed(1));
      const ptClass = classifyAQI(ptAqi, standard);

      hourlyPoints.push({
        time: d.toISOString(),
        aqi: ptAqi,
        pm2_5: ptPm25,
        pm10: ptPm10,
        category: ptClass.category
      });
    }

    return {
      location: coords,
      aqi,
      category,
      categoryLabel: label,
      healthImplications,
      indexStandard: standard,
      dominantPollutant: 'PM2.5',
      pollutants,
      hourlyForecast: hourlyPoints,
      provider: this.name,
      observedAt: now.toISOString(),
      fetchedAt: now.toISOString(),
      isStale: false,
      isDemo: true,
      qualityMetadata: {
        isReliable: true,
        missingPollutants: [],
        attribution: 'AirWise AI Deterministic Simulation Engine',
        notes: 'Simulated environmental readings for offline evaluation and testing.'
      }
    };
  }

  public async searchLocations(query: string): Promise<LocationCoordinates[]> {
    const list: LocationCoordinates[] = [
      { name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
      { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
      { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
      { name: 'London', region: 'Greater London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
      { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
      { name: 'Los Angeles', region: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
      { name: 'Beijing', region: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
      { name: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' }
    ];

    const q = query.toLowerCase().trim();
    return list.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.country && item.country.toLowerCase().includes(q)) ||
      (item.region && item.region.toLowerCase().includes(q))
    );
  }
}

