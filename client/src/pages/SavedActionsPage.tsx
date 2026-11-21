import React, { useState, useEffect } from 'react';
import { SavedActionRecord } from '@shared/types';
import { api } from '../services/api';
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

interface SavedActionsPageProps {
  onRefresh?: () => void;
}

export const SavedActionsPage: React.FC<SavedActionsPageProps> = () => {
  const [actions, setActions] = useState<SavedActionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchActions = async () => {
    setLoading(true);
    try {
      const items = await api.getSavedActions();
      setActions(items);
    } catch {
      console.warn('Failed to load saved actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.toggleActionCompletion(id);
      setActions(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch {
      alert('Unable to update action completion status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAction(id);
      setActions(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Unable to delete action.');
    }
  };

  const handleExport = async () => {
    try {
      const summary = await api.exportSummary();
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airwise-actions-summary-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export summary report.');
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
            <BookmarkCheck className="w-5 h-5" />
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

        <button
          onClick={handleExport}
          disabled={actions.length === 0}
          className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-teal-500/50 text-slate-200 text-xs font-semibold flex items-center gap-2 disabled:opacity-40 transition-colors self-start sm:self-center"
        >
          <Download className="w-4 h-4 text-teal-400" />
          <span>Export Summary Report</span>
        </button>
      </div>

      {/* Progress & Stats Card */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">
            Overall Action Completion Rate
          </span>
          <span className="text-teal-400 font-extrabold text-sm">
            {completedCount} of {actions.length} Completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full h-3 bg-navy-950 rounded-full overflow-hidden border border-slate-800"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all' ? 'bg-teal-600 text-white' : 'bg-navy-900 text-slate-400'
              }`}
            >
              All ({actions.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'pending' ? 'bg-teal-600 text-white' : 'bg-navy-900 text-slate-400'
              }`}
            >
              Pending ({actions.length - completedCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'completed' ? 'bg-teal-600 text-white' : 'bg-navy-900 text-slate-400'
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
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="p-12 text-center bg-navy-800/40 rounded-2xl border border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No actions in this view</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You can bookmark recommendations from the Daily Action Plan page to track them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Saved Actions List">
          {filteredActions.map(action => (
            <div
              key={action.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all shadow-md ${
                action.completed
                  ? 'bg-navy-900/60 border-slate-800/80 opacity-80'
                  : 'bg-navy-800/80 border-slate-700/80'
              }`}
            >
              {/* Checkbox & Details */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  onClick={() => handleToggle(action.id)}
                  className="p-1 text-slate-400 hover:text-teal-400 focus:outline-none shrink-0"
                  aria-label={action.completed ? `Mark "${action.title}" incomplete` : `Mark "${action.title}" complete`}
                >
                  {action.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-500 hover:text-teal-400" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {action.category}
                    </span>
                    {action.aqiAtSave !== null && (
                      <span className="text-[10px] text-slate-400">
                        AQI at save: {action.aqiAtSave}
                      </span>
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
                      <MapPin className="w-3 h-3 text-teal-400" />
                      {action.locationName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
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

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(action.id)}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 focus:outline-none shrink-0 transition-colors"
                aria-label={`Delete action "${action.title}"`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Transparency Note */}
      <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Local Persistence Notice:</strong> Actions and preferences are retained securely in your current workspace database. No cloud trackers or third-party behavioral profiling scripts are executed. You can export or clear your action records anytime.
        </p>
      </div>
    </div>
  );
};

