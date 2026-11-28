import React, { useState, useEffect } from 'react';
import { AirQualityData, HouseholdPreferences, ImpactCalculationResult } from '@shared/types';
import { api, isAbortError } from '../services/api';
import { InlineFeedbackBanner } from '../components/InlineFeedbackBanner';
import {
  Bike,
  Bus,
  Car,
  Footprints,
  Laptop,
  Leaf,
  Scale,
  Sparkles,
  Info,
  Clock,
  AlertOctagon
} from 'lucide-react';

interface SustainablePlannerPageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
}

type CommuteModeOption = 'public_transit' | 'carpool' | 'bicycle' | 'walk' | 'work_from_home';

const MODE_TITLES: Record<CommuteModeOption, string> = {
  public_transit: 'Switch Solo Car Commute to Metro / Transit',
  carpool: 'Share Vehicle Rides via 2+ Person Carpool',
  bicycle: 'Active Cycling Commute (When AQI Permits)',
  walk: 'Active Walking Routine for Short Trips',
  work_from_home: 'Work From Home to Eliminate Tailpipe Travel'
};

export const SustainablePlannerPage: React.FC<SustainablePlannerPageProps> = ({ airQuality }) => {
  const [distanceKm, setDistanceKm] = useState<number>(12);
  const [selectedAlternative, setSelectedAlternative] = useState<CommuteModeOption>('public_transit');
  const [impactResult, setImpactResult] = useState<ImpactCalculationResult | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const outdoorAQI = airQuality?.aqi ?? 120;
  const isOutdoorUnhealthy = outdoorAQI > 150;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.calculateImpact(
          {
            distanceKm,
            originalMode: 'car_alone',
            alternativeMode: selectedAlternative
          },
          controller.signal
        );
        setImpactResult(res);
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          const msg = err instanceof Error ? err.message : 'Unable to calculate commute emissions right now.';
          setSaveFeedback({ variant: 'error', message: msg });
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [distanceKm, selectedAlternative]);

  const handleSaveCommuteAction = async () => {
    setSaveFeedback(null);
    try {
      const modeTitle = MODE_TITLES[selectedAlternative];
      await api.saveAction({
        actionId: `act-commute-${selectedAlternative}`,
        title: modeTitle,
        category: 'commute',
        locationName: airQuality?.location.name || 'Current City',
        aqiAtSave: airQuality?.aqi ?? null
      });
      setSaveFeedback({ variant: 'success', message: `Added "${modeTitle}" to your saved checklist.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save commute action right now.';
      setSaveFeedback({ variant: 'error', message: msg });
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Bike className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Sustainable Living &amp; Clean Commute Planner</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Calculate avoided tailpipe emissions and choose climate-friendly daily habits
            </p>
          </div>
        </div>
      </div>

      {/* Safety Guardrail Alert for Active Commuting */}
      {isOutdoorUnhealthy && (selectedAlternative === 'bicycle' || selectedAlternative === 'walk') && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-600 flex items-start gap-3 shadow-lg"
        >
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
          <div className="text-xs">
            <strong className="text-rose-200 block text-sm font-bold">
              Health Safety Guardrail: Active Travel Not Recommended Today
            </strong>
            <p className="text-rose-100 mt-1 leading-relaxed">
              Outdoor air quality is currently Unhealthy/Hazardous (AQI: {outdoorAQI}). While walking or cycling produces zero tailpipe emissions, the high respiratory rate causes massive lung deposition of fine particulate matter (PM2.5). Please choose enclosed public transit (metro or bus) wearing a certified N95 respirator today.
            </p>
          </div>
        </div>
      )}

      {saveFeedback && (
        <InlineFeedbackBanner
          variant={saveFeedback.variant}
          message={saveFeedback.message}
          onDismiss={() => setSaveFeedback(null)}
        />
      )}

      {/* Interactive Commute Emission Calculator */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Interactive Clean Commute Calculator</span>
          </h2>
          <span className="text-[11px] text-slate-400">Baseline: 1 Single-Occupant Petrol Car</span>
        </div>

        {/* Distance Slider */}
        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="commute-distance-range" className="font-semibold text-slate-300">
              Roundtrip Daily Commute Distance:
            </label>
            <span className="text-lg font-extrabold text-teal-400">{distanceKm} km</span>
          </div>
          <input
            id="commute-distance-range"
            aria-label="Roundtrip Daily Commute Distance in kilometers"
            type="range"
            min="2"
            max="60"
            step="1"
            value={distanceKm}
            onChange={e => setDistanceKm(Math.min(60, Math.max(2, Number(e.target.value) || 2)))}
            className="w-full accent-teal-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>2 km (Short Local Trip)</span>
            <span>30 km (Suburban Commute)</span>
            <span>60 km (Long Metropolitan Loop)</span>
          </div>
        </div>

        {/* Alternative Mode Selection */}
        <div>
          <span id="commute-alt-group-label" className="text-xs font-semibold text-slate-300 block mb-2">
            Select Clean Travel Alternative:
          </span>
          <div
            role="group"
            aria-labelledby="commute-alt-group-label"
            className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs"
          >
            <button
              type="button"
              aria-pressed={selectedAlternative === 'public_transit'}
              onClick={() => setSelectedAlternative('public_transit')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedAlternative === 'public_transit'
                  ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md'
                  : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Bus className="w-5 h-5 text-teal-400" aria-hidden="true" />
              <span className="font-bold">Public Transit</span>
              <span className="text-[10px] text-slate-400">Metro / City Bus</span>
            </button>

            <button
              type="button"
              aria-pressed={selectedAlternative === 'carpool'}
              onClick={() => setSelectedAlternative('carpool')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedAlternative === 'carpool'
                  ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md'
                  : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Car className="w-5 h-5 text-teal-400" aria-hidden="true" />
              <span className="font-bold">Carpooling</span>
              <span className="text-[10px] text-slate-400">2+ Shared Seats</span>
            </button>

            <button
              type="button"
              aria-pressed={selectedAlternative === 'bicycle'}
              onClick={() => setSelectedAlternative('bicycle')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedAlternative === 'bicycle'
                  ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md'
                  : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Bike className="w-5 h-5 text-teal-400" aria-hidden="true" />
              <span className="font-bold">Bicycle</span>
              <span className="text-[10px] text-slate-400">Active Zero-Emission</span>
            </button>

            <button
              type="button"
              aria-pressed={selectedAlternative === 'walk'}
              onClick={() => setSelectedAlternative('walk')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedAlternative === 'walk'
                  ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md'
                  : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Footprints className="w-5 h-5 text-teal-400" aria-hidden="true" />
              <span className="font-bold">Walking</span>
              <span className="text-[10px] text-slate-400">Active Local Walk</span>
            </button>

            <button
              type="button"
              aria-pressed={selectedAlternative === 'work_from_home'}
              onClick={() => setSelectedAlternative('work_from_home')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedAlternative === 'work_from_home'
                  ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-md'
                  : 'bg-navy-900 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Laptop className="w-5 h-5 text-teal-400" aria-hidden="true" />
              <span className="font-bold">Remote / WFH</span>
              <span className="text-[10px] text-slate-400">Zero Commute</span>
            </button>
          </div>
        </div>

        {/* Calculation Result Breakdown */}
        {impactResult && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-navy-900 to-navy-900 border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Calculated Environmental Benefit
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Direct Pollution Avoidance per Trip</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Avoided Greenhouse Gas</span>
                  <span className="text-2xl font-black text-emerald-400">{impactResult.avoidedKgCO2e} kg CO2e</span>
                </div>
                <div className="text-right border-l border-slate-700 pl-4">
                  <span className="text-[11px] text-slate-400 block">Avoided Tailpipe Soot</span>
                  <span className="text-2xl font-black text-teal-400">
                    {impactResult.avoidedGramsExhaustPM} g PM2.5
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Methodology:</strong> {impactResult.methodology}
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Assumptions:</strong> {impactResult.assumptions}
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-slate-400 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                <span>{impactResult.uncertaintyRange}</span>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveCommuteAction}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                {saveFeedback?.variant === 'success' ? (
                  <span>Saved to My Actions!</span>
                ) : (
                  <span>Commit this Commute Habit to My Plan</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Key Household Sustainability Habits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center mb-1">
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-white">Zero Engine Idling</h3>
          <p className="text-slate-300 leading-relaxed">
            Turn off your vehicle engine if waiting for more than 10 seconds outside schools, traffic queues, or drive-thrus. Engine idling burns 1.0-1.8 L/hr without moving, producing dense local micro-plumes of toxic carbon monoxide and benzene.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1">
            <Leaf className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-white">Trip Chaining &amp; Consolidation</h3>
          <p className="text-slate-300 leading-relaxed">
            Cold engine starts emit 3-5 times more carbon and particulates during the first 5 minutes until the catalytic converter reaches 300°C. Group multiple errands into one continuous loop instead of taking multiple isolated trips.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center mb-1">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-white">HVAC &amp; Purifier Efficiency</h3>
          <p className="text-slate-300 leading-relaxed">
            Clean coarse pre-filters monthly. Dust-clogged filters force blower motors to draw up to 25% more electricity while cutting clean airflow in half. Keeping pre-filters clean minimizes indirect grid emissions.
          </p>
        </div>
      </div>
    </div>
  );
};
