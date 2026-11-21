import { describe, it, expect } from 'vitest';
import {
  LocationCoordinatesSchema,
  LocationQuerySchema,
  HouseholdPreferencesSchema,
  ChatMessageRequestSchema
} from '../../shared/schemas.js';

describe('Zod Schemas and Input Validation Unit Tests', () => {
  it('validates proper coordinates within geographical ranges', () => {
    const valid = {
      latitude: 28.6139,
      longitude: 77.2090,
      name: 'New Delhi',
      country: 'India'
    };
    expect(() => LocationCoordinatesSchema.parse(valid)).not.toThrow();
  });

  it('rejects out-of-bound latitude', () => {
    const invalid = {
      latitude: 95.0,
      longitude: 77.0,
      name: 'Invalid Point'
    };
    expect(() => LocationCoordinatesSchema.parse(invalid)).toThrow();
  });

  it('accepts city name as query fallback', () => {
    const query = { city: 'London' };
    expect(() => LocationQuerySchema.parse(query)).not.toThrow();
  });

  it('rejects query without coordinates or city', () => {
    const query = {};
    expect(() => LocationQuerySchema.parse(query)).toThrow();
  });

  it('assigns safe defaults for household preferences', () => {
    const parsed = HouseholdPreferencesSchema.parse({});
    expect(parsed.householdSize).toBe(3);
    expect(parsed.hasChildren).toBe(false);
    expect(parsed.commuteMode).toBe('public_transit');
    expect(parsed.cookingType).toBe('gas_with_exhaust');
  });

  it('validates chat request payload with message', () => {
    const req = {
      message: 'Can I go for a jog right now?',
      currentAQI: 185
    };
    expect(() => ChatMessageRequestSchema.parse(req)).not.toThrow();
  });

  it('rejects empty chat messages', () => {
    const req = { message: '' };
    expect(() => ChatMessageRequestSchema.parse(req)).toThrow();
  });
});

