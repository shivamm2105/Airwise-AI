import React, { useState } from 'react';
import { getStandardImpact } from '@shared/impact';
import { ImpactCard } from '../components/ImpactCard';
import { Scale, Shield, Leaf, Info } from 'lucide-react';

export const ImpactExplainerPage: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<
    | 'stay_indoors_hazardous'
    | 'wear_n95_respirator'
    | 'use_hepa_purifier'
    | 'close_windows_severe'
    | 'switch_to_transit'
    | 'trip_consolidation'
    | 'avoid_engine_idling'
    | 'avoid_indoor_incense'
  >('wear_n95_respirator');

  const impact = getStandardImpact(selectedCase, 15);

  const cases: Array<{
    id: typeof selectedCase;
    title: string;
    type: 'exposure' | 'emission' | 'both';
  }> = [
    { id: 'wear_n95_respirator', title: 'Wearing a Certified N95 Respirator', type: 'exposure' },
    { id: 'stay_indoors_hazardous', title: 'Canceling Outdoor Workout in Severe Smog', type: 'exposure' },
    { id: 'use_hepa_purifier', title: 'Running a HEPA Filter in the Bedroom', type: 'exposure' },
    { id: 'close_windows_severe', title: 'Closing Windows During Temperature Inversion', type: 'exposure' },
    { id: 'switch_to_transit', title: 'Switching Solo Commute to Metro / Transit', type: 'both' },
    { id: 'trip_consolidation', title: 'Trip Consolidation & Avoiding Cold Starts', type: 'both' },
    { id: 'avoid_engine_idling', title: 'Eliminating Engine Idling Outside Schools', type: 'both' },
    { id: 'avoid_indoor_incense', title: 'Eliminating Incense (Agarbatti) Indoors', type: 'exposure' }
  ];

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Scale className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Direct Impact Explanation Engine</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Scientific differentiation between Personal Exposure Shielding and Environmental Emission Abatement
            </p>
          </div>
        </div>

        {/* Methodology & Ethics Disclaimer */}
        <div className="mt-4 p-3.5 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <strong className="text-white">Scientific Distinction Principle:</strong>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              AirWise AI enforces strict scientific integrity. One individual wearing a respirator or staying indoors shields their own lungs from harm, but does NOT lower citywide outdoor AQI. Conversely, switching from private cars to mass transit reduces source tailpipe emissions. We never confuse personal self-protection with municipal emissions reductions, nor do we fabricate unverified pollution statistics.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Case Selector */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Select an Environmental Health Action to Inspect Impact:
          </h2>
          <span className="text-[11px] text-teal-400 font-medium">8 Verified Action Cases</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {cases.map(c => {
            const isSelected = selectedCase === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCase(c.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md font-bold'
                    : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      c.type === 'exposure'
                        ? 'bg-sky-950 text-sky-400 border border-sky-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {c.type === 'exposure' ? 'Exposure Shield' : 'Dual Impact'}
                  </span>
                </div>
                <span className="block text-xs text-white line-clamp-2">{c.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Action Detailed Dual Impact Display */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-700/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              Deep-Dive Analysis
            </span>
            <h2 className="text-xl font-extrabold text-white">
              {cases.find(c => c.id === selectedCase)?.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-navy-900 border border-slate-700 text-slate-300">
              Evidence Basis: Verified Literature
            </span>
          </div>
        </div>

        {/* Dual Impact Breakdown */}
        <ImpactCard impact={impact} compact={false} />
      </div>

      {/* Comparative Educational Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 border border-sky-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-500/30">
              <Shield className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-white">Category A: Personal Exposure Benefit</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Measures how an action forms a physical barrier between your respiratory system and ambient toxic pollutants.
          </p>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li>• <strong>Mechanism:</strong> Filtration (N95, HEPA) and avoidance of high-concentration areas.</li>
            <li>• <strong>Target:</strong> Protects alveolar lung sacs, endothelial blood vessels, and heart rate variability.</li>
            <li>• <strong>City Impact:</strong> Zero effect on ambient city AQI. It is an individual shield.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Leaf className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-white">Category B: Environmental Emission Benefit</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Measures how a choice directly eliminates source combustion emissions from fossil fuels and particulate generation.
          </p>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li>• <strong>Mechanism:</strong> Mode shift (taking the metro), trip chaining, and avoiding engine idling.</li>
            <li>• <strong>Target:</strong> Cuts kilograms of tailpipe CO2e and grams of exhaust PM2.5/NOx.</li>
            <li>• <strong>City Impact:</strong> Scales with community participation to improve regional air quality.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
