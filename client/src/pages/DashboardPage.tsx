import React from 'react';
import { AirQualityData, LocationCoordinates } from '@shared/types';
import { NavTab } from '../components/Navbar';
import { AQIBadge } from '../components/AQIBadge';
import { PollutantCard } from '../components/PollutantCard';
import { ForecastChart } from '../components/ForecastChart';
import { InlineFeedbackBanner } from '../components/InlineFeedbackBanner';
import { MapPin, RefreshCw, AlertTriangle, Database, Info, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  data: AirQualityData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenLocation: () => void;
  currentLocation: LocationCoordinates | null;
  onNavigate?: (tab: NavTab) => void;
}

const formatTimestamp = (isoStr: string): string => {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return isoStr;
  }
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  loading,
  error,
  onRefresh,
  onOpenLocation,
  currentLocation,
  onNavigate
}) => {
  if (error && !data) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4 min-h-[540px] flex flex-col justify-center">
        <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 flex items-center justify-center mx-auto border border-rose-800">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-white">Environmental Data Fetch Failed</h1>
        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={onOpenLocation}
            className="px-4 py-2 rounded-xl bg-navy-800 border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            Change Location
          </button>
        </div>
      </div>
    );
  }

  const isInitialSkeleton = loading && !data;
  if (!isInitialSkeleton && !data) return null;

  const displayName = data?.location.name || currentLocation?.name || 'Fetching Station...';

  return (
    <div
      className="space-y-6 py-4"
      aria-busy={isInitialSkeleton ? 'true' : undefined}
      aria-label={isInitialSkeleton ? 'Loading live air quality dashboard' : undefined}
    >
      {/* Keep banner slot index-stable so Refresh/Error never reorders child fibers */}
      <div>
        {error && data && (
          <InlineFeedbackBanner
            variant="warning"
            message={`Live refresh encountered an issue (${error}). Displaying previously verified measurements.`}
            onRetry={onRefresh}
          />
        )}
      </div>

      {/* Location Bar & Status (height locked on mobile & desktop for 0.000 CLS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 min-h-[152px] sm:min-h-[82px] bg-navy-800/80 rounded-2xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {displayName}
              </h1>
              {data?.location.country && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-navy-900 text-slate-300 border border-slate-700">
                  {data.location.country}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5 min-h-[32px] sm:min-h-[18px]">
              {data ? (
                <>
                  <span>
                    Station Coords: {data.location.latitude.toFixed(2)}°N, {data.location.longitude.toFixed(2)}°E
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>Observed: {formatTimestamp(data.observedAt)}</span>
                </>
              ) : (
                <span>Connecting to Copernicus Atmosphere Monitoring Service &amp; Open-Meteo...</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center min-h-[34px]">
          {data?.isDemo && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-700">
              Deterministic Demo Data
            </span>
          )}
          {data?.isStale && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-700">
              Cached (Stale)
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-navy-900 border border-slate-700 text-slate-300 hover:text-white hover:border-teal-500/50 transition-colors"
            aria-label="Refresh environmental readings"
            title="Refresh environmental readings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenLocation}
            className="px-3 py-1.5 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-xs font-semibold text-slate-200 transition-colors"
          >
            Change Location
          </button>
        </div>
      </div>

      {/* Main AQI Hero Display */}
      {data ? (
        <AQIBadge
          aqi={data.aqi}
          category={data.category}
          categoryLabel={data.categoryLabel}
          standard={data.indexStandard}
          size="lg"
        />
      ) : (
        <div className="min-h-[348px] md:min-h-[208px] p-6 rounded-2xl border border-slate-700/60 bg-navy-800/60 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-300">
            Retrieving live atmospheric measurements for {currentLocation?.name || 'selected area'}...
          </span>
        </div>
      )}

      {/* Quick Feature Navigation Workflow */}
      {onNavigate && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('plan')}
            className="p-3.5 rounded-xl bg-gradient-to-r from-teal-900/50 to-emerald-950/50 border border-teal-500/40 hover:border-teal-400 text-left flex items-center justify-between group transition-all min-h-[62px]"
          >
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-teal-300">
                Personalized Daily Plan
              </span>
              <span className="text-[11px] text-slate-300">Time-bracketed routine for today</span>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="p-3.5 rounded-xl bg-gradient-to-r from-sky-900/50 to-navy-800 border border-sky-500/40 hover:border-sky-400 text-left flex items-center justify-between group transition-all min-h-[62px]"
          >
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-sky-300">
                Ask AI Assistant
              </span>
              <span className="text-[11px] text-slate-300">Grounded outdoor &amp; health guidance</span>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('indoor')}
            className="p-3.5 rounded-xl bg-gradient-to-r from-navy-800 to-navy-900 border border-slate-700 hover:border-amber-400 text-left flex items-center justify-between group transition-all min-h-[62px]"
          >
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-amber-300">
                Indoor Clean Air Zone
              </span>
              <span className="text-[11px] text-slate-300">HEPA sizing &amp; window ventilation</span>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Primary Pollutants Grid */}
      <section aria-labelledby="pollutants-heading">
        <div className="flex items-center justify-between mb-3 min-h-[28px]">
          <h2 id="pollutants-heading" className="text-lg font-bold text-white flex items-center gap-2">
            <span>Criteria Air Pollutants</span>
            <span className="text-xs font-normal text-slate-400">(Micrograms per cubic meter — µg/m³)</span>
          </h2>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>WHO 24-Hour Air Quality Benchmarks</span>
          </div>
        </div>

        {data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PollutantCard
              name="PM2.5"
              fullName="Fine Particulate Matter (≤2.5µm)"
              value={data.pollutants.pm2_5}
              whoStandardLimit={15}
              description="Penetrates deep into alveolar lung tissue and cardiovascular bloodstream."
            />
            <PollutantCard
              name="PM10"
              fullName="Coarse Particulate Matter (≤10µm)"
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(slot => (
              <div
                key={slot}
                className="min-h-[152px] rounded-xl bg-navy-800/60 border border-slate-700/50 animate-pulse"
              />
            ))}
          </div>
        )}
      </section>

      {/* 24-Hour Forecast Chart */}
      {data ? (
        <ForecastChart hourly={data.hourlyForecast} />
      ) : (
        <div className="h-[304px] rounded-xl bg-navy-800/60 border border-slate-700/50 animate-pulse" />
      )}

      {/* Attribution & Transparency Banner */}
      <div className="p-4 min-h-[52px] rounded-xl bg-navy-900 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {data ? (
          <>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>
                Data Source: <strong className="text-slate-300">{data.qualityMetadata.attribution}</strong>
              </span>
            </div>
            {data.qualityMetadata.notes && (
              <span className="text-[11px] text-slate-400 italic">
                Note: {data.qualityMetadata.notes}
              </span>
            )}
          </>
        ) : (
          <span>Verifying environmental attribution...</span>
        )}
      </div>
    </div>
  );
};
