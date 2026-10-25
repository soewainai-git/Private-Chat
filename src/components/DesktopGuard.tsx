import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, Copy, Check, Eye } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const DesktopGuard: React.FC<Props> = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulatedMobile, setSimulatedMobile] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      // If width is greater than 768px, consider it desktop screen
      const isWide = window.innerWidth > 768;
      setIsDesktop(isWide);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If on mobile or preview simulator is enabled
  if (!isDesktop) {
    return <>{children}</>;
  }

  // If desktop user chooses "Simulasi Ponsel" to test the UI on desktop
  if (simulatedMobile) {
    return (
      <div className="min-h-screen bg-[#06080d] flex flex-col items-center justify-center p-4">
        {/* Top toolbar for simulator control */}
        <div className="mb-3 flex items-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-full text-xs text-slate-300 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Mode Simulasi Ponsel Aktif</span>
          </div>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setSimulatedMobile(false)}
            className="text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Tutup Simulasi
          </button>
        </div>

        {/* Realistic Mobile Device Mockup Frame */}
        <div className="relative w-full max-w-[410px] h-[840px] max-h-[92vh] bg-[#0b0f17] rounded-[44px] shadow-[0_0_60px_-15px_rgba(0,0,0,0.9),0_0_0_10px_#1e293b,0_0_0_12px_#0f172a] overflow-hidden flex flex-col border border-slate-800">
          {/* Dynamic Island / Speaker notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-50 pointer-events-none flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-900 mr-2"></div>
            <div className="w-10 h-1 bg-slate-900 rounded-full"></div>
          </div>

          <div className="flex-1 w-full h-full overflow-hidden flex flex-col pt-3">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Strictly block desktop access as requested:
  // "websitenya gabisa di akses melalui desktop (akan ada tampilan disuruh akses melalui phone / mobile)"
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}&color=e2e8f0&bgcolor=0b0f17&margin=1`;

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-slate-200 flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-[#0d121c] border border-slate-800/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glowing background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-center shadow-inner">
          <Smartphone className="w-10 h-10 text-slate-300 animate-bounce" style={{ animationDuration: '3s' }} />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-slate-100 mb-2 tracking-tight">
          Akses Dibatasi
        </h1>
        <p className="text-sm font-medium text-slate-300 mb-3">
          Khusus Perangkat Ponsel / Smartphone
        </p>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Untuk menjaga keamanan, kerahasiaan, dan privasi obrolan, website ini hanya dapat dibuka melalui peramban ponsel. Silakan buka tautan ini di smartphone Anda.
        </p>

        {/* QR Code box */}
        <div className="bg-[#080b11] border border-slate-800 p-4 rounded-2xl inline-block mb-6 shadow-inner">
          <img
            src={qrSvgUrl}
            alt="Scan QR untuk membuka di ponsel"
            className="w-36 h-36 mx-auto rounded-lg"
            loading="lazy"
            onError={(e) => {
              // fallback if external qr image blocked
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <QrCode className="w-3.5 h-3.5" />
            <span>Pindai dengan kamera ponsel</span>
          </div>
        </div>

        {/* Copy Link button */}
        <div className="space-y-3">
          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-750 border border-slate-750 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Tautan Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Salin Tautan Website</span>
              </>
            )}
          </button>

          {/* Simulator button for developer / test evaluation on desktop */}
          <button
            onClick={() => setSimulatedMobile(true)}
            className="w-full py-2 px-3 text-[11px] text-slate-500 hover:text-slate-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Buka Simulasi Tampilan Ponsel (Pratinjau)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
