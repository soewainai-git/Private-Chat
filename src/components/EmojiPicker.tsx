import React, { useState } from 'react';
import { X, Heart, Smile, Sparkles, ThumbsUp } from 'lucide-react';

interface Props {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'love',
    name: 'Cinta',
    icon: Heart,
    emojis: [
      '❤️', '💕', '💖', '💗', '💓', '💞', '💘', '💌', 
      '🫶', '🫂', '🤍', '🖤', '🌹', '🌸', '💐', '✨',
      '💍', '💋', '🧸', '🎀', '🪄', '🍓', '🍒', '🥰'
    ],
  },
  {
    id: 'faces',
    name: 'Ekspresi',
    icon: Smile,
    emojis: [
      '🥰', '😘', '😚', '🥺', '😭', '🤣', '😂', '🥹', 
      '🤭', '😳', '🫠', '🙈', '😜', '😋', '😉', '😊',
      '😇', '😍', '🤩', '🤤', '🤤', '🤫', '🤔', '😴'
    ],
  },
  {
    id: 'daily',
    name: 'Santai',
    icon: Sparkles,
    emojis: [
      '☕', '🧋', '🍦', '🍕', '🍔', '🍟', '🍰', '🍫',
      '🐱', '🐶', '🐰', '🐼', '🌙', '⭐', '☀️', '☁️',
      '🛵', '🚗', '🎧', '🎮', '📱', '🎬', '🍿', '💤'
    ],
  },
  {
    id: 'gestures',
    name: 'Simbol',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '✌️', '🤞', '👏', '🙌', '🙏', '🤝',
      '🤙', '💅', '🤏', '🔥', '💯', '⚠️', '❌', '✅',
      '🎉', '🎈', '👀', '💡', '📌', '⚡', '🌈', '🌻'
    ],
  },
];

export const EmojiPicker: React.FC<Props> = ({ onSelectEmoji, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex-none mx-2 mb-1 bg-[#131926] border border-slate-800 rounded-2xl p-2 shadow-xl animate-fade-in z-20">
      {/* Category Tabs & Close Button */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2 px-1">
        <div className="flex items-center gap-1">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Emoji"
          className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto no-scrollbar p-1">
        {EMOJI_CATEGORIES[activeTab].emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 active:scale-120 flex items-center justify-center text-lg transition-transform cursor-pointer select-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
