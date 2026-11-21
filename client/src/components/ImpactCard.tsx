import React from 'react';
import { ImpactAssessment } from '@shared/types';
import { Shield, Leaf, Info, AlertCircle } from 'lucide-react';

interface ImpactCardProps {
  impact: ImpactAssessment;
  compact?: boolean;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({ impact, compact = false }) => {
  const { personalExposureBenefit, environmentalEmissionBenefit } = impact;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3">
      {/* 1. Personal Exposure Benefit */}
      <div className="bg-gradient-to-br from-navy-800 to-navy-900 border border-sky-500/30 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-500/20">
              <Shield className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Personal Exposure Benefit</span>
              <span className="block text-[11px] text-slate-400">Protects Individual Biological Health</span>
            </div>
          </div>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-500/30">
            {personalExposureBenefit.rating}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed mb-3">
          {personalExposureBenefit.explanation}
        </p>

        {!compact && personalExposureBenefit.pathways && personalExposureBenefit.pathways.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-700/40">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Biological Mechanisms:</span>
            {personalExposureBenefit.pathways.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="w-1 h-1 rounded-full bg-sky-400" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 italic">
          <Info className="w-3 h-3 text-sky-400/80 shrink-0" />
          <span>Status: {personalExposureBenefit.evidenceStatus}</span>
        </div>
      </div>

      {/* 2. Environmental Emission Benefit */}
      <div className="bg-gradient-to-br from-navy-800 to-navy-900 border border-emerald-500/30 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/20">
              <Leaf className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Environmental Emission Benefit</span>
              <span className="block text-[11px] text-slate-400">Reduces Citywide Source Pollution</span>
            </div>
          </div>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30">
            {environmentalEmissionBenefit.rating}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed mb-2">
          {environmentalEmissionBenefit.explanation}
        </p>

        {environmentalEmissionBenefit.estimatedKgCO2eAvoided !== undefined && (
          <div className="flex items-baseline gap-2 py-1 px-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/20 my-2">
            <span className="text-xs text-emerald-300 font-bold">Estimated Avoided Carbon:</span>
            <span className="text-sm font-extrabold text-emerald-400">
              ~{environmentalEmissionBenefit.estimatedKgCO2eAvoided} kg CO2e
            </span>
          </div>
        )}

        {!compact && (
          <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 space-y-1">
            <p className="flex items-start gap-1">
              <span className="font-semibold text-slate-300 shrink-0">Methodology:</span>
              <span className="line-clamp-2">{environmentalEmissionBenefit.methodology}</span>
            </p>
            <p className="flex items-start gap-1 text-slate-400">
              <AlertCircle className="w-3 h-3 text-emerald-400/80 shrink-0 mt-0.5" />
              <span>{environmentalEmissionBenefit.uncertaintyNotice}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

