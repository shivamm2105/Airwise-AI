import React from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, X } from 'lucide-react';

interface InlineFeedbackBannerProps {
  variant: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancelConfirm?: () => void;
}

const VARIANT_STYLES: Record<InlineFeedbackBannerProps['variant'], string> = {
  error: 'bg-rose-950/70 border-rose-700/80 text-rose-200',
  success: 'bg-emerald-950/70 border-emerald-700/80 text-emerald-200',
  warning: 'bg-amber-950/70 border-amber-700/80 text-amber-200',
  info: 'bg-sky-950/70 border-sky-700/80 text-sky-200'
};

export const InlineFeedbackBanner: React.FC<InlineFeedbackBannerProps> = ({
  variant,
  message,
  onRetry,
  onDismiss,
  confirmLabel,
  onConfirm,
  onCancelConfirm
}) => {
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'info' ? Info : AlertCircle;

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${VARIANT_STYLES[variant]}`}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <Icon className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        <span className="leading-relaxed">{message}</span>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}

        {onConfirm && confirmLabel && (
          <>
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
            >
              {confirmLabel}
            </button>
            {onCancelConfirm && (
              <button
                type="button"
                onClick={onCancelConfirm}
                className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
            )}
          </>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg hover:bg-white/10 text-current transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
