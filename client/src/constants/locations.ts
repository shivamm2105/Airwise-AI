import { LocationCoordinates } from '@shared/types';

export const DEFAULT_LOCATION: LocationCoordinates = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata'
};

export const PRESET_CITIES: LocationCoordinates[] = [
  DEFAULT_LOCATION,
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'London', region: 'Greater London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { name: 'Beijing', region: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { name: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Los Angeles', region: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' }
];
