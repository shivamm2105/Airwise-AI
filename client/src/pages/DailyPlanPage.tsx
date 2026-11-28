import React, { useState, useEffect, useCallback } from 'react';
import {
  AirQualityData,
  AISynthesisResponse,
  HouseholdPreferences,
  RecommendationActionItem
} from '@shared/types';
import { api, isAbortError } from '../services/api';
import { ActionCard } from '../components/ActionCard';
import { SafetyAlertBanner } from '../components/SafetyAlertBanner';
import { InlineFeedbackBanner } from '../components/InlineFeedbackBanner';
import {
  CalendarCheck,
  Sparkles,
  RefreshCw,
  Loader2
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
  const [actionFeedback, setActionFeedback] = useState<{ variant: 'error' | 'success'; message: string } | null>(null);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());

  const fetchPlan = useCallback(
    async (signal?: AbortSignal) => {
      if (!airQuality) return;
      setLoading(true);
      setError(null);

      try {
        const res = await api.generateDailyPlan(
          {
            latitude: airQuality.location.latitude,
            longitude: airQuality.location.longitude,
            locationName: airQuality.location.name,
            country: airQuality.location.country,
            region: airQuality.location.region,
            preferences: preferences || undefined
          },
          signal
        );
        setPlan(res);
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : 'Failed to generate daily action plan. Please try again.';
        setError(msg);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [airQuality, preferences]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPlan(controller.signal);
    return () => controller.abort();
  }, [fetchPlan]);

  // Sync saved status from backend persistence across tab switches
  useEffect(() => {
    api
      .getSavedActions()
      .then(saved => {
        setSavedTitles(new Set(saved.map(item => item.title)));
      })
      .catch(() => {
        // Non-fatal UI sync failure
      });
  }, []);

  const handleSaveAction = async (item: RecommendationActionItem) => {
    setActionFeedback(null);
    try {
      await api.saveAction({
        actionId: item.id,
        title: item.title,
        category: item.category,
        locationName: airQuality?.location.name || 'Current Location',
        aqiAtSave: airQuality?.aqi ?? null
      });
      setSavedTitles(prev => new Set(prev).add(item.title));
      setActionFeedback({ variant: 'success', message: `Saved "${item.title}" to your action checklist.` });
      if (onActionSaved) onActionSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save action right now.';
      setActionFeedback({ variant: 'error', message: msg });
    }
  };

  if (!airQuality) {
    return (
      <div className="py-16 text-center space-y-3">
        <CalendarCheck className="w-10 h-10 text-slate-500 mx-auto" aria-hidden="true" />
        <h1 className="text-lg font-bold text-white">Select a location to generate your Daily Action Plan</h1>
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
              <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-white">Personalized Daily Action Plan</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {plan?.summary || 'Synthesizing evidence-based daily routines tailored to current environmental conditions...'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPlan()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-xs font-semibold text-slate-200 flex items-center gap-2 self-start sm:self-center transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} aria-hidden="true" />
          <span>Regenerate Plan</span>
        </button>
      </div>

      {actionFeedback && (
        <InlineFeedbackBanner
          variant={actionFeedback.variant}
          message={actionFeedback.message}
          onDismiss={() => setActionFeedback(null)}
        />
      )}

      {loading && !plan && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3" aria-busy="true">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden="true" />
          <p className="text-xs text-slate-400">Applying deterministic safety constraints and AI synthesis...</p>
        </div>
      )}

      {error && (
        <InlineFeedbackBanner
          variant="error"
          message={error}
          onRetry={() => fetchPlan()}
        />
      )}

      {plan?.safetyEvaluation && <SafetyAlertBanner safety={plan.safetyEvaluation} />}

      {plan?.actions && plan.actions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <span>Evidence-Aware Action Schedule</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">{plan.actions.length} Tailored Actions</span>
          </div>

          <div className="space-y-5">
            {plan.actions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                isSaved={savedTitles.has(action.title)}
                onSave={handleSaveAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
