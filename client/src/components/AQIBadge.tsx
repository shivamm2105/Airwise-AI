import React from 'react';
import { AQICategory, AQIStandard } from '@shared/types';
import { ShieldAlert, ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface AQIBadgeProps {
  aqi: number | null;
  category: AQICategory;
  categoryLabel: string;
  standard: AQIStandard;
  size?: 'sm' | 'md' | 'lg';
}

export const AQIBadge: React.FC<AQIBadgeProps> = ({
  aqi,
  category,
  categoryLabel,
  standard,
  size = 'md'
}) => {
  const getBadgeConfig = () => {
    switch (category) {
      case 'GOOD':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
          indicator: 'bg-emerald-500',
          icon: ShieldCheck,
          textPrefix: 'Category: Good'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
          indicator: 'bg-amber-500',
          icon: AlertTriangle,
          textPrefix: 'Category: Moderate'
        };
      case 'UNHEALTHY_SENSITIVE':
        return {
          bg: 'bg-orange-950/70 border-orange-500/40 text-orange-300',
          indicator: 'bg-orange-500',
          icon: AlertTriangle,
          textPrefix: 'Category: Unhealthy for Sensitive'
        };
      case 'UNHEALTHY':
        return {
          bg: 'bg-red-950/70 border-red-500/40 text-red-300',
          indicator: 'bg-red-500',
          icon: ShieldAlert,
          textPrefix: 'Category: Unhealthy'
        };
      case 'VERY_UNHEALTHY':
        return {
          bg: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
          indicator: 'bg-purple-500',
          icon: AlertOctagon,
          textPrefix: 'Category: Very Unhealthy'
        };
      case 'HAZARDOUS':
        return {
          bg: 'bg-rose-950/90 border-rose-600 text-rose-200 animate-pulse',
          indicator: 'bg-rose-600',
          icon: AlertOctagon,
          textPrefix: 'Category: Hazardous'
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-600 text-slate-300',
          indicator: 'bg-slate-500',
          icon: HelpCircle,
          textPrefix: 'Status: Unavailable'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  if (size === 'lg') {
    return (
      <div
        className={`flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl border ${config.bg} shadow-xl backdrop-blur-md`}
        role="region"
        aria-label={`Air Quality Index: ${aqi ?? 'Unavailable'}, ${categoryLabel}`}
      >
        <div className="flex flex-col items-center justify-center p-6 bg-navy-900/80 rounded-2xl border border-white/10 min-w-[160px]">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            {standard.replace('_', ' ')}
          </span>
          <span className="text-6xl font-extrabold tracking-tight mt-1">
            {aqi !== null ? aqi : '—'}
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-3 h-3 rounded-full ${config.indicator}`} aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">{standard}</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-white/10 mb-2">
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span>{categoryLabel}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {aqi !== null ? `${categoryLabel} Air Quality` : 'Environmental Reading Pending'}
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
            {category === 'HAZARDOUS' && 'Emergency health conditions: Avoid all outdoor exertion. Keep living spaces sealed and run HEPA air filtration.'}
            {category === 'VERY_UNHEALTHY' && 'Serious health risk for everyone. Cancel outdoor activities and wear an airtight N95 respirator if traveling.'}
            {category === 'UNHEALTHY' && 'General public may experience irritation; sensitive groups face elevated cardiovascular and lung strain.'}
            {category === 'UNHEALTHY_SENSITIVE' && 'Children, elderly individuals, and those with respiratory sensitivities should reduce extended outdoor exertion.'}
            {category === 'MODERATE' && 'Air quality is acceptable. Extremely sensitive individuals should observe personal breathing comfort.'}
            {category === 'GOOD' && 'Clean outdoor air. Ideal conditions for outdoor ventilation, active commuting, and outdoor exercise.'}
            {category === 'UNKNOWN' && 'Official air quality sensor data is currently compiling for this station.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${config.bg}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full ${config.indicator}`} aria-hidden="true" />
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{aqi !== null ? `${aqi} • ${categoryLabel}` : 'Data Unavailable'}</span>
    </div>
  );
};
