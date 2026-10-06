import React, { useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import { UserIdentity } from '../types/chat';

interface Props {
  onUnlock: (identity: UserIdentity) => void;
}

export const PinGate: React.FC<Props> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  // Exact PIN requested by user:
  // Haru: 112233
  // Soe: 161099
  const PIN_MAP: Record<string, UserIdentity> = {
    '112233': 'Haru',
    '161099': 'Soe',
  };

  const handlePinSubmit = (customPin?: string) => {
    const pinToTest = customPin || pin;

    if (pinToTest.length !== 6) {
      setStatusMessage('PIN harus berupa 6 digit angka.');
      return;
    }

    setLoading(true);

    if (PIN_MAP[pinToTest]) {
      const identity = PIN_MAP[pinToTest];
      setTimeout(() => {
        setLoading(false);
        onUnlock(identity);
      }, 200);
      return;
    }

    setLoading(false);
    setStatusMessage('PIN salah.');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    setPin('');
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-black/35 backdrop-blur-sm text-slate-100 select-none overflow-y-auto no-scrollbar">
      {/* Top security header */}
      <div className="w-full flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>Terproteksi</span>
        </div>
      </div>

      {/* Main Compact PIN Card */}
      <div className={`w-full max-w-xs flex flex-col items-center my-auto transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        {/* Two Avatars: Soe & Haru */}
        <div className="flex items-center -space-x-2.5 mb-3">
          <div className="w-12 h-12 rounded-full border-2 border-sky-400 overflow-hidden shadow-md shadow-black/40">
            <img src="/avatars/soe.jpg" alt="Soe" className="w-full h-full object-cover" />
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-amber-300 overflow-hidden shadow-md shadow-black/40">
            <img src="/avatars/haru.jpg" alt="Haru" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-base font-semibold text-slate-100 mb-4 tracking-tight">
          Masukkan PIN
        </h1>

        {/* 6 Dots Indicator */}
        <div className="flex items-center gap-3 mb-4">
          {[0, 1, 2, 3, 4, 5].map(idx => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all duration-150 border ${
                idx < pin.length
                  ? 'bg-slate-200 border-slate-200 scale-105 shadow-sm shadow-slate-200/50'
                  : 'bg-transparent border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Status text */}
        <div className="min-h-5 text-center mb-3">
          {statusMessage && (
            <p className="text-xs text-rose-400 font-medium">
              {statusMessage}
            </p>
          )}
        </div>

        {/* Compact Numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[230px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              disabled={loading}
              className="h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-slate-750 border border-slate-800/80 text-base font-medium text-slate-200 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center" />
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            disabled={loading}
            className="h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-slate-750 border border-slate-800/80 text-base font-medium text-slate-200 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading || pin.length === 0}
            className="h-11 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 active:bg-slate-750 border border-slate-800/50 text-xs font-medium text-slate-400 transition-all flex items-center justify-center cursor-pointer active:scale-95"
          >
            Hapus
          </button>
        </div>
      </div>

      <div className="text-[10px] text-slate-600 text-center pb-1">
        Enkripsi Sesi Aktif
      </div>
    </div>
  );
};
