import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { LocationCoordinates } from '@shared/types';
import { api, isAbortError } from '../services/api';
import { PRESET_CITIES } from '../constants/locations';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationCoordinates | null;
  onSelectLocation: (loc: LocationCoordinates) => void;
}

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      searchAbortRef.current?.abort();
      return;
    }

    searchInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      searchAbortRef.current?.abort();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    setErrorMessage(null);
    try {
      const items = await api.searchLocations(trimmed, controller.signal);
      setResults(items);
      if (items.length === 0) {
        setErrorMessage(`No matching environmental stations found for "${trimmed}". Try searching by major city name.`);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setErrorMessage('Search request timed out. Please select from preset cities below.');
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
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
      pos => {
        setGeolocating(false);
        const userLoc: LocationCoordinates = {
          name: 'Your Current Location',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4))
        };
        onSelectLocation(userLoc);
        onClose();
      },
      err => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss Location Dialog"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm cursor-default border-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        className="relative z-10 bg-navy-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400">
              <MapPin className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-lg font-bold text-white">
                Select Your Location
              </h2>
              <p className="text-xs text-slate-400">
                Choose a city to pull live atmospheric data &amp; safety rules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Location Dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-800 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search city or monitoring station worldwide"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any city worldwide (e.g. Delhi, London, Seattle)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-navy-800 border border-slate-700 text-sm text-white placeholder-slate-400 focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={searching || query.trim().length < 2}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : 'Search'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleBrowserGeolocation}
            disabled={geolocating}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-navy-800/80 hover:bg-navy-800 border border-slate-700/80 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors"
          >
            {geolocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" aria-hidden="true" />
                <span>Locating with browser GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-teal-400" aria-hidden="true" />
                <span>Use My Current Device Location (Explicit Permission)</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Search Results ({results.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setResults([]);
                    setQuery('');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear Search
                </button>
              </div>
              <div className="space-y-1.5">
                {results.map(loc => (
                  <button
                    type="button"
                    key={`${loc.name}-${loc.latitude}-${loc.longitude}`}
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
                Featured Urban Centers (Severe Smog &amp; Clean Air Reference Hubs)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_CITIES.map(city => {
                  const isSelected = currentLocation?.name === city.name;
                  return (
                    <button
                      type="button"
                      key={city.name}
                      onClick={() => {
                        onSelectLocation(city);
                        onClose();
                      }}
                      className={`text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${isSelected
                        ? 'bg-teal-950/60 border-teal-500/60 text-teal-300'
                        : 'bg-navy-800/70 border-slate-700 hover:border-slate-600 text-slate-200'
                        }`}
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">{city.name}</span>
                        <span className="text-[11px] text-slate-400">{city.country}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" aria-hidden="true" />}
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
