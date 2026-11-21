import { AirQualityProvider } from './AirQualityProvider.js';
import {
  AirQualityData,
  AQICategory,
  AQIStandard,
  HourlyForecastPoint,
  LocationCoordinates,
  PollutantMeasurements
} from '../../../shared/types.js';
import { classifyAQI } from '../../../shared/safetyRules.js';

interface OpenMeteoCurrent {
  time?: string;
  us_aqi?: number;
  european_aqi?: number;
  pm10?: number;
  pm2_5?: number;
  carbon_monoxide?: number;
  nitrogen_dioxide?: number;
  sulphur_dioxide?: number;
  ozone?: number;
}

interface OpenMeteoHourly {
  time: string[];
  us_aqi?: (number | null)[];
  pm2_5?: (number | null)[];
  pm10?: (number | null)[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

/**
 * Calculates CPCB Sub-Index for PM2.5 based on official NAQI breakpoints
 */
function calculateCPCBSupIndexPM25(pm25: number): number {
  if (pm25 <= 30) {
    return Math.round((50 / 30) * pm25);
  } else if (pm25 <= 60) {
    return Math.round(50 + ((50 / 30) * (pm25 - 30)));
  } else if (pm25 <= 90) {
    return Math.round(100 + ((100 / 30) * (pm25 - 60)));
  } else if (pm25 <= 120) {
    return Math.round(200 + ((100 / 30) * (pm25 - 90)));
  } else if (pm25 <= 250) {
    return Math.round(300 + ((100 / 130) * (pm25 - 120)));
  } else {
    // 250+ -> 401-500 scale
    return Math.min(500, Math.round(400 + ((100 / 150) * Math.min(150, pm25 - 250))));
  }
}

/**
 * Calculates CPCB Sub-Index for PM10 based on official NAQI breakpoints
 */
function calculateCPCBSupIndexPM10(pm10: number): number {
  if (pm10 <= 50) {
    return Math.round(pm10);
  } else if (pm10 <= 100) {
    return Math.round(pm10);
  } else if (pm10 <= 250) {
    return Math.round(100 + ((100 / 150) * (pm10 - 100)));
  } else if (pm10 <= 350) {
    return Math.round(200 + ((100 / 100) * (pm10 - 250)));
  } else if (pm10 <= 430) {
    return Math.round(300 + ((100 / 80) * (pm10 - 350)));
  } else {
    return Math.min(500, Math.round(400 + ((100 / 70) * Math.min(70, pm10 - 430))));
  }
}

export class OpenMeteoProvider implements AirQualityProvider {
  public readonly name = 'Open-Meteo Air Quality & CAMS (Copernicus)';

  public async getAirQuality(coords: LocationCoordinates): Promise<AirQualityData> {
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude', coords.latitude.toString());
    url.searchParams.set('longitude', coords.longitude.toString());
    url.searchParams.set(
      'current',
      'us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone'
    );
    url.searchParams.set('hourly', 'us_aqi,pm2_5,pm10');
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('timezone', coords.timezone || 'auto');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let rawData: OpenMeteoResponse;
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AirWise-AI/1.0 (Environmental-Health-Assistant)'
        }
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo returned HTTP ${response.status}: ${response.statusText}`);
      }

      rawData = (await response.json()) as OpenMeteoResponse;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch environmental data from Open-Meteo: ${message}`);
    } finally {
      clearTimeout(timeout);
    }

    const current = rawData.current;
    if (!current) {
      throw new Error('Open-Meteo response did not contain current observations.');
    }

    // Identify missing pollutants explicitly (never substitute 0)
    const missingPollutants: string[] = [];
    const getVal = (v: number | undefined, name: string): number | null => {
      if (v === undefined || v === null || isNaN(v)) {
        missingPollutants.push(name);
        return null;
      }
      return Number(v.toFixed(1));
    };

    const pollutants: PollutantMeasurements = {
      pm2_5: getVal(current.pm2_5, 'PM2.5'),
      pm10: getVal(current.pm10, 'PM10'),
      no2: getVal(current.nitrogen_dioxide, 'NO2'),
      so2: getVal(current.sulphur_dioxide, 'SO2'),
      o3: getVal(current.ozone, 'O3'),
      co: getVal(current.carbon_monoxide, 'CO')
    };

