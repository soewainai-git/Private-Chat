import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  isVeiled: boolean;
  warningMessage: string | null;
  onDismiss?: () => void;
}

export const PrivacyShieldOverlay: React.FC<Props> = ({ isVeiled, warningMessage, onDismiss }) => {
  if (!isVeiled && !warningMessage) return null;

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-center transition-all duration-200 select-none cursor-pointer"
    >
      <div className="max-w-xs flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-xl shadow-black/50">
          {warningMessage ? (
            <ShieldAlert className="w-8 h-8 text-amber-400 animate-pulse" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-medium text-slate-100">
            {warningMessage ? 'Peringatan Privasi' : 'Layar Disamarkan'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {warningMessage || 'Ruang obrolan disamarkan demi melindungi privasi Soe & Haru saat jendela tidak aktif.'}
          </p>
        </div>

        <div className="pt-2">
          <span className="text-[11px] text-slate-500 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
            Ketuk layar untuk melanjutkan
          </span>
        </div>
      </div>
    </div>
  );
};
