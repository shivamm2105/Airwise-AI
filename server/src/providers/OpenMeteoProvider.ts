import { AirQualityProvider } from './AirQualityProvider.js';
import {
  AirQualityData,
  AQIStandard,
  HourlyForecastPoint,
  LocationCoordinates,
  PollutantMeasurements
} from '../../../shared/types.js';
import {
  calculateCPCBSubIndexPM10,
  calculateCPCBSubIndexPM25,
  calculateUSEPASubIndexPM25,
  classifyAQI,
  isIndiaLocation
} from '../../../shared/safetyRules.js';

interface OpenMeteoCurrent {
  time?: string;
  us_aqi?: number | null;
  european_aqi?: number | null;
  pm10?: number | null;
  pm2_5?: number | null;
  carbon_monoxide?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  ozone?: number | null;
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

function parseUtcTimestamp(isoOrWallTime?: string): string {
  if (!isoOrWallTime) {
    return new Date().toISOString();
  }
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(isoOrWallTime);
  const parsed = new Date(hasTimezone ? isoOrWallTime : `${isoOrWallTime}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function sanitizePollutantReading(
  rawValue: number | null | undefined,
  name: string,
  missingPollutants: string[]
): number | null {
  if (rawValue === undefined || rawValue === null || !Number.isFinite(rawValue) || rawValue < 0) {
    missingPollutants.push(name);
    return null;
  }
  return Number(rawValue.toFixed(1));
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
    // Request UTC/GMT explicitly so server timezone never shifts observedAt or forecast windows
    url.searchParams.set('timezone', 'GMT');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let rawData: OpenMeteoResponse;
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
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

    const missingPollutants: string[] = [];

    // Open-Meteo reports carbon monoxide in µg/m³; convert to mg/m³ for standard health reference
    let coValue: number | null = null;
    if (
      current.carbon_monoxide !== undefined &&
      current.carbon_monoxide !== null &&
      Number.isFinite(current.carbon_monoxide) &&
      current.carbon_monoxide >= 0
    ) {
      coValue = Number((current.carbon_monoxide / 1000).toFixed(2));
    } else {
      missingPollutants.push('CO');
    }

    const pollutants: PollutantMeasurements = {
      pm2_5: sanitizePollutantReading(current.pm2_5, 'PM2.5', missingPollutants),
      pm10: sanitizePollutantReading(current.pm10, 'PM10', missingPollutants),
      no2: sanitizePollutantReading(current.nitrogen_dioxide, 'NO2', missingPollutants),
      so2: sanitizePollutantReading(current.sulphur_dioxide, 'SO2', missingPollutants),
      o3: sanitizePollutantReading(current.ozone, 'O3', missingPollutants),
      co: coValue
    };

    const isIndia = isIndiaLocation(coords);
    let standard: AQIStandard = 'US_AQI';
    let aqiValue: number | null = null;
    let dominantPollutant: string | null = pollutants.pm2_5 !== null ? 'PM2.5' : null;
    let standardNotes = 'US EPA Air Quality Index scale standard.';

    if (isIndia && (pollutants.pm2_5 !== null || pollutants.pm10 !== null)) {
      standard = 'CPCB_AQI';
      const pm25Sub = pollutants.pm2_5 !== null ? calculateCPCBSubIndexPM25(pollutants.pm2_5) : null;
      const pm10Sub = pollutants.pm10 !== null ? calculateCPCBSubIndexPM10(pollutants.pm10) : null;

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
      const rawUsAqi = current.us_aqi;
      aqiValue =
        rawUsAqi !== undefined && rawUsAqi !== null && Number.isFinite(rawUsAqi) && rawUsAqi >= 0
          ? rawUsAqi
          : null;
      if (aqiValue === null && pollutants.pm2_5 !== null) {
        aqiValue = calculateUSEPASubIndexPM25(pollutants.pm2_5);
      }
    }

    const { category, label, healthImplications } = classifyAQI(aqiValue, standard);

    const hourlyPoints: HourlyForecastPoint[] = [];
    if (rawData.hourly && Array.isArray(rawData.hourly.time)) {
      const times = rawData.hourly.time;
      const pm25s = rawData.hourly.pm2_5 || [];
      const pm10s = rawData.hourly.pm10 || [];
      const aqis = rawData.hourly.us_aqi || [];

      const nowHourUtc = new Date().toISOString().substring(0, 13);
      let startIndex = times.findIndex(t => t >= nowHourUtc);
      if (startIndex < 0) startIndex = 0;

      for (let i = startIndex; i < Math.min(times.length, startIndex + 24); i++) {
        const rawTime = times[i];
        const p25 =
          pm25s[i] !== undefined && pm25s[i] !== null && Number.isFinite(pm25s[i]) && (pm25s[i] as number) >= 0
            ? (pm25s[i] as number)
            : null;
        const p10 =
          pm10s[i] !== undefined && pm10s[i] !== null && Number.isFinite(pm10s[i]) && (pm10s[i] as number) >= 0
            ? (pm10s[i] as number)
            : null;
        let ptAqi =
          aqis[i] !== undefined && aqis[i] !== null && Number.isFinite(aqis[i]) && (aqis[i] as number) >= 0
            ? (aqis[i] as number)
            : null;

        if (standard === 'CPCB_AQI' && (p25 !== null || p10 !== null)) {
          const h25 = p25 !== null ? calculateCPCBSubIndexPM25(p25) : null;
          const h10 = p10 !== null ? calculateCPCBSubIndexPM10(p10) : null;
          ptAqi = h25 !== null && h10 !== null ? Math.max(h25, h10) : (h25 ?? h10);
        } else if (ptAqi === null && p25 !== null) {
          ptAqi = calculateUSEPASubIndexPM25(p25);
        }

        const ptClassification = classifyAQI(ptAqi, standard);

        hourlyPoints.push({
          time: parseUtcTimestamp(rawTime),
          aqi: ptAqi !== null ? Math.round(ptAqi) : null,
          pm2_5: p25 !== null ? Number(p25.toFixed(1)) : null,
          pm10: p10 !== null ? Number(p10.toFixed(1)) : null,
          category: ptClassification.category
        });
      }
    }

    const observedAt = parseUtcTimestamp(current.time);

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
        isReliable: missingPollutants.length < 4,
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
