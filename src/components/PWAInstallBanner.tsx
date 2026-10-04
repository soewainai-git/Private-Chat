import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  if (isInstallable) {
    return (
      <div className="mx-3 mb-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs animate-fade-in shadow-md">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Smartphone className="w-4 h-4 text-emerald-400 flex-none" />
          <span className="text-[11px] text-slate-300 truncate">
            Pasang sebagai Aplikasi HP (APK / PWA)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          <button
            onClick={install}
            className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded-full text-slate-500 hover:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <>
        <div className="mx-3 mb-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs animate-fade-in shadow-md">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Smartphone className="w-4 h-4 text-slate-300 flex-none" />
            <span className="text-[11px] text-slate-300 truncate">
              Pasang di Layar Utama iPhone
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-none">
            <button
              onClick={() => setShowIOSGuide(true)}
              className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-medium transition-colors cursor-pointer"
            >
              Petunjuk
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-5 h-5 rounded-full text-slate-500 hover:text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div
            onClick={() => setShowIOSGuide(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl bg-[#0f141f] border border-slate-800 p-5 shadow-2xl space-y-3"
            >
              <h3 className="text-xs font-semibold text-slate-100">
                Pasang di Layar Utama iPhone:
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                1. Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di peramban Safari.<br />
                2. Gulir ke bawah lalu pilih <strong>Add to Home Screen (Tambah ke Layar Utama)</strong>.<br />
                3. Aplikasi akan langsung muncul di menu HP seperti aplikasi asli.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
