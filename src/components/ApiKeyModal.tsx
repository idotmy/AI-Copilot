import React, { useState, useEffect } from 'react';
import { Key, Check, Shield, ExternalLink, X, Zap } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
}) => {
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(inputValue.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setInputValue('');
    onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-[#21262D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Connect Your Gemini AI Key
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8B949E]">
                Bring Your Own Key (BYOK) for unmetered AI actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21262D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D] space-y-2">
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8B949E]">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Your API key is stored strictly inside your browser's local storage and used directly for tool calling on your behalf.
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-cyan-400 font-medium hover:underline pt-1"
            >
              <span>Get a free Gemini API key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 dark:text-[#C9D1D9] mb-1.5">
              Gemini API Key (AIzaSy...)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste your key here (e.g. AIzaSy...)"
                className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-[#080B10] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Key Connected Successfully!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Save & Connect Key</span>
                </>
              )}
            </button>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
