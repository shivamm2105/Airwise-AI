import React from 'react';
import { Wind, Activity, Flame, Zap, Droplets, Info } from 'lucide-react';

interface PollutantCardProps {
  name: string;
  fullName: string;
  value: number | null;
  unit?: string;
  whoStandardLimit?: number;
  description: string;
}

export const PollutantCard: React.FC<PollutantCardProps> = ({
  name,
  fullName,
  value,
  unit = 'µg/m³',
  whoStandardLimit,
  description
}) => {
  const getIcon = () => {
    switch (name) {
      case 'PM2.5':
      case 'PM10':
        return Wind;
      case 'NO2':
        return Flame;
      case 'SO2':
        return Activity;
      case 'O3':
        return Zap;
      case 'CO':
        return Droplets;
      default:
        return Info;
    }
  };

  const Icon = getIcon();
  const isAvailable = value !== null && !isNaN(value);

  // Determine status text & level
  let statusText = 'Measurement Unavailable';
  let statusColor = 'text-slate-400 bg-slate-800/60 border-slate-700';

  if (isAvailable && whoStandardLimit !== undefined) {
    if (value <= whoStandardLimit) {
      statusText = 'Within WHO Benchmark';
      statusColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
    } else if (value <= whoStandardLimit * 2.5) {
      statusText = 'Elevated vs Benchmark';
      statusColor = 'text-amber-400 bg-amber-950/60 border-amber-800/40';
    } else {
      statusText = 'Exceeds Health Benchmark';
      statusColor = 'text-red-400 bg-red-950/60 border-red-800/40';
    }
  }

  return (
    <div
      className="bg-navy-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between hover:border-teal-500/50 transition-all shadow-md"
      role="article"
      aria-label={`${fullName} reading: ${isAvailable ? `${value} ${unit}` : 'Unavailable'}`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-navy-700 text-teal-400">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-wide">{name}</span>
              <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">{fullName}</span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
            {statusText}
          </span>
        </div>

        <div className="mt-3">
          {isAvailable ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
              <span className="text-xs text-slate-400 font-medium">{unit}</span>
            </div>
          ) : (
            <div className="py-2">
              <span className="text-sm font-semibold text-slate-400 italic">Not Reported by Station</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="truncate" title={description}>{description}</span>
        {whoStandardLimit && (
          <span className="shrink-0 text-slate-400 font-medium ml-2">
            Ref: &le;{whoStandardLimit}
          </span>
        )}
      </div>
    </div>
  );
};
