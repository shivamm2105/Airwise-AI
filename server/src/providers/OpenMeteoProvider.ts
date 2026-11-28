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
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

function isValidNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
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
  if (!isValidNonNegative(rawValue)) {
    missingPollutants.push(name);
    return null;
  }
  return Number(rawValue.toFixed(1));
}

function computeRegionalAQI(
  coords: LocationCoordinates,
  pollutants: PollutantMeasurements,
  rawUsAqi: number | null | undefined
): { standard: AQIStandard; aqiValue: number | null; dominantPollutant: string | null; standardNotes: string } {
  if (isIndiaLocation(coords) && (pollutants.pm2_5 !== null || pollutants.pm10 !== null)) {
    const pm25Sub = pollutants.pm2_5 !== null ? calculateCPCBSubIndexPM25(pollutants.pm2_5) : null;
    const pm10Sub = pollutants.pm10 !== null ? calculateCPCBSubIndexPM10(pollutants.pm10) : null;
    const dominantPollutant =
      pm25Sub !== null && pm10Sub !== null
        ? pm25Sub >= pm10Sub
          ? 'PM2.5'
          : 'PM10'
        : pm25Sub !== null
        ? 'PM2.5'
        : 'PM10';
    const aqiValue =
      pm25Sub !== null && pm10Sub !== null ? Math.max(pm25Sub, pm10Sub) : (pm25Sub ?? pm10Sub);

    return {
      standard: 'CPCB_AQI',
      aqiValue,
      dominantPollutant,
      standardNotes:
        'Indian CPCB NAQI standard applied. Calculated from validated particulate concentration breakpoints (PM2.5 & PM10).'
    };
  }

  let aqiValue = isValidNonNegative(rawUsAqi) ? rawUsAqi : null;
  if (aqiValue === null && pollutants.pm2_5 !== null) {
    aqiValue = calculateUSEPASubIndexPM25(pollutants.pm2_5);
  }
  return {
    standard: 'US_AQI',
    aqiValue,
    dominantPollutant: pollutants.pm2_5 !== null ? 'PM2.5' : null,
    standardNotes: 'US EPA Air Quality Index scale standard.'
  };
}

function buildHourlyForecast(
  hourly: OpenMeteoHourly | undefined,
  standard: AQIStandard
): HourlyForecastPoint[] {
  if (!hourly || !Array.isArray(hourly.time)) {
    return [];
  }

  const times = hourly.time;
  const pm25s = hourly.pm2_5 || [];
  const pm10s = hourly.pm10 || [];
  const aqis = hourly.us_aqi || [];

  const nowHourUtc = new Date().toISOString().substring(0, 13);
  let startIndex = times.findIndex(t => t >= nowHourUtc);
  if (startIndex < 0) startIndex = 0;

  const points: HourlyForecastPoint[] = [];
  for (let i = startIndex; i < Math.min(times.length, startIndex + 24); i++) {
    const p25 = isValidNonNegative(pm25s[i]) ? pm25s[i] : null;
    const p10 = isValidNonNegative(pm10s[i]) ? pm10s[i] : null;
    let ptAqi = isValidNonNegative(aqis[i]) ? aqis[i] : null;

    if (standard === 'CPCB_AQI' && (p25 !== null || p10 !== null)) {
      const h25 = p25 !== null ? calculateCPCBSubIndexPM25(p25) : null;
      const h10 = p10 !== null ? calculateCPCBSubIndexPM10(p10) : null;
      ptAqi = h25 !== null && h10 !== null ? Math.max(h25, h10) : (h25 ?? h10);
    } else if (ptAqi === null && p25 !== null) {
      ptAqi = calculateUSEPASubIndexPM25(p25);
    }

    const classification = classifyAQI(ptAqi, standard);
    points.push({
      time: parseUtcTimestamp(times[i]),
      aqi: ptAqi !== null ? Math.round(ptAqi) : null,
      pm2_5: p25 !== null ? Number(p25.toFixed(1)) : null,
      pm10: p10 !== null ? Number(p10.toFixed(1)) : null,
      category: classification.category
    });
  }
  return points;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AirWise-AI/1.0 (Environmental-Health-Assistant)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
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
    // Request UTC/GMT explicitly so server timezone never shifts observedAt or forecast windows
    url.searchParams.set('timezone', 'GMT');

    let payload: unknown;
    try {
      payload = await fetchJsonWithTimeout(url.toString(), 8000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch environmental data from Open-Meteo: ${message}`);
    }

    const rawData = (typeof payload === 'object' && payload !== null ? payload : {}) as OpenMeteoResponse;
    const current = rawData.current;
    if (!current || typeof current !== 'object') {
      throw new Error('Open-Meteo response did not contain current observations.');
    }

    const missingPollutants: string[] = [];
    // Convert CO from µg/m³ to mg/m³ for standard WHO reference comparison
    let coValue: number | null = null;
    if (isValidNonNegative(current.carbon_monoxide)) {
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

    const { standard, aqiValue, dominantPollutant, standardNotes } = computeRegionalAQI(
      coords,
      pollutants,
      current.us_aqi
    );
    const { category, label, healthImplications } = classifyAQI(aqiValue, standard);

    return {
      location: coords,
      aqi: aqiValue !== null ? Math.round(aqiValue) : null,
      category,
      categoryLabel: label,
      healthImplications,
      indexStandard: standard,
      dominantPollutant,
      pollutants,
      hourlyForecast: buildHourlyForecast(rawData.hourly, standard),
      provider: this.name,
      observedAt: parseUtcTimestamp(current.time),
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
    if (trimmed.length < 2) {
      return [];
    }

    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    try {
      const data = (await fetchJsonWithTimeout(url.toString(), 6000)) as { results?: GeocodingResult[] } | null;
      if (!data || !Array.isArray(data.results)) {
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
    } catch (err: unknown) {
      console.warn('Geocoding lookup failed, returning empty location list:', err);
      return [];
    }
  }
}