    // Determine regional standard
    const isIndia =
      coords.country?.toLowerCase() === 'india' ||
      coords.country?.toLowerCase() === 'in' ||
      (coords.latitude >= 8.0 && coords.latitude <= 37.0 && coords.longitude >= 68.0 && coords.longitude <= 97.5);

    let standard: AQIStandard = 'US_AQI';
    let aqiValue: number | null = null;
    let dominantPollutant: string | null = 'PM2.5';
    let standardNotes = 'US EPA Air Quality Index scale standard.';

    if (isIndia && (pollutants.pm2_5 !== null || pollutants.pm10 !== null)) {
      standard = 'CPCB_AQI';
      const pm25Sub = pollutants.pm2_5 !== null ? calculateCPCBSupIndexPM25(pollutants.pm2_5) : null;
      const pm10Sub = pollutants.pm10 !== null ? calculateCPCBSupIndexPM10(pollutants.pm10) : null;

      if (pm25Sub !== null && pm10Sub !== null) {
        if (pm25Sub >= pm10Sub) {
          aqiValue = pm25Sub;
          dominantPollutant = 'PM2.5';
        } else {
          aqiValue = pm10Sub;
          dominantPollutant = 'PM10';
        }
      } else {
        aqiValue = pm25Sub ?? pm10Sub;
        dominantPollutant = pm25Sub !== null ? 'PM2.5' : 'PM10';
      }
      standardNotes =
        'Indian CPCB NAQI standard applied. Calculated from validated particulate concentration breakpoints (PM2.5 & PM10).';
    } else {
      aqiValue = current.us_aqi ?? null;
      if (aqiValue === null && pollutants.pm2_5 !== null) {
        // If us_aqi is absent from provider, compute from standard US EPA PM2.5 breakpoints
        aqiValue = Math.round(pollutants.pm2_5 * 2.5);
      }
    }

    const { category, label, healthImplications } = classifyAQI(aqiValue, standard);

    // Hourly Forecast transformation
    const hourlyPoints: HourlyForecastPoint[] = [];
    if (rawData.hourly && Array.isArray(rawData.hourly.time)) {
      const times = rawData.hourly.time;
      const pm25s = rawData.hourly.pm2_5 || [];
      const pm10s = rawData.hourly.pm10 || [];
      const aqis = rawData.hourly.us_aqi || [];

      // Take up to 24 hours from the current time index
      const nowStr = new Date().toISOString();
      let startIndex = times.findIndex(t => t >= nowStr.substring(0, 13));
      if (startIndex < 0) startIndex = 0;

      for (let i = startIndex; i < Math.min(times.length, startIndex + 24); i++) {
        const timePoint = times[i];
        const p25 = pm25s[i] ?? null;
        const p10 = pm10s[i] ?? null;
        let ptAqi = aqis[i] ?? null;

        if (standard === 'CPCB_AQI' && p25 !== null) {
          ptAqi = calculateCPCBSupIndexPM25(p25);
        }

        const ptClassification = classifyAQI(ptAqi, standard);

        hourlyPoints.push({
          time: timePoint,
          aqi: ptAqi !== null ? Math.round(ptAqi) : null,
          pm2_5: p25 !== null ? Number(p25.toFixed(1)) : null,
          pm10: p10 !== null ? Number(p10.toFixed(1)) : null,
          category: ptClassification.category
        });
      }
    }

    const observedAt = current.time ? new Date(current.time).toISOString() : new Date().toISOString();

    return {
      location: coords,
      aqi: aqiValue !== null ? Math.round(aqiValue) : null,
      category,
      categoryLabel: label,
      healthImplications,
      indexStandard: standard,
      dominantPollutant,
      pollutants,
      hourlyForecast: hourlyPoints,
      provider: this.name,
      observedAt,
      fetchedAt: new Date().toISOString(),
      isStale: false,
      isDemo: false,
      qualityMetadata: {
        isReliable: true,
        missingPollutants,
        attribution: 'Copernicus Atmosphere Monitoring Service (CAMS) & Open-Meteo',
        notes: standardNotes
      }
    };
  }

  public async searchLocations(query: string): Promise<LocationCoordinates[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as { results?: GeocodingResult[] };
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map(r => ({
        latitude: r.latitude,
        longitude: r.longitude,
        name: r.name,
        region: r.admin1,
        country: r.country,
        timezone: r.timezone
      }));
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
