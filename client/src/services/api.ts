import {
  AirQualityData,
  AISynthesisResponse,
  HouseholdPreferences,
  LocationCoordinates,
  SavedActionRecord
} from '@shared/types';

const API_BASE = '/api';

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.message || data?.error || `Request failed with status ${res.status}`;
      throw new ApiError(msg, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to AirWise server. Please check your network connection.', 0);
  }
}

export const api = {
  getAirQuality: async (params: { latitude?: number; longitude?: number; city?: string }): Promise<AirQualityData> => {
    const q = new URLSearchParams();
    if (params.latitude !== undefined && params.longitude !== undefined) {
      q.set('latitude', params.latitude.toString());
      q.set('longitude', params.longitude.toString());
    } else if (params.city) {
      q.set('city', params.city);
    }
    return request<AirQualityData>(`/air-quality/current?${q.toString()}`);
  },

  searchLocations: async (query: string): Promise<LocationCoordinates[]> => {
    if (!query.trim()) return [];
    const res = await request<{ results: LocationCoordinates[] }>(`/air-quality/search?q=${encodeURIComponent(query)}`);
    return res.results || [];
  },

  generateDailyPlan: async (payload: {
    latitude: number;
    longitude: number;
    locationName: string;
    country?: string;
    region?: string;
    preferences?: Partial<HouseholdPreferences>;
  }): Promise<AISynthesisResponse> => {
    return request<AISynthesisResponse>('/recommendations/daily-plan', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  calculateImpact: async (params: {
    distanceKm: number;
    originalMode: 'car_alone';
    alternativeMode: 'public_transit' | 'carpool' | 'bicycle' | 'walk' | 'work_from_home';
  }) => {
    return request<{
      avoidedKgCO2e: number;
      avoidedGramsExhaustPM: number;
      methodology: string;
      assumptions: string;
      uncertaintyRange: string;
    }>('/recommendations/calculate-impact', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  sendChatMessage: async (payload: {
    message: string;
    location?: LocationCoordinates;
    preferences?: Partial<HouseholdPreferences>;
  }): Promise<{ response: string; usedModel: string; groundedInContext: boolean }> => {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
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
    return request<SavedActionRecord>(`/saved-actions/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  deleteAction: async (id: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/saved-actions/${id}`, {
      method: 'DELETE'
    });
  },

  exportSummary: async () => {
    return request('/saved-actions/export');
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

