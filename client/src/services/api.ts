import {
  AirQualityData,
  AISynthesisResponse,
  ChatMessageResponse,
  ExportSummaryReport,
  HouseholdPreferences,
  ImpactCalculationResult,
  LocationCoordinates,
  SavedActionRecord
} from '@shared/types';

const API_BASE = '/api';

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function extractErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
  }
  return `Request failed with status ${status}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new ApiError(extractErrorMessage(data, res.status), res.status);
    }

    return data as T;
  } catch (err) {
    if (isAbortError(err)) throw err;
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to AirWise server. Please check your network connection.', 0);
  }
}

let primedAirQualityRequest: { key: string; promise: Promise<AirQualityData> } | null = null;

function buildAirQualityQuery(params: { latitude?: number; longitude?: number; city?: string }): string {
  const q = new URLSearchParams();
  if (params.latitude !== undefined && params.longitude !== undefined) {
    q.set('latitude', params.latitude.toString());
    q.set('longitude', params.longitude.toString());
  } else if (params.city) {
    q.set('city', params.city);
  }
  return q.toString();
}

export function primeDefaultAirQuality(params: { latitude?: number; longitude?: number; city?: string }): void {
  const key = buildAirQualityQuery(params);
  primedAirQualityRequest = {
    key,
    promise: request<AirQualityData>(`/air-quality/current?${key}`)
  };
}

export const api = {
  getAirQuality: async (
    params: { latitude?: number; longitude?: number; city?: string },
    signal?: AbortSignal
  ): Promise<AirQualityData> => {
    const queryStr = buildAirQualityQuery(params);
    if (primedAirQualityRequest && primedAirQualityRequest.key === queryStr && !signal?.aborted) {
      const { promise } = primedAirQualityRequest;
      primedAirQualityRequest = null;
      try {
        return await promise;
      } catch (err) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        throw err;
      }
    }
    return request<AirQualityData>(`/air-quality/current?${queryStr}`, { signal });
  },

  searchLocations: async (query: string, signal?: AbortSignal): Promise<LocationCoordinates[]> => {
    if (!query.trim()) return [];
    const res = await request<{ results: LocationCoordinates[] }>(
      `/air-quality/search?q=${encodeURIComponent(query)}`,
      { signal }
    );
    return res.results || [];
  },

  generateDailyPlan: async (
    payload: {
      latitude: number;
      longitude: number;
      locationName: string;
      country?: string;
      region?: string;
      preferences?: Partial<HouseholdPreferences>;
    },
    signal?: AbortSignal
  ): Promise<AISynthesisResponse> => {
    return request<AISynthesisResponse>('/recommendations/daily-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal
    });
  },

  calculateImpact: async (
    params: {
      distanceKm: number;
      originalMode: 'car_alone';
      alternativeMode: 'public_transit' | 'carpool' | 'bicycle' | 'walk' | 'work_from_home';
    },
    signal?: AbortSignal
  ): Promise<ImpactCalculationResult> => {
    return request<ImpactCalculationResult>('/recommendations/calculate-impact', {
      method: 'POST',
      body: JSON.stringify(params),
      signal
    });
  },

  sendChatMessage: async (
    payload: {
      message: string;
      location?: LocationCoordinates;
      currentAQI?: number | null;
      category?: string;
      indexStandard?: string;
      dominantPollutant?: string | null;
      preferences?: Partial<HouseholdPreferences>;
    },
    signal?: AbortSignal
  ): Promise<ChatMessageResponse> => {
    return request<ChatMessageResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal
    });
  },

  getSavedActions: async (): Promise<SavedActionRecord[]> => {
    const res = await request<{ actions: SavedActionRecord[] }>('/saved-actions');
    return res.actions;
  },

  saveAction: async (action: {
    actionId: string;
    title: string;
    category: string;
    locationName: string;
    aqiAtSave: number | null;
  }): Promise<SavedActionRecord> => {
    return request<SavedActionRecord>('/saved-actions', {
      method: 'POST',
      body: JSON.stringify(action)
    });
  },

  toggleActionCompletion: async (id: string): Promise<SavedActionRecord> => {
    return request<SavedActionRecord>(`/saved-actions/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH'
    });
  },

  deleteAction: async (id: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/saved-actions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  clearAllActions: async (): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>('/saved-actions', {
      method: 'DELETE'
    });
  },

  exportSummary: async (): Promise<ExportSummaryReport> => {
    return request<ExportSummaryReport>('/saved-actions/export');
  },

  getPreferences: async (): Promise<HouseholdPreferences | null> => {
    const res = await request<{ preferences: HouseholdPreferences | null }>('/preferences');
    return res.preferences;
  },

  updatePreferences: async (prefs: HouseholdPreferences): Promise<HouseholdPreferences> => {
    const res = await request<{ success: boolean; preferences: HouseholdPreferences }>('/preferences', {
      method: 'POST',
      body: JSON.stringify(prefs)
    });
    return res.preferences;
  }
};
