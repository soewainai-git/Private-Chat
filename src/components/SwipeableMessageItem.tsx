import React, { useState, useRef } from 'react';
import { CheckCheck, CornerUpLeft, Pencil, Copy, Check, MoreVertical, X, Star, Undo2 } from 'lucide-react';
import { ChatMessage, UserIdentity } from '../types/chat';

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  partnerName: UserIdentity;
  formatTime: (iso: string) => string;
  isDay?: boolean;
  isStarred?: boolean;
  canStar?: boolean;
  canUnsend?: boolean;
  isHighlighted?: boolean;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onOpenViewOnce: (msg: ChatMessage) => void;
  onToggleStar?: (msg: ChatMessage) => void;
  onUnsend?: (msg: ChatMessage) => void;
}

export const SwipeableMessageItem: React.FC<Props> = ({
  msg,
  isMe,
  partnerName,
  formatTime,
  isDay = true,
  isStarred = false,
  canStar = false,
  canUnsend = false,
  isHighlighted = false,
  onReply,
  onEdit,
  onOpenViewOnce,
  onToggleStar,
  onUnsend,
}) => {
  const isViewOnce = Boolean(msg.viewonce_photo);
  const isMedia = Boolean(msg.media_url);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasVibrated = useRef(false);

  const SWIPE_THRESHOLD = 42;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
    hasVibrated.current = false;

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }
        setShowMenu(true);
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      touchMoved.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    // Horizontal swipe gesture detection
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        const pull = Math.min(diffX * 0.75, 65);
        setTranslateX(pull);
        setIsSwiping(true);

        if (pull >= SWIPE_THRESHOLD && !hasVibrated.current) {
          hasVibrated.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (translateX >= SWIPE_THRESHOLD) {
      onReply(msg);
    }

    setIsSwiping(false);
    setTranslateX(0);
  };

  const handleCopy = () => {
    if (msg.message && navigator.clipboard) {
      navigator.clipboard.writeText(msg.message);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 700);
    }
  };

  return (
    <div
      id={`msg-${msg.id}`}
      style={{ contain: 'content' }}
      className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full py-0.5 select-none ${
        isHighlighted ? 'animate-highlight-pulse' : ''
      }`}
    >
      {/* Background Reply Indicator behind swiping bubble */}
      <div
        className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-all duration-150 z-0"
        style={{
          opacity: Math.min(translateX / 28, 1),
          transform: `translateY(-50%) scale(${Math.min(0.5 + translateX / 70, 1)})`,
        }}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
            translateX >= SWIPE_THRESHOLD ? 'bg-sky-500 text-white ring-2 ring-sky-400/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </div>
      </div>

      {!isMe && (
        <div className="flex items-center gap-1.5 ml-1.5 mb-0.5">
          <span
            className={`text-[9.5px] font-bold ${
              isDay ? 'text-slate-950 font-extrabold' : 'text-indigo-200'
            }`}
          >
            {msg.name}
          </span>
        </div>
      )}

      {/* Message Bubble Container with gesture handling */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className="relative z-10 max-w-[85%] flex items-center gap-1.5"
      >
        {/* Quick action trigger on left if me */}
        {isMe && !isViewOnce && (
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            aria-label="Opsi pesan"
            className={`opacity-0 group-hover:opacity-100 p-1 transition-opacity cursor-pointer ${
              isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}

        {isViewOnce ? (
          /* View Once 1X Photo Card - Soft Cute Style */
          <div
            onClick={() => {
              if (isMe) return;
              if (!msg.viewonce_opened) {
                onOpenViewOnce(msg);
              }
            }}
            className={`flex items-center gap-2.5 p-2.5 rounded-[20px] border transition-all ${
              isMe
                ? `bg-slate-900 border-blue-400/30 text-slate-100 rounded-br-[4px] shadow-xs ${
                    msg.viewonce_opened ? 'border-blue-500/40 bg-blue-950/40' : 'cursor-default'
                  }`
                : isDay
                ? `bg-white border-sky-100 text-slate-900 rounded-bl-[4px] shadow-xs ${
                    msg.viewonce_opened ? 'opacity-50 cursor-default' : 'hover:border-sky-300 active:scale-98 cursor-pointer'
                  }`
                : `bg-[#18233c] border-slate-700/60 text-slate-100 rounded-bl-[4px] shadow-xs ${
                    msg.viewonce_opened ? 'opacity-40 cursor-default' : 'hover:border-indigo-400 active:scale-98 cursor-pointer'
                  }`
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[11px] flex-none ${
                isMe
                  ? msg.viewonce_opened
                    ? 'border-blue-400 text-blue-400 bg-blue-500/10'
                    : 'border-slate-400 text-slate-400'
                  : msg.viewonce_opened
                  ? 'border-slate-500 text-slate-500'
                  : 'border-sky-500 text-sky-500 bg-sky-50'
              }`}
            >
              1
            </div>

            <div className="text-left">
              <p className="text-[11px] font-semibold flex items-center gap-1">
                <span className={isDay && !isMe ? 'text-slate-800' : 'text-slate-100'}>Foto</span>
                {isMe && msg.viewonce_opened && (
                  <CheckCheck className="w-3 h-3 text-blue-400 inline" />
                )}
                {isStarred && (
                  <span className="text-amber-400 text-[10px]">⭐</span>
                )}
              </p>
              <p className={`text-[9px] ${isDay && !isMe ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                {isMe
                  ? msg.viewonce_opened
                    ? `Dibuka oleh ${partnerName}`
                    : 'Terkirim (Menunggu dibuka)'
                  : msg.viewonce_opened
                  ? 'Sudah Dibuka'
                  : 'Ketuk untuk melihat sekali'}
              </p>
            </div>
          </div>
        ) : isMedia && msg.media_url ? (
          /* GIF / Looping Video Message Bubble - Large & Clean Cute Box */
          <div
            onDoubleClick={() => onReply(msg)}
            className={`relative p-1.5 rounded-[22px] max-w-[270px] sm:max-w-[320px] transition-all shadow-xs active:scale-[0.99] ${
              isMe
                ? 'bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] text-white rounded-br-[4px]'
                : isDay
                ? 'bg-white text-[#0f172a] rounded-bl-[4px] border border-sky-100 shadow-xs'
                : 'bg-[#18233c] text-slate-100 rounded-bl-[4px] border border-slate-700/60 shadow-xs'
            }`}
          >
            {/* Quoted Reply if present */}
            {msg.reply_name && (
              <div
                className={`mb-1 px-2.5 py-1 rounded-xl text-[10px] border-l-2 max-w-[240px] sm:max-w-xs overflow-hidden ${
                  isMe
                    ? 'bg-blue-700/60 border-blue-200 text-blue-50'
                    : isDay
                    ? 'bg-sky-50 border-sky-400 text-slate-800'
                    : 'bg-slate-900/80 border-indigo-400 text-slate-200'
                }`}
              >
                <p className="font-bold text-[9px] opacity-90 truncate">{msg.reply_name}</p>
                <p className="text-[10px] opacity-85 truncate max-w-full font-normal">{msg.reply_message}</p>
              </div>
            )}

            {/* Media Content Box: Auto-Looping, Muted, No Controls */}
            <div className="relative rounded-[18px] overflow-hidden bg-slate-950/20 w-full flex items-center justify-center">
              {msg.media_type === 'video' ? (
                <video
                  src={msg.media_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full max-h-[380px] object-cover rounded-[18px] pointer-events-none select-none block"
                />
              ) : (
                <img
                  src={msg.media_url}
                  alt="GIF"
                  className="w-full max-h-[380px] object-cover rounded-[18px] pointer-events-none select-none block"
                  loading="lazy"
                />
              )}
              {/* Cute GIF Label */}
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white tracking-wider pointer-events-none">
                GIF
              </span>
            </div>

            {/* Optional Caption */}
            {msg.message && (
              <p className={`px-2 pt-1.5 text-[12px] leading-relaxed whitespace-pre-wrap select-text font-normal ${
                isMe ? 'text-white font-medium' : isDay ? 'text-[#0f172a] font-medium' : 'text-slate-100 font-normal'
              }`}>
                {msg.message}
              </p>
            )}

            {/* Timestamp & Star */}
            <div
              className={`px-1.5 pt-1 text-[8.5px] text-right opacity-80 flex items-center justify-end gap-1 ${
                isMe ? 'text-blue-100' : isDay ? 'text-slate-500 font-medium' : 'text-slate-400'
              }`}
            >
              {isStarred && (
                <span className="text-amber-400 text-[9px] leading-none" title="Pesan Berbintang">⭐</span>
              )}
              <span>{formatTime(msg.created_at)}</span>
              {isMe && <CheckCheck className="w-2.5 h-2.5 inline" />}
            </div>
          </div>
        ) : (
          /* Normal Text Message Bubble - Soft Cute Pillowy Design (Optimized 60fps) */
          <div
            onDoubleClick={() => onReply(msg)}
            className={`relative px-3.5 py-2 rounded-[22px] text-xs break-words transition-all active:scale-[0.99] ${
              isMe
                ? 'bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] text-white rounded-br-[4px] shadow-xs'
                : isDay
                ? 'bg-white text-[#0f172a] rounded-bl-[4px] border border-sky-100/80 shadow-xs'
                : 'bg-[#18233c] text-slate-100 rounded-bl-[4px] border border-slate-700/60 shadow-xs'
            }`}
          >
            {/* Quoted Reply if present */}
            {msg.reply_name && (
              <div
                className={`mb-1 px-2.5 py-1 rounded-xl text-[10px] border-l-2 max-w-[220px] sm:max-w-xs overflow-hidden ${
                  isMe
                    ? 'bg-blue-700/60 border-blue-200 text-blue-50'
                    : isDay
                    ? 'bg-sky-50 border-sky-400 text-slate-800'
                    : 'bg-slate-900/80 border-indigo-400 text-slate-200'
                }`}
              >
                <p className="font-bold text-[9px] opacity-90 truncate">{msg.reply_name}</p>
                <p className="text-[10px] opacity-85 truncate max-w-full font-normal">{msg.reply_message}</p>
              </div>
            )}

            {/* Bubble Message Text - Sharp, Dark & High Contrast in Day Mode */}
            <p
              className={`text-[12px] leading-relaxed whitespace-pre-wrap select-text font-normal ${
                isMe
                  ? 'text-white font-medium'
                  : isDay
                  ? 'text-[#0f172a] font-medium'
                  : 'text-slate-100 font-normal'
              }`}
            >
              {msg.message}
            </p>

            {/* Timestamp & Badges */}
            <div
              className={`text-[8.5px] text-right mt-0.5 opacity-80 flex items-center justify-end gap-1 ${
                isMe ? 'text-blue-100' : isDay ? 'text-slate-500 font-medium' : 'text-slate-400'
              }`}
            >
              {isStarred && (
                <span className="text-amber-400 text-[9px] leading-none" title="Pesan Berbintang">⭐</span>
              )}
              {msg.is_edited && (
                <span className="italic text-[8px] opacity-90">
                  (diedit)
                </span>
              )}
              <span>{formatTime(msg.created_at)}</span>
              {isMe && <CheckCheck className="w-2.5 h-2.5 inline" />}
            </div>
          </div>
        )}

        {/* Quick action trigger on right if not me */}
        {!isMe && (
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            aria-label="Opsi pesan"
            className={`opacity-0 group-hover:opacity-100 p-1 transition-opacity cursor-pointer ${
              isDay ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Action Sheet Menu Modal */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#0f141f] border border-slate-800 rounded-2xl p-2.5 shadow-2xl space-y-1"
          >
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">
                {msg.message || 'Pesan Foto'}
              </span>
              <button
                onClick={() => setShowMenu(false)}
                className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Star / Unstar Option (Exclusive to Soe) */}
            {canStar && onToggleStar && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onToggleStar(msg);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}`} />
                <span>{isStarred ? 'Hapus Bintang' : 'Bintangi Pesan (Bookmark)'}</span>
              </button>
            )}

            {/* Unsend Option (Exclusive to Soe only) */}
            {canUnsend && onUnsend && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (window.confirm('Tarik pesan ini? Pesan akan dihapus untuk semua orang.')) {
                    onUnsend(msg);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Undo2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Tarik Pesan (Unsend)</span>
              </button>
            )}

            {/* Edit Option (Only available for text messages sent by current user) */}
            {isMe && !isViewOnce && !isMedia && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onEdit(msg);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-400" />
                <span>Edit Pesan (Perbaiki Typo)</span>
              </button>
            )}

            {/* Reply Option */}
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onReply(msg);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer text-left font-medium"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Balas Pesan</span>
            </button>

            {/* Copy Option */}
            {!isViewOnce && msg.message && (
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
