import React from 'react';
import { AirQualityData, LocationCoordinates } from '@shared/types';
import { AQIBadge } from '../components/AQIBadge';
import { PollutantCard } from '../components/PollutantCard';
import { ForecastChart } from '../components/ForecastChart';
import { MapPin, RefreshCw, AlertTriangle, Database, Info, Loader2 } from 'lucide-react';

interface DashboardPageProps {
  data: AirQualityData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenLocation: () => void;
  currentLocation: LocationCoordinates | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  loading,
  error,
  onRefresh,
  onOpenLocation,
  currentLocation
}) => {
  if (loading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <h2 className="text-xl font-bold text-white">Fetching Verified Environmental Measurements...</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Connecting to Copernicus Atmosphere Monitoring Service & Open-Meteo for {currentLocation?.name || 'selected city'}.
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 flex items-center justify-center mx-auto border border-rose-800">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Environmental Data Fetch Failed</h2>
        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={onOpenLocation}
            className="px-4 py-2 rounded-xl bg-navy-800 border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            Change Location
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Location Bar & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-navy-800/80 rounded-2xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {data.location.name}
              </h1>
              {data.location.country && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-navy-900 text-slate-300 border border-slate-700">
                  {data.location.country}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Station Coords: {data.location.latitude.toFixed(2)}°N, {data.location.longitude.toFixed(2)}°E</span>
              <span>•</span>
              <span>Observed: {formatTimestamp(data.observedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {data.isDemo && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-700">
              Deterministic Demo Data
            </span>
          )}
          {data.isStale && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-700">
              Cached (Stale)
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-300 hover:text-white hover:border-teal-500/50 transition-colors focus:outline-none"
            aria-label="Refresh environmental readings"
            title="Refresh environmental readings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
          <button
            onClick={onOpenLocation}
            className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-xs font-semibold text-slate-200 transition-colors"
          >
            Change Location
          </button>
        </div>
      </div>

      {/* Main AQI Hero Display */}
      <AQIBadge
        aqi={data.aqi}
        category={data.category}
        categoryLabel={data.categoryLabel}
        standard={data.indexStandard}
        size="lg"
      />

      {/* Primary Pollutants Grid */}
      <section aria-labelledby="pollutants-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="pollutants-heading" className="text-lg font-bold text-white flex items-center gap-2">
            <span>Criteria Air Pollutants</span>
            <span className="text-xs font-normal text-slate-400">(Micrograms per cubic meter — µg/m³)</span>
          </h2>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span>WHO 24-Hour Air Quality Benchmarks</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PollutantCard
            name="PM2.5"
            fullName="Fine Particulate Matter (&le;2.5µm)"
            value={data.pollutants.pm2_5}
            whoStandardLimit={15}
            description="Penetrates deep into alveolar lung tissue and cardiovascular bloodstream."
          />
          <PollutantCard
            name="PM10"
            fullName="Coarse Particulate Matter (&le;10µm)"
            value={data.pollutants.pm10}
            whoStandardLimit={45}
            description="Road dust, silica, and soot. Irritates upper respiratory tract."
          />
          <PollutantCard
            name="NO2"
            fullName="Nitrogen Dioxide"
            value={data.pollutants.no2}
            whoStandardLimit={25}
            description="Emitted from vehicle combustion and industrial boilers. Causes airway inflammation."
          />
          <PollutantCard
            name="SO2"
            fullName="Sulphur Dioxide"
            value={data.pollutants.so2}
            whoStandardLimit={40}
            description="Derived from thermal coal plants and diesel fuels. Triggers asthma attacks."
          />
          <PollutantCard
            name="O3"
            fullName="Ground-Level Ozone"
            value={data.pollutants.o3}
            whoStandardLimit={100}
            description="Secondary photochemical smog pollutant formed by sunlight and vehicle exhaust."
          />
          <PollutantCard
            name="CO"
            fullName="Carbon Monoxide"
            value={data.pollutants.co}
            unit="mg/m³"
            whoStandardLimit={4}
            description="Colorless gas from incomplete fossil combustion. Hampers oxygen delivery."
          />
        </div>
      </section>

      {/* 24-Hour Forecast Chart */}
      <ForecastChart hourly={data.hourlyForecast} />

      {/* Attribution & Transparency Banner */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            Data Source: <strong className="text-slate-300">{data.qualityMetadata.attribution}</strong>
          </span>
        </div>
        {data.qualityMetadata.notes && (
          <span className="text-[11px] text-slate-400 italic">
            Note: {data.qualityMetadata.notes}
          </span>
        )}
      </div>
    </div>
  );
};
