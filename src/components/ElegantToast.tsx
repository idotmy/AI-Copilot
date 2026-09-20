import React, { useEffect } from 'react';
import { X, AlertCircle, XCircle, Info, ExternalLink } from 'lucide-react';
import { CleanRpcError } from '../lib/errorHandler';

interface ElegantToastProps {
  error: CleanRpcError | null;
  onClose: () => void;
  autoCloseMs?: number;
}

export const ElegantToast: React.FC<ElegantToastProps> = ({
  error,
  onClose,
  autoCloseMs = 5000,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  useEffect(() => {
    if (!error) return;
    setShowDetails(false);
    // Auto dismiss after autoCloseMs if user rejected, slightly longer if revert
    const timer = setTimeout(() => {
      onClose();
    }, error.isUserRejection ? autoCloseMs : 7000);
    return () => clearTimeout(timer);
  }, [error, autoCloseMs, onClose]);

  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-xl transition-all ${
          error.isUserRejection
            ? 'bg-slate-900/95 text-slate-100 border-amber-500/30 shadow-amber-500/5'
            : 'bg-slate-900/95 text-slate-100 border-rose-500/40 shadow-rose-500/10'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              error.isUserRejection
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            {error.isUserRejection ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {error.title}
              </h4>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {error.message}
            </p>

            {error.technicalDetails && (
              <div className="mt-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  <span>{showDetails ? 'Hide Details' : 'Show Technical Details'}</span>
                </button>

                {showDetails && (
                  <pre className="mt-1.5 p-2 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {error.technicalDetails}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
