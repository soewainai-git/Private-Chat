import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { UserIdentity } from '../types/chat';
import {
  CallSession,
  acceptCall,
  rejectCall,
  endCall,
  toggleMute,
  toggleSpeaker,
} from '../services/callService';

interface Props {
  session: CallSession | null;
  currentUser: UserIdentity;
  partnerName: UserIdentity;
  partnerAvatarUrl: string;
  isDay: boolean;
}

export const CallModal: React.FC<Props> = ({
  session,
  currentUser,
  partnerName,
  partnerAvatarUrl,
  isDay,
}) => {
  // Minimized state allows chatting simultaneously while on call
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // Timer calculation
  useEffect(() => {
    if (!session || session.status !== 'connected' || !session.startedAt) {
      setDurationSec(0);
      return;
    }

    const interval = setInterval(() => {
      if (session.startedAt) {
        const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
        setDurationSec(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.status, session?.startedAt]);

  // Expand when outgoing calling starts, and when incoming call arrives
  useEffect(() => {
    if (session?.status === 'incoming') {
      setIsMinimized(false);
    } else if (session?.status === 'connected') {
      // Once connected, minimize by default so user can immediately see chat!
      setIsMinimized(true);
    }
  }, [session?.status]);

  if (!session || session.status === 'idle') return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isIncoming = session.status === 'incoming';
  const isCalling = session.status === 'calling';
  const isConnecting = session.status === 'connecting';
  const isConnected = session.status === 'connected';

  // 1. Minimized Floating Call Pill (Chatting Simultaneously)
  if (isMinimized && (isConnected || isConnecting || isCalling)) {
    return (
      <div className="fixed top-14 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none animate-slide-down">
        <div
          className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all ${
            isDay
              ? 'bg-white/95 text-slate-800 border-sky-200/90 shadow-sky-500/15'
              : 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-black/60'
          }`}
        >
          {/* Avatar and status */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            title="Klik untuk memperbesar panggilan"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-400 flex items-center justify-center bg-slate-950 flex-none">
              {partnerAvatarUrl && !avatarError ? (
                <img
                  src={partnerAvatarUrl}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="font-bold text-xs text-white">
                  {partnerName[0]}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-1 ring-white" />
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold leading-tight">{partnerName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  {isConnected ? 'Telepon Aktif' : isConnecting ? 'Menghubungkan' : 'Memanggil...'}
                </span>
              </div>
              <p className="text-[10px] font-mono opacity-80 leading-tight">
                {isConnected ? formatDuration(durationSec) : '00:00'}
              </p>
            </div>
          </button>

          {/* Quick in-call controls */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            {isConnected && (
              <button
                type="button"
                onClick={toggleMute}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  session.isMuted
                    ? 'bg-rose-500 text-white'
                    : isDay
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={session.isMuted ? 'Buka Mic' : 'Bisukan Mic'}
              >
                {session.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isDay ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Perbesar Panggilan"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={endCall}
              className="w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Akhiri Panggilan"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Modal / Incoming Screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative text-slate-100 overflow-hidden">
        {/* Minimize Button: Let user go back to chat while talking */}
        {(isConnected || isConnecting || isCalling) && (
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-[11px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Lihat Chat sambil Telepon"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Lihat Chat</span>
          </button>
        )}

        {/* Small top brand */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Panggilan Suara Privat</span>
        </div>

        {/* Big Avatar with Pulsing Audio Ring */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Animated Glow Rings */}
          {(isCalling || isIncoming || isConnected) && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-ping opacity-40 pointer-events-none" />
              <div className="absolute w-32 h-32 rounded-full bg-sky-500/20 animate-pulse pointer-events-none" />
            </>
          )}

          <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-emerald-400/90 shadow-xl bg-slate-950 flex items-center justify-center relative z-10">
            {partnerAvatarUrl && !avatarError ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white bg-linear-to-br from-sky-500 to-indigo-600">
                {partnerName[0]}
              </div>
            )}
          </div>
        </div>

        {/* Partner Name */}
        <h3 className="text-lg font-bold text-white tracking-tight mb-1 text-center">
          {partnerName}
        </h3>

        {/* Call Status Description */}
        <p className="text-xs text-slate-400 mb-6 text-center font-medium">
          {isIncoming && 'Memanggil Anda...'}
          {isCalling && 'Sedang Memanggil...'}
          {isConnecting && 'Menghubungkan sinyal suara...'}
          {isConnected && (
            <span className="text-emerald-400 font-mono font-bold text-sm">
              {formatDuration(durationSec)}
            </span>
          )}
          {session.status === 'ended' && 'Panggilan Berakhir'}
        </p>

        {/* Action Buttons */}
        {isIncoming ? (
          /* Incoming Call: Accept or Decline */
          <div className="flex items-center justify-center gap-6 w-full mt-2">
            <button
              type="button"
              onClick={rejectCall}
              className="flex flex-col items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold">Tolak</span>
            </button>

            <button
              type="button"
              onClick={acceptCall}
              className="flex flex-col items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                <PhoneCall className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold">Terima</span>
            </button>
          </div>
        ) : (
          /* In-Call or Calling Controls */
          <div className="flex items-center justify-center gap-4 w-full mt-2">
            {isConnected && (
              <>
                {/* Mute Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    session.isMuted ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      session.isMuted
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    {session.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px]">{session.isMuted ? 'Bisu' : 'Mic'}</span>
                </button>

                {/* Speaker Button */}
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    session.isSpeakerOn ? 'text-sky-400' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      session.isSpeakerOn
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    {session.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px]">{session.isSpeakerOn ? 'Speaker' : 'Kecil'}</span>
                </button>
              </>
            )}

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="flex flex-col items-center gap-1 text-rose-400 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-13 h-13 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold">Tutup</span>
            </button>
          </div>
        )}

        {/* Tip text */}
        {(isConnected || isCalling) && (
          <p className="text-[10px] text-slate-500 text-center mt-6">
            Tip: Klik <strong>"Lihat Chat"</strong> di kanan atas untuk membaca & mengetik pesan sambil terus teleponan.
          </p>
        )}
      </div>
    </div>
  );
};
