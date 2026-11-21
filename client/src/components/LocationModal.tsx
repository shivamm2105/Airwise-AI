import React, { useState } from 'react';
import { Search, MapPin, Navigation, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { LocationCoordinates } from '@shared/types';
import { api } from '../services/api';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationCoordinates | null;
  onSelectLocation: (loc: LocationCoordinates) => void;
}

const PRESET_CITIES: LocationCoordinates[] = [
  { name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'London', region: 'Greater London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { name: 'Beijing', region: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { name: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Los Angeles', region: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' }
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationCoordinates[]>([]);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.length < 2) return;

    setSearching(true);
    setErrorMessage(null);
    try {
      const items = await api.searchLocations(query.trim());
      setResults(items);
      if (items.length === 0) {
        setErrorMessage(`No matching environmental stations found for "${query}". Try searching by major city name.`);
      }
    } catch {
      setErrorMessage('Search request timed out. Please select from preset cities below.');
    } finally {
      setSearching(false);
    }
  };

  const handleBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser. Please select or search manually.');
      return;
    }

    setGeolocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocating(false);
        const userLoc: LocationCoordinates = {
          name: 'Your Current Location',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4))
        };
        onSelectLocation(userLoc);
        onClose();
      },
      (err) => {
        setGeolocating(false);
        let msg = 'Unable to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can select your city manually below anytime.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please choose a city below.';
        }
        setErrorMessage(msg);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="bg-navy-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-lg font-bold text-white">
                Select Your Location
              </h2>
              <p className="text-xs text-slate-400">
                Choose a city to pull live atmospheric data & safety rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Close Location Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any city worldwide (e.g. Delhi, London, Seattle)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-navy-800 border border-slate-700 text-sm text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Browser Geolocation Button */}
          <button
            onClick={handleBrowserGeolocation}
            disabled={geolocating}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-navy-800/80 hover:bg-navy-800 border border-slate-700/80 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors"
          >
            {geolocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>Locating with browser GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-teal-400" />
                <span>Use My Current Device Location (Explicit Permission)</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Results or Presets List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {results.length > 0 ? (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2 block">
                Search Results ({results.length})
              </span>
              <div className="space-y-1.5">
                {results.map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-navy-800 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white text-sm block group-hover:text-teal-300">
                        {loc.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {[loc.region, loc.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-teal-400 font-medium">Select &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Featured Urban Centers (Severe Smog & Clean Air Reference Hubs)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_CITIES.map((city, idx) => {
                  const isSelected = currentLocation?.name === city.name;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectLocation(city);
                        onClose();
                      }}
                      className={`text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-teal-950/60 border-teal-500/60 text-teal-300'
                          : 'bg-navy-800/70 border-slate-700 hover:border-slate-600 text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">{city.name}</span>
                        <span className="text-[11px] text-slate-400">{city.country}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
