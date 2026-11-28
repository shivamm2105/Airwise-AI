import React from 'react';
import { RecommendationActionItem } from '@shared/types';
import { ImpactCard } from './ImpactCard';
import { BookmarkPlus, Check } from 'lucide-react';

interface ActionCardProps {
  action: RecommendationActionItem;
  isSaved: boolean;
  onSave: (action: RecommendationActionItem) => void;
}

export const ActionCard: React.FC<ActionCardProps> = React.memo(({ action, isSaved, onSave }) => {
  return (
    <article className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-600 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
              {action.category.replace('_', ' ')}
            </span>
            <span className="text-xs font-semibold text-slate-300">⏰ {action.timeframe}</span>
            <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              {action.confidence}
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white tracking-tight">{action.title}</h3>
        </div>

        <button
          type="button"
          onClick={() => onSave(action)}
          disabled={isSaved}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            isSaved
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              : 'bg-navy-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-teal-500/50'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Saved to My Actions</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
              <span>Save Action</span>
            </>
          )}
        </button>
      </div>

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

      <ImpactCard impact={action.impact} compact={false} />
    </article>
  );
});

ActionCard.displayName = 'ActionCard';
