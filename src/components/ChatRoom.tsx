import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Camera,
  X,
  Shield,
  ArrowLeft,
  CheckCheck,
  Pencil,
  Check,
  Smile,
  Star,
  Plus,
  Film
} from 'lucide-react';
import { ChatMessage, UserIdentity } from '../types/chat';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  sendViewOncePhoto,
  sendMediaMessage,
  unsendMessage,
  markViewOnceOpened,
  sendHeartbeat,
  fetchLastSeen,
  subscribeToChatEvents,
  broadcastTyping,
  clearAllMessages
} from '../services/chatService';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showPartnerNotification
} from '../services/notificationService';
import { ViewOnceModal } from './ViewOnceModal';
import { SwipeableMessageItem } from './SwipeableMessageItem';
import { EmojiPicker } from './EmojiPicker';
import { StarredMessagesModal } from './StarredMessagesModal';

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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [activeViewOnce, setActiveViewOnce] = useState<ChatMessage | null>(null);

  // 100% Fully Automatic Day/Night based on User Timezone
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => setCurrentHour(new Date().getHours()), 30000);
    return () => clearInterval(t);
  }, []);
  const isDay = currentHour >= 6 && currentHour < 18;

  // Soe Exclusive: Starred Messages State
  const [starredMsgIds, setStarredMsgIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('soe_starred_messages_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [starredMessagesMap, setStarredMessagesMap] = useState<Record<string, ChatMessage>>(() => {
    try {
      const raw = localStorage.getItem('soe_starred_messages_cache_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [showStarredModal, setShowStarredModal] = useState<boolean>(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);

  // Soe Exclusive: Load More Messages State
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Presence states
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  const [partnerIsOnline, setPartnerIsOnline] = useState<boolean>(false);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());

  const fileInputPhotoRef = useRef<HTMLInputElement>(null);
  const fileInputMediaRef = useRef<HTMLInputElement>(null);
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
        // Trigger notification if app is in background/locked and message is from partner
        if (newMsg.name === partnerName) {
          if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
            showPartnerNotification(partnerName);
          }
        }

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
      },
      () => {
        setMessages([]);
      },
      (payload) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === payload.id
              ? { ...m, message: payload.message, is_edited: true, edited_at: payload.edited_at }
              : m
          )
        );
      },
      (deletedMsgId) => {
        setMessages(prev => prev.filter(m => m.id !== deletedMsgId));
        handleUnstarById(deletedMsgId);
      }
    );

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(presenceCheckInterval);
      unsubscribe();
    };
  }, [currentUser, partnerName]);

  // Soe Exclusive handlers
  const handleToggleStar = (targetMsg: ChatMessage) => {
    setStarredMsgIds(prev => {
      const isStarred = prev.includes(targetMsg.id);
      const nextIds = isStarred ? prev.filter(id => id !== targetMsg.id) : [...prev, targetMsg.id];
      try {
        localStorage.setItem('soe_starred_messages_v1', JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });

    setStarredMessagesMap(prev => {
      const next = { ...prev };
      if (next[targetMsg.id]) {
        delete next[targetMsg.id];
      } else {
        next[targetMsg.id] = targetMsg;
      }
      try {
        localStorage.setItem('soe_starred_messages_cache_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleUnstarById = (msgId: string) => {
    setStarredMsgIds(prev => {
      const nextIds = prev.filter(id => id !== msgId);
      try {
        localStorage.setItem('soe_starred_messages_v1', JSON.stringify(nextIds));
      } catch {}
      return nextIds;
    });
    setStarredMessagesMap(prev => {
      const next = { ...prev };
      delete next[msgId];
      try {
        localStorage.setItem('soe_starred_messages_cache_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleJumpToMessage = async (msgId: string) => {
    setShowStarredModal(false);

    let el = document.getElementById('msg-' + msgId);
    if (!el) {
      // If message is in older history, fetch expanded batch
      setLoadingMore(true);
      try {
        const expanded = await fetchMessages(180, 0);
        setMessages(expanded);
        await new Promise(r => setTimeout(r, 120));
        el = document.getElementById('msg-' + msgId);
      } finally {
        setLoadingMore(false);
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const older = await fetchMessages(60, messages.length);
      if (!older || older.length === 0) {
        setHasMore(false);
      } else {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const filtered = older.filter(m => !existingIds.has(m.id));
          if (filtered.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...filtered, ...prev];
        });
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    broadcastTyping(currentUser, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(currentUser, false);
    }, 2000);
  };

  // Send or Edit Text Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Handle Edit Mode for typos
    if (editingMessage) {
      const textToUpdate = inputText.trim();
      const targetId = editingMessage.id;
      setEditingMessage(null);
      setInputText('');
      setShowEmojiPicker(false);
      broadcastTyping(currentUser, false);

      await editMessage(targetId, textToUpdate);
      setMessages(prev =>
        prev.map(m => (m.id === targetId ? { ...m, message: textToUpdate, is_edited: true } : m))
      );
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
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

  // Send GIF or Looping Short Video (<20s)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isGif && !isVideo) {
      alert('Format file tidak didukung. Pilih file GIF atau Video (MP4/WebM).');
      e.target.value = '';
      return;
    }

    if (isGif) {
      sendMediaMessage(currentUser, file, 'gif', replyTo).then(sent => {
        setReplyTo(null);
        setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
        setTimeout(() => scrollToBottom(true), 40);
      });
      e.target.value = '';
      return;
    }

    // Video validation: duration <= 20 seconds
    const videoObj = document.createElement('video');
    videoObj.preload = 'metadata';
    const blobUrl = URL.createObjectURL(file);
    videoObj.src = blobUrl;

    videoObj.onloadedmetadata = () => {
      URL.revokeObjectURL(blobUrl);
      const duration = videoObj.duration;
      if (duration > 20.5) {
        alert('Durasi video melebihi batas! Maksimal 20 detik agar otomatis looping seperti GIF.');
        return;
      }
      sendMediaMessage(currentUser, file, 'video', replyTo).then(sent => {
        setReplyTo(null);
        setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
        setTimeout(() => scrollToBottom(true), 40);
      });
    };

    videoObj.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      alert('Gagal memuat video. Pastikan format video valid.');
    };

    e.target.value = '';
  };

  // Soe Exclusive Unsend Handler
  const handleUnsend = async (targetMsg: ChatMessage) => {
    setMessages(prev => prev.filter(m => m.id !== targetMsg.id));
    handleUnstarById(targetMsg.id);
    await unsendMessage(targetMsg.id);
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
    <div className="flex-1 w-full h-full flex flex-col bg-transparent text-slate-100 select-none overflow-hidden relative">
      {/* Compact Top Header - Frosted Glass & Responsive to Sky Theme */}
      <header
        className={`flex-none h-13 border-b px-3 flex items-center justify-between z-30 shadow-xs sticky top-0 transition-colors duration-500 ${
          isDay
            ? 'bg-white/75 backdrop-blur-md border-white/60 text-slate-850 shadow-xs'
            : 'bg-[#0c1324]/80 backdrop-blur-md border-slate-800/80 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onLock}
            aria-label="Kunci"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDay
                ? 'bg-white/80 hover:bg-white text-slate-700 shadow-xs border border-slate-200/50'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Partner Avatar */}
          <div className="relative flex-none">
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold ${
                isDay
                  ? 'bg-sky-100 text-sky-800 border-sky-300 shadow-xs'
                  : 'bg-indigo-950 text-indigo-200 border-indigo-700/60'
              }`}
            >
              {partnerName.slice(0, 1)}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ${
                isDay ? 'ring-white' : 'ring-[#0c1324]'
              } ${
                partnerIsOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </div>

          {/* Partner Info */}
          <div className="min-w-0">
            <h2
              className={`text-xs font-bold truncate leading-snug ${
                isDay ? 'text-slate-850' : 'text-slate-100'
              }`}
            >
              {partnerName}
            </h2>

            <p className="text-[10px] truncate leading-tight">
              {partnerTyping ? (
                <span className="text-blue-500 font-semibold italic animate-pulse">
                  mengetik...
                </span>
              ) : partnerIsOnline ? (
                <span className="text-emerald-500 font-semibold">
                  Online
                </span>
              ) : partnerLastSeen ? (
                <span className={isDay ? 'text-slate-600 font-medium' : 'text-slate-400'}>
                  Offline • {formatTime(partnerLastSeen)}
                </span>
              ) : (
                <span className={isDay ? 'text-slate-500' : 'text-slate-500'}>Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5">
          {/* Soe Exclusive: Starred Messages Button */}
          {currentUser === 'Soe' && (
            <button
              type="button"
              onClick={() => setShowStarredModal(true)}
              title="Pesan Berbintang (Khusus Soe)"
              aria-label="Pesan Berbintang"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                isDay
                  ? 'bg-white/85 hover:bg-white text-amber-500 border border-amber-200/80 shadow-xs'
                  : 'bg-slate-850 hover:bg-slate-800 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {starredMsgIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[8px] flex items-center justify-center shadow-xs">
                  {starredMsgIds.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setShowSecurityInfo(true)}
            aria-label="Keamanan"
            title="Info Keamanan"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDay
                ? 'bg-white/80 hover:bg-white text-emerald-600 border border-slate-200/50 shadow-xs'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
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
                  Proteksi &amp; Notifikasi
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
              <p>• <strong>Push Notifikasi Samaran:</strong> Hanya muncul nama tanpa isi pesan.</p>
            </div>

            {/* Notification Control Panel */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Status Notifikasi:</span>
                <span className={`font-semibold ${notifPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {notifPermission === 'granted' ? 'Aktif' : 'Belum Aktif'}
                </span>
              </div>

              {notifPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    setNotifPermission(granted ? 'granted' : 'denied');
                    if (granted) {
                      showPartnerNotification(partnerName);
                    }
                  }}
                  className="w-full py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-medium transition-colors cursor-pointer text-center"
                >
                  Aktifkan Notifikasi di HP Ini
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    showPartnerNotification(partnerName);
                  }}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer text-center"
                >
                  Uji Coba Notifikasi Sekarang
                </button>
              )}
            </div>

            {currentUser === 'Soe' && (
              <div className="pt-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Hapus seluruh riwayat chat untuk kedua pihak?')) {
                      await clearAllMessages();
                      setMessages([]);
                      setShowSecurityInfo(false);
                    }
                  }}
                  className="w-full py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-medium transition-colors cursor-pointer text-center"
                >
                  Hapus Seluruh Riwayat Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area - Compact gap & locked viewport bounce */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar overscroll-contain touch-pan-y">
        {/* Soe Exclusive: Load More Messages Button */}
        {currentUser === 'Soe' && hasMore && (
          <div className="flex justify-center pt-1 pb-1">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isDay
                  ? 'bg-white/90 text-slate-800 hover:bg-white border border-sky-200/80 shadow-xs'
                  : 'bg-slate-850/90 text-slate-200 hover:bg-slate-800 border border-slate-700/60 shadow-xs'
              }`}
            >
              {loadingMore ? (
                <span className="animate-pulse">Memuat pesan...</span>
              ) : (
                <span>Muat Pesan Sebelumnya ⏳</span>
              )}
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <SwipeableMessageItem
            key={msg.id}
            msg={msg}
            isMe={msg.name === currentUser}
            partnerName={partnerName}
            formatTime={formatTime}
            isDay={isDay}
            isStarred={starredMsgIds.includes(msg.id)}
            canStar={currentUser === 'Soe'}
            canUnsend={currentUser === 'Soe'}
            isHighlighted={highlightedMsgId === msg.id}
            onToggleStar={handleToggleStar}
            onUnsend={handleUnsend}
            onReply={(targetMsg) => {
              setReplyTo({
                name: targetMsg.name,
                message: targetMsg.message || 'Foto sekali lihat',
              });
            }}
            onEdit={(targetMsg) => {
              setEditingMessage(targetMsg);
              setInputText(targetMsg.message);
            }}
            onOpenViewOnce={handleOpenViewOnce}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator bottom */}
      {partnerTyping && (
        <div
          className={`flex-none px-3 py-1 text-[11px] italic flex items-center gap-1.5 animate-fade-in ${
            isDay ? 'text-sky-950 font-medium drop-shadow-xs' : 'text-indigo-200'
          }`}
        >
          <span>{partnerName} sedang mengetik</span>
          <span className="flex gap-1 items-center">
            <span
              className={`w-1 h-1 rounded-full animate-bounce ${isDay ? 'bg-sky-700' : 'bg-indigo-400'}`}
              style={{ animationDelay: '0ms' }}
            ></span>
            <span
              className={`w-1 h-1 rounded-full animate-bounce ${isDay ? 'bg-sky-700' : 'bg-indigo-400'}`}
              style={{ animationDelay: '150ms' }}
            ></span>
            <span
              className={`w-1 h-1 rounded-full animate-bounce ${isDay ? 'bg-sky-700' : 'bg-indigo-400'}`}
              style={{ animationDelay: '300ms' }}
            ></span>
          </span>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div
          className={`flex-none mx-2.5 mb-1 px-2.5 py-1.5 border-l-2 rounded-r-lg flex items-center justify-between text-xs animate-fade-in shadow-xs ${
            isDay
              ? 'bg-blue-50/95 border-blue-500 text-blue-900 shadow-xs'
              : 'bg-blue-950/80 border-blue-400 text-blue-200 shadow-xs'
          }`}
        >
          <div className="min-w-0 pr-2 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5 text-blue-500 flex-none" />
            <div className="min-w-0">
              <p className="font-semibold text-blue-500 text-[10px]">Mengedit pesan</p>
              <p className={`truncate text-[10px] ${isDay ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                {editingMessage.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer flex-none ${
              isDay
                ? 'bg-blue-100 text-slate-600 hover:text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quoted Reply Banner */}
      {replyTo && (
        <div
          className={`flex-none mx-2.5 mb-1 px-2.5 py-1.5 border-l-2 rounded-r-lg flex items-center justify-between text-xs animate-fade-in shadow-xs ${
            isDay
              ? 'bg-white/95 border-sky-500 text-slate-800 shadow-xs'
              : 'bg-slate-900/90 border-blue-500 text-slate-200 shadow-xs'
          }`}
        >
          <div className="min-w-0 pr-2">
            <p className="font-semibold text-sky-600 text-[10px]">Membalas {replyTo.name}</p>
            <p className={`truncate max-w-[210px] sm:max-w-md text-[10px] ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
              {replyTo.message}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer flex-none ${
              isDay
                ? 'bg-slate-100 text-slate-500 hover:text-slate-800'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Emoji Picker Tray (Appears above input) */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={(emoji) => {
            setInputText(prev => prev + emoji);
            broadcastTyping(currentUser, true);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Compact Bottom Input Bar */}
      <footer
        className={`flex-none p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t transition-colors duration-500 ${
          isDay
            ? 'bg-white/75 backdrop-blur-lg border-white/50 shadow-md'
            : 'bg-[#0a101d]/85 backdrop-blur-lg border-slate-800/80 shadow-md'
        }`}
      >
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
          <input
            ref={fileInputPhotoRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <input
            ref={fileInputMediaRef}
            type="file"
            accept="image/gif,video/mp4,video/webm,video/quicktime,video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />

          {/* Left Button Group: [+] Button with 2 Options Popover */}
          <div className="relative flex items-center flex-none">
            <button
              type="button"
              onClick={() => setShowAttachMenu(prev => !prev)}
              title="Lampirkan Foto atau GIF"
              aria-label="Lampirkan Media"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                showAttachMenu
                  ? 'rotate-45 bg-blue-600 text-white border-blue-500 shadow-sm'
                  : isDay
                  ? 'bg-white/90 hover:bg-white text-slate-700 border-sky-200/80 shadow-xs'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              <Plus className="w-4 h-4 transition-transform duration-200" />
            </button>

            {/* 2-Option Popover Menu (Foto 1X & GIF/Video) */}
            {showAttachMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAttachMenu(false)}
                />
                <div
                  className={`absolute bottom-11 left-0 z-50 flex items-center gap-1.5 p-1 rounded-2xl shadow-xl backdrop-blur-md border animate-pop-in ${
                    isDay
                      ? 'bg-white/95 border-sky-200/90 shadow-sky-500/15 text-slate-800'
                      : 'bg-[#0f172a]/95 border-slate-700 shadow-black/60 text-slate-100'
                  }`}
                >
                  {/* Option 1: Kirim Foto 1X */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputPhotoRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 active:scale-95 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <div className="relative flex items-center justify-center">
                      <Camera className="w-4 h-4 text-blue-500" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600 text-white font-bold text-[7px] flex items-center justify-center">
                        1
                      </span>
                    </div>
                    <span className="text-[11px]">Foto 1X</span>
                  </button>

                  <div className={`w-[1px] h-5 ${isDay ? 'bg-slate-200' : 'bg-slate-700'}`} />

                  {/* Option 2: Kirim GIF / Video (<20s) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputMediaRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 active:scale-95 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px]">GIF / Video</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dynamic Emoji Button: appears when typing */}
          {inputText.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              title="Pilih Emoji"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer flex-none ${
                showEmojiPicker
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 ring-2 ring-amber-400/20'
                  : isDay
                  ? 'bg-white/90 hover:bg-white text-amber-500 border-amber-200/80 shadow-xs'
                  : 'bg-slate-850 hover:bg-slate-800 text-amber-400 border-slate-750 shadow-xs'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onFocus={() => {
              setTimeout(() => scrollToBottom(true), 250);
            }}
            placeholder={editingMessage ? "Edit pesan Anda..." : "Ketik pesan..."}
            maxLength={500}
            autoComplete="off"
            className={`flex-1 rounded-full px-3.5 py-1.5 text-[15px] sm:text-xs outline-none transition-colors ${
              isDay
                ? 'bg-white/95 border border-sky-200/80 focus:border-sky-500 text-slate-800 placeholder-slate-400 shadow-xs'
                : 'bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label={editingMessage ? "Simpan Perubahan" : "Kirim"}
            title={editingMessage ? "Simpan Perubahan" : "Kirim"}
            className={`w-8 h-8 rounded-full ${
              editingMessage
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sm shadow-sky-500/25'
            } disabled:opacity-40 flex items-center justify-center transition-all active:scale-95 cursor-pointer flex-none shadow-sm`}
          >
            {editingMessage ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5 ml-0.5" />
            )}
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

      {/* Soe Exclusive: Starred Messages Modal */}
      {currentUser === 'Soe' && (
        <StarredMessagesModal
          isOpen={showStarredModal}
          onClose={() => setShowStarredModal(false)}
          starredMessages={Object.values(starredMessagesMap)}
          formatTime={formatTime}
          onJumpToMessage={handleJumpToMessage}
          onUnstar={handleUnstarById}
        />
      )}
    </div>
  );
};
