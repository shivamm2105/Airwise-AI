import React from 'react';
import { SafetyEvaluation } from '@shared/types';
import { AlertOctagon, ShieldAlert, Wind, AlertTriangle } from 'lucide-react';

interface SafetyAlertBannerProps {
  safety: SafetyEvaluation;
}

export const SafetyAlertBanner: React.FC<SafetyAlertBannerProps> = ({ safety }) => {
  return (
    <div className="space-y-3 my-4" role="region" aria-label="Environmental Safety Advisories">
      {/* 1. Severe Smog Alert (if active) */}
      {safety.severeSmogAlert && (
        <div className="bg-rose-950/80 border-2 border-rose-600 rounded-xl p-4 flex items-start gap-3 shadow-xl">
          <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-300">
              Severe Smog Inversion Warning
            </h4>
            <p className="text-xs text-rose-100 mt-1 leading-relaxed">
              Hazardous outdoor atmospheric conditions detected. Strenuous outdoor workouts, jogging, and prolonged cycling must be eliminated. Move all aerobic activity indoors to prevent high-volume particulate lung deposition.
            </p>
          </div>
        </div>
      )}

      {/* 2. Respirator Guidance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* N95 Guidance */}
        <div className="bg-navy-800/90 border border-slate-700 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-500/20 shrink-0">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-teal-300 uppercase tracking-wider block">
              Respiratory Protection Standard
            </span>
            <p className="text-slate-300 mt-1 leading-relaxed">{safety.respiratorGuidance}</p>
          </div>
        </div>

        {/* Cloth Mask Reality Check */}
        <div className="bg-navy-800/90 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wider block">
              Respirator vs Cloth Mask Reality
            </span>
            <p className="text-slate-300 mt-1 leading-relaxed">{safety.clothMaskWarning}</p>
          </div>
        </div>
      </div>

      {/* 3. Ventilation Decision */}
      <div className="bg-navy-800/90 border border-slate-700 rounded-xl p-3.5 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-500/20 shrink-0">
          <Wind className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-300 uppercase tracking-wider">
              Indoor Ventilation Timing:
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                safety.ventilationDecision.recommended
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
              }`}
            >
              {safety.ventilationDecision.recommended ? 'Natural Ventilation Safe' : 'Keep Windows Closed'}
            </span>
          </div>
          <p className="text-slate-300 mt-1 leading-relaxed">{safety.ventilationDecision.reason}</p>
        </div>
      </div>
    </div>
  );
};
