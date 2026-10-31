import React, { useState } from 'react';
import { Download, MoreVertical, Share2, X } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export const InstallAppButton: React.FC = () => {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (canInstall) {
      await install();
      return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-[#0D5A31] bg-emerald-50 px-4 py-2.5 text-xs font-bold text-[#0D5A31] transition-colors hover:bg-emerald-100 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] focus:ring-offset-2"
        aria-label="Install PLC on this device"
      >
        <Download className="h-4 w-4" />
        <span>{canInstall ? 'Add PLC to Home Screen' : 'How to Add PLC to Home Screen'}</span>
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close install instructions"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 pr-6">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0D5A31]">Use PLC like an app</p>
              <h2 id="install-help-title" className="font-heading text-xl font-bold text-[#071F25]">Add PLC to your Home Screen</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Your browser does not show the automatic install prompt here, so use the browser menu once.
              </p>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex gap-3 rounded-xl bg-emerald-50 p-3">
                <MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-[#0D5A31]" />
                <p><strong className="text-[#071F25]">Android:</strong> open your browser menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
              </div>
              <div className="flex gap-3 rounded-xl bg-amber-50 p-3">
                <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <p><strong className="text-[#071F25]">iPhone:</strong> tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-xl bg-[#071F25] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0e3b46]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
