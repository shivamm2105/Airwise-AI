import React, { useState, useEffect } from 'react';
import { SavedActionRecord } from '@shared/types';
import { api } from '../services/api';
import { InlineFeedbackBanner } from '../components/InlineFeedbackBanner';
import {
  BookmarkCheck,
  CheckCircle2,
  Circle,
  Trash2,
  Download,
  Calendar,
  MapPin,
  Sparkles,
  Loader2,
  Info
} from 'lucide-react';

export const SavedActionsPage: React.FC = () => {
  const [actions, setActions] = useState<SavedActionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: 'error' | 'success'; message: string } | null>(null);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const items = await api.getSavedActions();
      setActions(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved actions.';
      setFeedback({ variant: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleToggle = async (id: string) => {
    setFeedback(null);
    try {
      const updated = await api.toggleActionCompletion(id);
      setActions(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update action completion status.';
      setFeedback({ variant: 'error', message: msg });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      await api.deleteAction(id);
      setActions(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to delete action.';
      setFeedback({ variant: 'error', message: msg });
    }
  };

  const handleConfirmClearAll = async () => {
    setConfirmClearAll(false);
    setFeedback(null);
    try {
      await api.clearAllActions();
      setActions([]);
      setFeedback({ variant: 'success', message: 'All saved actions cleared.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to clear saved actions.';
      setFeedback({ variant: 'error', message: msg });
    }
  };

  const handleExport = async () => {
    setFeedback(null);
    try {
      const summary = await api.exportSummary();
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airwise-actions-summary-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({ variant: 'success', message: 'Action summary exported as JSON.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export summary report.';
      setFeedback({ variant: 'error', message: msg });
    }
  };

  const completedCount = actions.filter(a => a.completed).length;
  const progressPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  const filteredActions =
    filter === 'all'
      ? actions
      : filter === 'completed'
      ? actions.filter(a => a.completed)
      : actions.filter(a => !a.completed);

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <BookmarkCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>My Saved Environmental Health Actions</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Track completed personal exposure and sustainability routines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => actions.length > 0 && setConfirmClearAll(true)}
            disabled={actions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-rose-500/50 hover:text-rose-300 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            title="Remove all saved actions from local storage"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={actions.length === 0}
            className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-slate-200 text-xs font-semibold flex items-center gap-2 disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4 text-teal-400" aria-hidden="true" />
            <span>Export Summary</span>
          </button>
        </div>
      </div>

      {confirmClearAll && (
        <InlineFeedbackBanner
          variant="warning"
          message="Are you sure you want to remove all saved actions? This action cannot be undone."
          confirmLabel="Confirm Clear All"
          onConfirm={handleConfirmClearAll}
          onCancelConfirm={() => setConfirmClearAll(false)}
        />
      )}

      {feedback && (
        <InlineFeedbackBanner
          variant={feedback.variant}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Progress & Stats Card */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">Overall Action Completion Rate</span>
          <span className="text-teal-400 font-extrabold text-sm">
            {completedCount} of {actions.length} Completed ({progressPercent}%)
          </span>
        </div>

        <div
          className="w-full h-3 bg-navy-950 rounded-full overflow-hidden border border-slate-800"
          role="progressbar"
          aria-label="Action completion progress"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2" role="group" aria-label="Filter saved actions">
            <button
              type="button"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all' ? 'bg-teal-700 text-white' : 'bg-navy-900 text-slate-300'
              }`}
            >
              All ({actions.length})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'pending'}
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'pending' ? 'bg-teal-700 text-white' : 'bg-navy-900 text-slate-300'
              }`}
            >
              Pending ({actions.length - completedCount})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'completed'}
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'completed' ? 'bg-teal-700 text-white' : 'bg-navy-900 text-slate-300'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Action List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" aria-hidden="true" />
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="p-12 text-center bg-navy-800/40 rounded-2xl border border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-500 mx-auto" aria-hidden="true" />
          <h2 className="text-base font-bold text-white">No actions in this view</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You can bookmark recommendations from the Daily Action Plan page to track them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Saved Actions List">
          {filteredActions.map(action => (
            <div
              key={action.id}
              role="listitem"
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all shadow-md ${
                action.completed
                  ? 'bg-navy-900/60 border-slate-800/80 opacity-80'
                  : 'bg-navy-800/80 border-slate-700/80'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggle(action.id)}
                  className="p-1 text-slate-400 hover:text-teal-400 shrink-0 rounded-full"
                  aria-label={action.completed ? `Mark "${action.title}" incomplete` : `Mark "${action.title}" complete`}
                >
                  {action.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-500 hover:text-teal-400" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {action.category}
                    </span>
                    {action.aqiAtSave !== null && (
                      <span className="text-[10px] text-slate-400">AQI at save: {action.aqiAtSave}</span>
                    )}
                  </div>
                  <h3
                    className={`text-sm font-bold truncate ${
                      action.completed ? 'line-through text-slate-400' : 'text-white'
                    }`}
                  >
                    {action.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-400" aria-hidden="true" />
                      {action.locationName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      Saved: {new Date(action.savedAt).toLocaleDateString()}
                    </span>
                    {action.completedAt && (
                      <span className="text-emerald-400">
                        • Done: {new Date(action.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(action.id)}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 shrink-0 transition-colors"
                aria-label={`Delete action "${action.title}"`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Transparency Note */}
      <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>Local Persistence Notice:</strong> Actions and preferences are retained securely in your current workspace database. No cloud trackers or third-party behavioral profiling scripts are executed. You can export or clear your action records anytime.
        </p>
      </div>
    </div>
  );
};
