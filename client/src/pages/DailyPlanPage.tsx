import React, { useState, useEffect } from 'react';
import {
  AirQualityData,
  AISynthesisResponse,
  HouseholdPreferences,
  RecommendationActionItem
} from '@shared/types';
import { api } from '../services/api';
import { ImpactCard } from '../components/ImpactCard';
import { SafetyAlertBanner } from '../components/SafetyAlertBanner';
import {
  CalendarCheck,
  BookmarkPlus,
  Check,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface DailyPlanPageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
  onActionSaved?: () => void;
}

export const DailyPlanPage: React.FC<DailyPlanPageProps> = ({
  airQuality,
  preferences,
  onActionSaved
}) => {
  const [plan, setPlan] = useState<AISynthesisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedActionIds, setSavedActionIds] = useState<Set<string>>(new Set());

  const fetchPlan = async () => {
    if (!airQuality) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.generateDailyPlan({
        latitude: airQuality.location.latitude,
        longitude: airQuality.location.longitude,
        locationName: airQuality.location.name,
        country: airQuality.location.country,
        region: airQuality.location.region,
        preferences: preferences || undefined
      });
      setPlan(res);
    } catch {
      setError('Failed to generate daily action plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [airQuality?.location.latitude, airQuality?.location.longitude]);

  const handleSaveAction = async (item: RecommendationActionItem) => {
    try {
      await api.saveAction({
        actionId: item.id,
        title: item.title,
        category: item.category,
        locationName: airQuality?.location.name || 'Current Location',
        aqiAtSave: airQuality?.aqi ?? null
      });
      setSavedActionIds(prev => new Set(prev).add(item.id));
      if (onActionSaved) onActionSaved();
    } catch {
      alert('Unable to save action right now.');
    }
  };

  if (!airQuality) {
    return (
      <div className="py-16 text-center space-y-3">
        <CalendarCheck className="w-10 h-10 text-slate-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Select a location to generate your Daily Action Plan</h2>
        <p className="text-xs text-slate-400">AirWise AI customizes schedules based on live atmospheric readings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Personalized Daily Action Plan
            </h1>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {plan?.summary || 'Synthesizing evidence-based daily routines tailored to current environmental conditions...'}
          </p>
        </div>

        <button
          onClick={fetchPlan}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-xs font-semibold text-slate-200 flex items-center gap-2 self-start sm:self-center transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Regenerate Plan</span>
        </button>
      </div>

      {loading && !plan && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs text-slate-400">Applying deterministic safety constraints and AI synthesis...</p>
        </div>
      )}

      {error && !plan && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Safety Evaluation Advisories */}
      {plan?.safetyEvaluation && (
        <SafetyAlertBanner safety={plan.safetyEvaluation} />
      )}

      {/* Recommended Action Cards */}
      {plan?.actions && plan.actions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Evidence-Aware Action Schedule</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {plan.actions.length} Tailored Actions
            </span>
          </div>

          <div className="space-y-5">
            {plan.actions.map(action => {
              const isSaved = savedActionIds.has(action.id);
              return (
                <div
                  key={action.id}
                  className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-600 transition-all"
                >
                  {/* Action Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-700/60">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                          {action.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          ⏰ {action.timeframe}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {action.confidence}
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-white tracking-tight">
                        {action.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleSaveAction(action)}
                      disabled={isSaved}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        isSaved
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-navy-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-teal-500/50'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Saved to My Actions</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 text-teal-400" />
                          <span>Save Action</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* What & Why */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-navy-900/80 border border-slate-800">
                      <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block mb-1">
                        What To Do:
                      </span>
                      <p className="text-slate-200 leading-relaxed">{action.whatToDo}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-navy-900/80 border border-slate-800">
                      <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block mb-1">
                        Why It Matters:
                      </span>
                      <p className="text-slate-200 leading-relaxed">{action.whyItMatters}</p>
                    </div>
                  </div>

                  {/* Steps List */}
                  {action.steps && action.steps.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-navy-900/50 border border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Practical Implementation Steps:
                      </span>
                      <ol className="space-y-1.5 text-xs text-slate-200 list-decimal list-inside">
                        {action.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="ml-1 text-slate-300">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Dual Impact Explainer Card */}
                  <ImpactCard impact={action.impact} compact={false} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
