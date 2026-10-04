import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Camera,
  X,
  Shield,
  ArrowLeft,
  CheckCheck
} from 'lucide-react';
import { ChatMessage, UserIdentity } from '../types/chat';
import {
  fetchMessages,
  sendMessage,
  sendViewOncePhoto,
  markViewOnceOpened,
  sendHeartbeat,
  fetchLastSeen,
  subscribeToChatEvents,
  broadcastTyping
} from '../services/chatService';
import { ViewOnceModal } from './ViewOnceModal';

interface Props {
  currentUser: UserIdentity;
  onLock: () => void;
  triggerPrivacyAlert: (msg: string) => void;
}

export const ChatRoom: React.FC<Props> = ({
  currentUser,
  onLock,
  triggerPrivacyAlert,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<{ name: string; message: string } | null>(null);
  const [activeViewOnce, setActiveViewOnce] = useState<ChatMessage | null>(null);

  // Presence states
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  const [partnerIsOnline, setPartnerIsOnline] = useState<boolean>(false);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerName: UserIdentity = currentUser === 'Soe' ? 'Haru' : 'Soe';

  // Format timestamp in Indonesian
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isSameDay = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      if (isSameDay) return timeStr;
      return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Load initial messages and sync
  useEffect(() => {
    fetchMessages().then(data => {
      setMessages(data);
      setTimeout(() => scrollToBottom(false), 80);
    });

    // Check partner's last seen
    fetchLastSeen(partnerName).then(lastSeen => {
      if (lastSeen) {
        setPartnerLastSeen(lastSeen);
        const diffMs = Date.now() - new Date(lastSeen).getTime();
        setPartnerIsOnline(diffMs < 65000);
      }
    });

    sendHeartbeat(currentUser);
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat(currentUser);
    }, 30000);

    const presenceCheckInterval = setInterval(async () => {
      const lastSeen = await fetchLastSeen(partnerName);
      if (lastSeen) {
        setPartnerLastSeen(lastSeen);
        const diffMs = Date.now() - new Date(lastSeen).getTime();
        setPartnerIsOnline(diffMs < 65000);
      }
    }, 15000);

    // Subscribe to live events with robust deduplication
    const unsubscribe = subscribeToChatEvents(
      (newMsg) => {
        setMessages(prev => {
          // Check if already in list by ID
          if (prev.some(m => m.id === newMsg.id)) return prev;

          // Check if matches our pending temporary message (same sender, same text, within 6 seconds)
          const tempIndex = prev.findIndex(m =>
            m.name === newMsg.name &&
            m.message === newMsg.message &&
            Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 6000
          );

          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = newMsg;
            return updated;
          }

          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom(true), 80);
      },
      (msgId) => {
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, viewonce_opened: true } : m))
        );
      },
      ({ sender, isTyping }) => {
        if (sender === partnerName) {
          setPartnerTyping(isTyping);
        }
      },
      (identity, timestamp) => {
        if (identity === partnerName) {
          setPartnerLastSeen(timestamp);
          setPartnerIsOnline(true);
        }
      }
    );

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(presenceCheckInterval);
      unsubscribe();
    };
  }, [currentUser, partnerName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    broadcastTyping(currentUser, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(currentUser, false);
    }, 2000);
  };

  // Send Text Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    broadcastTyping(currentUser, false);

    const sent = await sendMessage(currentUser, textToSend, replyTo);
    setReplyTo(null);
    setMessages(prev => {
      if (prev.some(m => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
    setTimeout(() => scrollToBottom(true), 40);
  };

  // Send 1X View Once Photo
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar yang valid.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const sent = await sendViewOncePhoto(currentUser, base64, replyTo);
      setReplyTo(null);
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(() => scrollToBottom(true), 40);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenViewOnce = (msg: ChatMessage) => {
    if (msg.viewonce_opened) return;
    setActiveViewOnce(msg);
  };

  const handleCloseAndBurn = async () => {
    if (!activeViewOnce) return;
    const msgId = activeViewOnce.id;
    setActiveViewOnce(null);

    await markViewOnceOpened(msgId);
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, viewonce_opened: true } : m))
    );
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0b0f17] text-slate-100 select-none overflow-hidden relative">
      {/* Compact Top Header */}
      <header className="flex-none h-13 bg-[#0f141f] border-b border-slate-800/80 px-3 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onLock}
            aria-label="Kunci"
            className="w-7 h-7 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Partner Avatar */}
          <div className="relative flex-none">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-200">
              {partnerName.slice(0, 1)}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#0f141f] ${
                partnerIsOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
              }`}
            />
          </div>

          {/* Partner Info */}
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-slate-100 truncate leading-snug">
              {partnerName}
            </h2>

            <p className="text-[10px] truncate leading-tight">
              {partnerTyping ? (
                <span className="text-blue-400 font-medium italic animate-pulse">
                  mengetik...
                </span>
              ) : partnerIsOnline ? (
                <span className="text-emerald-400 font-medium">
                  Online
                </span>
              ) : partnerLastSeen ? (
                <span className="text-slate-400">
                  Offline • {formatTime(partnerLastSeen)}
                </span>
              ) : (
                <span className="text-slate-500">Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Actions - Clean & Minimalist */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSecurityInfo(true)}
            aria-label="Keamanan"
            title="Info Keamanan"
            className="w-7 h-7 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </header>

      {/* Security Info Modal */}
      {showSecurityInfo && (
        <div
          onClick={() => setShowSecurityInfo(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-xs w-full bg-[#0f141f] border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-100">
                  Proteksi Privasi
                </h3>
              </div>
              <button
                onClick={() => setShowSecurityInfo(false)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p>• <strong>Enkripsi Sesi:</strong> Percakapan terisolasi khusus Soe &amp; Haru.</p>
              <p>• <strong>Anti-Screenshot:</strong> Pintasan tangkapan layar diblokir.</p>
              <p>• <strong>Penyamaran Layar:</strong> Konten disamarkan saat berpindah aplikasi.</p>
              <p>• <strong>Foto Sekali Lihat:</strong> Hanya dapat dibuka 1 kali oleh penerima.</p>
              <p>• <strong>Khusus Ponsel:</strong> Akses desktop dinonaktifkan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area - Compact gap */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.name === currentUser;
          const isViewOnce = Boolean(msg.viewonce_photo);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              {!isMe && (
                <span className="text-[9px] font-medium text-slate-500 ml-1 mb-0.5">
                  {msg.name}
                </span>
              )}

              {/* Message Bubble or View-Once Card */}
              {isViewOnce ? (
                /* View Once 1X Photo Card - Compact */
                <div
                  onClick={() => {
                    if (isMe) {
                      // Sender cannot open the photo as requested
                      return;
                    }
                    if (!msg.viewonce_opened) {
                      handleOpenViewOnce(msg);
                    }
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    isMe
                      ? `bg-slate-850 border-slate-750 text-slate-100 rounded-br-xs ${
                          msg.viewonce_opened
                            ? 'border-blue-500/40 bg-blue-950/20'
                            : 'cursor-default'
                        }`
                      : `bg-slate-900 border-slate-800 text-slate-100 rounded-bl-xs ${
                          msg.viewonce_opened
                            ? 'opacity-40 cursor-default'
                            : 'hover:border-slate-600 active:scale-98 shadow-sm cursor-pointer'
                        }`
                  }`}
                >
                  {/* Badge 1 / Status Icon */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[11px] flex-none ${
                      isMe
                        ? msg.viewonce_opened
                          ? 'border-blue-400 text-blue-400 bg-blue-500/10'
                          : 'border-slate-500 text-slate-400'
                        : msg.viewonce_opened
                        ? 'border-slate-500 text-slate-500'
                        : 'border-blue-400 text-blue-400'
                    }`}
                  >
                    1
                  </div>

                  <div className="text-left">
                    <p className="text-[11px] font-semibold flex items-center gap-1">
                      <span>Foto</span>
                      {isMe && msg.viewonce_opened && (
                        <CheckCheck className="w-3 h-3 text-blue-400 inline" />
                      )}
                    </p>
                    <p className="text-[9px] text-slate-400">
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
              ) : (
                /* Normal Text Message Bubble - Compact */
                <div
                  onDoubleClick={() => setReplyTo({ name: msg.name, message: msg.message })}
                  className={`relative max-w-[78%] px-3 py-1.5 rounded-xl shadow-xs text-xs break-words transition-all ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-850 text-slate-100 rounded-bl-xs border border-slate-800'
                  }`}
                >
                  {/* Quoted Reply if present */}
                  {msg.reply_name && (
                    <div
                      className={`mb-1 px-2 py-0.5 rounded-md text-[10px] border-l-2 ${
                        isMe
                          ? 'bg-blue-700/60 border-blue-300 text-blue-100'
                          : 'bg-slate-900/80 border-slate-500 text-slate-300'
                      }`}
                    >
                      <p className="font-semibold text-[9px] opacity-80">{msg.reply_name}</p>
                      <p className="truncate text-[10px]">{msg.reply_message}</p>
                    </div>
                  )}

                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  <div
                    className={`text-[8.5px] text-right mt-0.5 opacity-65 flex items-center justify-end gap-0.5 ${
                      isMe ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatTime(msg.created_at)}</span>
                    {isMe && <CheckCheck className="w-2.5 h-2.5 inline" />}
                  </div>
                </div>
              )}

              {/* Quick Reply Helper Action */}
              <button
                type="button"
                onClick={() => setReplyTo({ name: msg.name, message: msg.message || 'Foto sekali lihat' })}
                className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-500 hover:text-slate-300 transition-opacity mt-0.5 px-1 cursor-pointer"
              >
                Balas
              </button>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator bottom */}
      {partnerTyping && (
        <div className="flex-none px-3 py-1 text-[11px] text-slate-400 italic flex items-center gap-1.5 animate-fade-in">
          <span>{partnerName} sedang mengetik</span>
          <span className="flex gap-1 items-center">
            <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
        </div>
      )}

      {/* Quoted Reply Banner */}
      {replyTo && (
        <div className="flex-none mx-2.5 mb-1 px-2.5 py-1.5 bg-slate-900 border-l-2 border-blue-500 rounded-r-lg flex items-center justify-between text-xs animate-fade-in shadow-xs">
          <div className="min-w-0 pr-2">
            <p className="font-semibold text-blue-400 text-[10px]">Membalas {replyTo.name}</p>
            <p className="text-slate-400 truncate text-[10px]">{replyTo.message}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer flex-none"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Compact Bottom Input Bar */}
      <footer className="flex-none p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-[#0f141f] border-t border-slate-800/80">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Kirim Foto Sekali Lihat (1X)"
            className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-800 active:bg-slate-750 text-slate-300 flex items-center justify-center border border-slate-750 transition-transform active:scale-95 cursor-pointer flex-none relative"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white font-bold text-[8px] flex items-center justify-center border border-[#0f141f]">
              1
            </span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Ketik pesan..."
            maxLength={500}
            autoComplete="off"
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-full px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Kirim"
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer flex-none shadow-sm"
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </footer>

      {/* View Once Photo Viewer Modal */}
      {activeViewOnce && activeViewOnce.viewonce_photo && (
        <ViewOnceModal
          photoUrl={activeViewOnce.viewonce_photo}
          viewerIdentity={currentUser}
          onCloseAndBurn={handleCloseAndBurn}
          triggerPrivacyAlert={triggerPrivacyAlert}
        />
      )}
    </div>
  );
};
