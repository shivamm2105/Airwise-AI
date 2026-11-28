import React from 'react';
import { HourlyForecastPoint } from '@shared/types';
import { Clock } from 'lucide-react';

interface ForecastChartProps {
  hourly: HourlyForecastPoint[];
}

function getBarColorClass(aqi: number | null): string {
  if (aqi === null) return 'text-slate-600';
  if (aqi <= 50) return 'text-emerald-500 group-hover:text-emerald-400';
  if (aqi <= 100) return 'text-amber-500 group-hover:text-amber-400';
  if (aqi <= 150) return 'text-orange-500 group-hover:text-orange-400';
  if (aqi <= 200) return 'text-red-500 group-hover:text-red-400';
  if (aqi <= 300) return 'text-purple-500 group-hover:text-purple-400';
  return 'text-rose-700 group-hover:text-rose-600';
}

function formatHour(isoStr: string): string {
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) {
    return isoStr.length >= 16 ? isoStr.substring(11, 16) : isoStr;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const ForecastChart: React.FC<ForecastChartProps> = React.memo(({ hourly }) => {
  if (!hourly || hourly.length === 0) {
    return (
      <div className="p-8 text-center bg-navy-800/60 rounded-xl border border-slate-700/60 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p className="text-sm">Hourly forecast data is not provided by this monitoring station.</p>
      </div>
    );
  }

  const maxAqi = Math.max(...hourly.map(h => h.aqi ?? 0), 100);

  return (
    <div className="bg-navy-800/90 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" aria-hidden="true" />
            <span>24-Hour Pollution Forecast &amp; Trends</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Model-derived particulate dynamics across daily morning and evening traffic peaks
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-300 overflow-x-auto pb-1 sm:pb-0">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> Good</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" /> Moderate</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" aria-hidden="true" /> Sensitive</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden="true" /> Unhealthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-700" aria-hidden="true" /> Severe</span>
        </div>
      </div>

      <div
        className="flex items-end gap-1.5 sm:gap-2 h-48 pt-6 pb-2 overflow-x-auto"
        role="region"
        aria-label="24-hour Air Quality Forecast Chart"
      >
        {hourly.map((pt, idx) => {
          const val = pt.aqi ?? 0;
          const heightPercent = Math.max(12, Math.round((val / maxAqi) * 100));
          const timeLabel = formatHour(pt.time);
          const shortTime = timeLabel.replace(':00 ', ' ');
          const visibleValue = pt.aqi ?? '—';

          return (
            <button
              type="button"
              key={`${pt.time}-${idx}`}
              className="flex-1 min-w-[36px] sm:min-w-[44px] flex flex-col items-center justify-end h-full group relative text-center bg-transparent border-0 p-0 cursor-default rounded-md"
            >
              <div
                aria-hidden="true"
                className="absolute bottom-full mb-2 hidden group-hover:flex group-focus-visible:flex flex-col items-center pointer-events-none z-20"
              >
                <div className="bg-navy-950 border border-slate-600 rounded-lg p-2 text-xs shadow-2xl text-center whitespace-nowrap min-w-[110px]">
                  <span className="font-bold text-white block">{timeLabel}</span>
                  <span className="text-teal-400 font-extrabold text-sm block">AQI: {pt.aqi ?? 'N/A'}</span>
                  {pt.pm2_5 !== null && (
                    <span className="text-[11px] text-slate-300 block">PM2.5: {pt.pm2_5} µg/m³</span>
                  )}
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">{pt.category}</span>
                </div>
                <div className="w-2 h-2 bg-navy-950 border-r border-b border-slate-600 transform rotate-45 -mt-1" />
              </div>

              <span className="text-[10px] font-bold text-slate-300 mb-1 group-hover:text-white">
                {visibleValue}
              </span>
              <svg
                viewBox="0 0 10 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={`w-full flex-1 block ${getBarColorClass(pt.aqi)} transition-colors duration-200`}
              >
                <rect x="0" y={100 - heightPercent} width="10" height={heightPercent} rx="1.5" fill="currentColor" />
              </svg>
              <span className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-full">
                {shortTime}
              </span>
              <span className="sr-only">
                {` — Air Quality Index: ${pt.aqi ?? 'Unavailable'}, PM2.5: ${pt.pm2_5 ?? 'N/A'} µg/m³`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

ForecastChart.displayName = 'ForecastChart';
