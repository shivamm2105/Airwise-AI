import React from 'react';
import { HourlyForecastPoint } from '@shared/types';
import { Clock } from 'lucide-react';

interface ForecastChartProps {
  hourly: HourlyForecastPoint[];
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ hourly }) => {
  if (!hourly || hourly.length === 0) {
    return (
      <div className="p-8 text-center bg-navy-800/60 rounded-xl border border-slate-700/60 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Hourly forecast data is not provided by this monitoring station.</p>
      </div>
    );
  }

  // Find max AQI for scaling
  const maxAqi = Math.max(...hourly.map(h => h.aqi ?? 0), 100);

  const getColorClass = (aqi: number | null) => {
    if (aqi === null) return 'bg-slate-600';
    if (aqi <= 50) return 'bg-emerald-500 hover:bg-emerald-400';
    if (aqi <= 100) return 'bg-amber-500 hover:bg-amber-400';
    if (aqi <= 150) return 'bg-orange-500 hover:bg-orange-400';
    if (aqi <= 200) return 'bg-red-500 hover:bg-red-400';
    if (aqi <= 300) return 'bg-purple-500 hover:bg-purple-400';
    return 'bg-rose-700 hover:bg-rose-600';
  };

  const formatHour = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoStr.substring(11, 16);
    }
  };

  return (
    <div className="bg-navy-800/90 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            24-Hour Pollution Forecast & Trends
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Model-derived particulate dynamics across daily morning and evening traffic peaks
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-300 overflow-x-auto pb-1 sm:pb-0">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Good</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Sensitive</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Unhealthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-700" /> Severe</span>
        </div>
      </div>

      <div
        className="flex items-end gap-1.5 sm:gap-2 h-48 pt-6 pb-2 overflow-x-auto"
        role="region"
        aria-label="24-hour Air Quality Forecast Chart"
        tabIndex={0}
      >
        {hourly.map((pt, idx) => {
          const val = pt.aqi ?? 0;
          const heightPercent = Math.max(12, Math.round((val / maxAqi) * 100));
          const timeLabel = formatHour(pt.time);

          return (
            <div
              key={idx}
              className="flex-1 min-w-[36px] sm:min-w-[44px] flex flex-col items-center justify-end h-full group relative focus:outline-none"
              tabIndex={0}
              role="figure"
              aria-label={`Time: ${timeLabel}, AQI: ${pt.aqi ?? 'Unavailable'}, PM2.5: ${pt.pm2_5 ?? 'N/A'} µg/m³`}
            >
              {/* Tooltip on hover/focus */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex group-focus:flex flex-col items-center pointer-events-none z-20">
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

              {/* Bar */}
              <span className="text-[10px] font-bold text-slate-300 mb-1 group-hover:text-white">
                {pt.aqi ?? '—'}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-200 ${getColorClass(pt.aqi)}`}
                style={{ height: `${heightPercent}%` }}
              />

              {/* Time Label */}
              <span className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-full">
                {timeLabel.replace(':00 ', ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
