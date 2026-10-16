import React from 'react';
import { Star, X, ArrowRight, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  starredMessages: ChatMessage[];
  formatTime: (iso: string) => string;
  onJumpToMessage: (msgId: string) => void;
  onUnstar: (msgId: string) => void;
}

export const StarredMessagesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  starredMessages,
  formatTime,
  onJumpToMessage,
  onUnstar,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">Pesan Berbintang</h3>
              <p className="text-[10px] text-slate-400">
                {starredMessages.length} pesan dibintangi oleh Soe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of Starred Messages */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 no-scrollbar">
          {starredMessages.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Star className="w-8 h-8 mx-auto mb-2 text-slate-600 stroke-[1.5]" />
              <p className="font-medium text-slate-400">Belum ada pesan yang dibintangi</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Tekan lama pada pesan mana saja lalu pilih "Bintangi Pesan"
              </p>
            </div>
          ) : (
            starredMessages.map((msg) => (
              <div
                key={msg.id}
                className="group p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
                onClick={() => onJumpToMessage(msg.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-sky-400">
                      {msg.name}
                    </span>
                    <span className="text-[8px] text-slate-500">
                      • {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 truncate">
                    {msg.viewonce_photo ? '📷 Foto Sekali Lihat' : msg.message}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnstar(msg.id);
                    }}
                    title="Hapus Bintang"
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="p-1.5 text-amber-400 hover:text-amber-300">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
